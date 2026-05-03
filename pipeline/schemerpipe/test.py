import os
from dotenv import load_dotenv
from jose import jwt # Import jwt from jose library
from pymongo.errors import BulkWriteError
from pymongo.operations import UpdateOne
from bson import ObjectId
from datetime import datetime, timezone
from huggingface_hub import InferenceClient
from Levenshtein import ratio
import pembot.query as pq
import json
import re
import time
from pymongo.collection import Collection as PyMongoCollection
from pymongo.errors import PyMongoError
from schemerpipe.myscheme_utils import SCHEMEDOC_CLASSES, ensure_global_settings, get_schemedoc_operations_for_scheme, query_llm
from schemerpipe.models import Collection
from schemerpipe.database import get_db, get_s3_client


load_dotenv() # Load environment variables

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

# Ensure JWT_SECRET is set
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable not set. Please set it securely.")

HF_TOKEN = os.getenv("HF_TOKEN")


def main():
    # Connect to the MongoDB server
    db= get_db()
    if db is None:
        return
    collection = db['references']

    arr1= collection.count_documents({"slugs": {"$size": 1}})
    arr2= collection.count_documents({"slugs": {"$size": 2}})
    arr3= collection.count_documents({"slugs": {"$size": 3}})
    arr4= collection.count_documents({"slugs": {"$size": 4}})
    arr5= collection.count_documents({"slugs": {"$size": 5}})
    arr6= collection.count_documents({"slugs": {"$size": 6}})
    arr7= collection.count_documents({"slugs": {"$size": 7}})
    arr8= collection.count_documents({"slugs": {"$size": 8}})
    arr9= collection.count_documents({})

    print(arr1)
    print(arr2)
    print(arr3)
    print(arr4)
    print(arr5)
    print(arr6)
    print(arr7)
    print(arr8)
    print(arr9)


def transform_ref_slugs_to_id_aggregate_and_bulk_write():
    db = get_db() # Your function to get the database connection
    if db is None:
        print("Database connection not established.")
        return

    refcoll = db[Collection.REFERENCES]
    pipeline_api_coll = db["pipeline_api_data"] # Get the collection explicitly if needed

    # Stage 1: Define the Aggregation Pipeline to get the transformed data
    # This pipeline will run on the 'references' collection and output documents
    # with the original '_id' and the new 'schemes' array.
    aggregation_pipeline = [
        # Perform the lookup: Join 'references' with 'pipeline_api_data'
        # It matches 'slugs' array elements in 'references' with 'slug' field in 'pipeline_api_data'
        {
            "$lookup": {
                "from": "pipeline_api_data",     # The collection to join with
                "localField": "slugs",           # The field from the input documents (from 'references')
                "foreignField": "slug",          # The field from the 'from' collection ('pipeline_api_data')
                "as": "matched_schemes_info"     # Output array field of matched documents
            }
        },
        # Create the 'schemes' array by extracting '_id' from the matched documents
        {
            "$project": {
                "_id": "$_id", # Keep the original _id of the reference document
                "schemes": {
                    "$map": {
                        "input": "$matched_schemes_info",
                        "as": "scheme_doc",
                        "in": "$$scheme_doc._id"
                    }
                }
                # Other fields from the original 'references' document are *not* included
                # unless explicitly projected here (e.g., "name": "$name")
            }
        }
        # We don't remove 'slugs' here, as that's part of the actual update operation below.
        # We also don't need to unset 'matched_schemes_info' here because it's not projected into the output documents.
    ]

    bulk_operations = []
    batch_size = 1000 # Define a batch size for efficient bulk_write operations

    print("Starting aggregation to prepare transformed data (this is the read phase)...")
    # Execute the aggregation pipeline to get the transformed data
    # This returns a cursor that we can iterate over
    transformed_data_cursor = refcoll.aggregate(aggregation_pipeline)

    print("Preparing bulk write operations (this is the write phase)...")
    try:
        for doc in transformed_data_cursor:
            # For each transformed document, create an UpdateOne operation
            # This operation will set the new 'schemes' field and unset the old 'slugs' field
            bulk_operations.append(
                UpdateOne(
                    {"_id": doc["_id"]}, # Filter: find the document by its original _id
                    {"$set": {"schemes": doc["schemes"]}, "$unset": {"slugs": ""}} # Update operation
                )
            )

            # Execute bulk write in batches to reduce memory usage and network overhead
            if len(bulk_operations) >= batch_size:
                refcoll.bulk_write(bulk_operations)
                print(f"\n ------  Executed a batch of {len(bulk_operations)} updates.----------\n")
                bulk_operations = [] # Reset the batch list

        # Execute any remaining operations in the last batch
        if bulk_operations:
            refcoll.bulk_write(bulk_operations)
            print(f"Executed final batch of {len(bulk_operations)} updates.")

        print("Transformation complete via aggregation and bulk write.")

    except BulkWriteError as bwe:
        print(f"An error occurred during bulk write: {bwe.details}")
        # bwe.details['writeErrors'] can give more specifics about individual failures
    except Exception as e:
        print(f"An unexpected error occurred: {e}")



def isReferenceActive(doc_id: ObjectId):
    pass
    return True


def update_factory(doc):
    doc_id: ObjectId= doc["_id"]
    # You can customize the update logic here based on the doc_id or other criteria
    print(f"Preparing update for ID: {doc_id}")
    tbs= {}

    if "createdAt" not in doc:
        tbs["createdAt"]= doc_id.generation_time

    if "lastModifiedAt" not in doc:
        tbs["lastModifiedAt"]= doc_id.generation_time

    if "lastModifiedBy" not in doc:
        tbs["lastModifiedBy"]= ObjectId("6880c6e49544029dfcbb0d96")

    if "createdBy" not in doc:
        tbs["createdBy"]= ObjectId("6880c6e49544029dfcbb0d96")

    if "status" not in doc:
        tbs["status"]=  1 if isReferenceActive(doc_id) else 0

    return {
        "$set": tbs
    }


def adding_fields_in_references():
    db= get_db()
    if db is not None:
        refcoll= db[Collection.REFERENCES]
        fields_to_check= ["lastModifiedBy", "lastModifiedAt",
            "status", "createdBy", "createdAt", "status"
        ]
        query = {
            "$or": [{field: {"$exists": False}} for field in fields_to_check]
        }
        docs= refcoll.find(query, {"_id": 1, "lastModifiedBy": 1, "lastModifiedAt": 1, "createdBy": 1, "createdAt": 1, "status": 1}).to_list()

        bulk_operations = []
        number_of_docs= len(docs)
        c= 0
        for doc in docs:
            # Call the factory function to get the update dictionary for each document
            print("appending operation for: ", c, " / ", number_of_docs)
            update_dict = update_factory(doc)
            if update_dict: # Ensure the factory returns a valid update
                bulk_operations.append(
                    UpdateOne(
                        filter= {"_id": doc["_id"]},
                        update= update_dict
                    )
                )
            c += 1
        refcoll.bulk_write(bulk_operations)

def adding_status_in_schemes_from_pipeline_api_data():
    # if the schemes' slugs arent in pipeline_api_data, label as inactive
    db= get_db()
    if db is not None:
        schemescoll= db[Collection.SCHEMES]
        pipecoll= db[Collection.PIPELINE_API_DATA]
        new_pipeline_data= pipecoll.find({}, {"_id": 1, "slug": 1})
        new_slugs= [x["slug"] for x in new_pipeline_data]
        old_schemes_filter= {'slug': {'$nin': new_slugs}}

        # updating the old ones, filtering by the ones which dont have the latest pipeline_api_data's _ids
        schemescoll.update_many(
            old_schemes_filter,
            {'$set': {'status': 0}}
        )


def sign_token(username: str) -> str:
    # returns a jwt token with that username claim, assuming i am using dotenv and i have JWT_SECRET variable
    if not JWT_SECRET:
        return "no key in env?"
    to_encode = {"username": username}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def push_global_setting(setting: dict):
    db= get_db()
    if db is not None:
        gsettings= db["globalSettings"]
        gsettings.insert_one({
            **setting,
            "status": 1,
            "createdBy": ObjectId("6880b8918d6ccea849d2857c"),
            "lastModifiedBy": ObjectId("6880b8918d6ccea849d2857c"),
            "createdOn": datetime.now(timezone.utc),
            "lastModifiedOn": datetime.now(timezone.utc),
        })


def remove_doc_from_map(collection: PyMongoCollection, doc_id_to_remove: str, skip_if_exists: bool) -> int:
    """
    Removes an object with a specific key from an array field in one or more documents.

    Args:
        collection (pymongo.collection.Collection): The PyMongo collection object.
        doc_id_to_remove (str): The ObjectId string to be removed from the array elements.
        skip_if_exists (bool): If True and the doc_id exists, the function skips deletion and returns 2.

    Returns:
        int: 
            0 if the operation was successful and a deletion was performed.
            1 if an error occurred.
            2 if skip_if_exists is True and the document was found, so no deletion was performed.
    """
    try:
        # Check if the document exists in any array element
        filter_query = {
            "scheme_document_name_map." + doc_id_to_remove: {"$exists": True}
        }
        
        # Check the count of documents that match the filter
        match_count = collection.count_documents(filter_query)

        if match_count > 0:
            if skip_if_exists:
                print(f"Skipping deletion for '{doc_id_to_remove}' as skip_if_exists is True.")
                return 2

            print("doc_id_to_remove is: ", doc_id_to_remove)
            
            # Define the aggregation pipeline for the update operation
            pipeline = [
                {
                    "$set": {
                        "scheme_document_name_map": {
                            "$filter": {
                                "input": "$scheme_document_name_map",
                                "as": "item",
                                "cond": {
                                    "$not": {
                                        "$in": [
                                            doc_id_to_remove,
                                            {
                                                "$map": {
                                                    "input": { "$objectToArray": "$$item" },
                                                    "as": "kv",
                                                    "in": "$$kv.k"
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            ]
            
            # Execute the update
            result = collection.update_many(filter_query, pipeline)
            print(f"Successfully deleted key '{doc_id_to_remove}'. Matched {result.matched_count}, modified {result.modified_count}.")
            return 0
        else:
            print(f"No documents found with key '{doc_id_to_remove}'. No deletion needed.")
            return 0

    except PyMongoError as e:
        print(f"An error occurred during the database operation: {e}")
        return 1
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return 1


def scheme_docs_classify(scheme_slug: str | None = None, skip_if_exists= False):
    """
    Enhanced function to process scheme documents with LLM
    removed the already classified and classifies again if skip_if_true is disabled
    """
    db = get_db()
    if db is None:
        return

    # Ensure basic_types exists in GLOBAL_SETTINGS
    basic_types = ensure_global_settings(db)

    bulk_operations_scheme_documents = []
    schemes_coll = db[Collection.SCHEMES]
    scheme_docs_collection = db[Collection.SCHEME_DOCUMENTS]
    if scheme_slug is None:
        schemes: list = schemes_coll.find({"status": 1}, {"documents_required": 1, "_id": 1}).to_list()
    else:
        schemes: list = [schemes_coll.find_one({'slug': scheme_slug})]

    if not schemes:
        raise Exception("cant find the schemes for which documents are to be classified")

    processed_schemes = 0
    for scheme in schemes:

        # when skip if exists is false, we refresh the classification
        res= remove_doc_from_map(scheme_docs_collection, doc_id_to_remove= str(scheme["_id"]), skip_if_exists= skip_if_exists)
        if res == 2:
            # its already classified
            print(f"already classified, and skip if exists is true, so skipping this scheme... [{str(scheme['_id'])}]")
            continue

        bulk_operations_scheme_documents= get_schemedoc_operations_for_scheme(scheme, basic_types, model_name= "gemini-2.5-flash")
        if bulk_operations_scheme_documents is None:
            processed_schemes += 1
            print("skipping")
            print(f"Processed scheme {processed_schemes}/{len(schemes)}")
            continue

        processed_schemes += 1
        print(f"Processed scheme {processed_schemes}/{len(schemes)}")

        # Process in batches to avoid memory issues
        if len(bulk_operations_scheme_documents) >= 100:
            if bulk_operations_scheme_documents:
                scheme_docs_collection.bulk_write(bulk_operations_scheme_documents)
                bulk_operations_scheme_documents = []
            print("Processed batch, continuing...")

    # Process remaining operations
    if bulk_operations_scheme_documents:
        scheme_docs_collection.bulk_write(bulk_operations_scheme_documents)

    print(f"Successfully processed {processed_schemes} schemes")

def delete_images_with_prefix(prefix):
    # List objects with the specified prefix

    s3_client, bucket, S3_REGION = get_s3_client()
    response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)

    # Check if the response contains any objects
    if 'Contents' in response:
        for obj in response['Contents']:
            print("delete file ", obj['Key'], ".png rn ", sep= '')
            # Delete the object
            s3_client.delete_object(Bucket=bucket, Key=obj['Key'])
            print(f"Deleted: {obj['Key']}")
    else:
        print("No objects found with the specified prefix.")


def get_offline_count():
    db= get_db()
    if db is None:
        print("no db")
        return
    total_active= db[Collection.SCHEMES].count_documents({
        'status': 1
    })
    offline_count= db[Collection.SCHEMES].count_documents({
        'applicationProcess': {
            '$elemMatch': { 'mode': "Offline" }
        },
        'status': 1
    })
    print("Offline: ", offline_count, " / ", total_active)



def show_application_process_llm_ingestible():

    db= get_db()
    if db is None:
        print("no db")
        return

    ### TEMPORARY LIMIT
    lim= 5

    schemes= db[Collection.SCHEMES].find({}, {'applicationProcess': 1, '_id': 1}).limit(lim).to_list()
    refs= db[Collection.REFERENCES]
    len_schemes= len(schemes)
    for i, scheme in enumerate(schemes):
        print(f"Processing {i + 1}/{len_schemes}")

        scheme_data= str(scheme['applicationProcess'])

        # get references for the scheme, truncate individually
        refslist= refs.find({'schemes': {'$in': [scheme['_id']]}}).to_list()

        # get text data for the scheme
        for j, ref in enumerate(refslist):
            if 'content' in ref:
                scheme_data+= f"\n\n\n<REFERENCE {j}>:\n" + ref['content'][:400] + f"\n\n </REFERENCE {j}>"

        # send query for whether the process in online / offline
        print("scheme data is: \n", scheme_data)

def search_scheme(querystring: str):

    db= get_db()
    if db is None:
        exit()
    collection = db[Collection.SCHEMES]

    pipeline = [
        {
            "$search": {
                "index": "full_scheme_search_atlas",
                "text": {
                    "query": querystring,
                    "path": "documentsRequired_md"
                }
            }
        }
    ]

    results = collection.aggregate(pipeline).to_list()
    return results


def new_scheme_doc_class(new_class_number: int):
    # only run this after adding the new desired type in the SCHEMEDOC_CLASSES in the myscheme_utils
    # extract the class text, compare it with schemes inside 'Others' list
    # remove from others and put inside its own class document
    new_schemedoc_type= SCHEMEDOC_CLASSES[str(new_class_number)]

    db= get_db()
    if db is None:
        print("no db")
        return
    schemedocs= db[Collection.SCHEME_DOCUMENTS]
    others_classname= SCHEMEDOC_CLASSES[str(len(SCHEMEDOC_CLASSES))]
    others_scheme_ids= schemedocs.find_one({'document_type_name': others_classname },
                                                                {'_id': 1, 'scheme_document_name_map': 1})
    if others_scheme_ids is None:
        print("no Others doc in scheme documents collection")
        return

    others_scheme_ids= others_scheme_ids['scheme_document_name_map']

    exclude_list= []

    exclude_list= query_llm("Please tell which ids in the given array are talking about the document in the matcher sentence:\n" +
                 "Array: " + str(others_scheme_ids) + "\n" +
                 "Matcher: " + new_schemedoc_type + "\n" +
                "Respond with just the JSON {'matching_ids': ['abc123', 'abc124', 'abc234']}.\n" +
                 "Answer JSON: ", "gemini-2.5-flash")
    exclude_list= pq.remove_bs(exclude_list)
    try:
        exclude_list= json.loads(exclude_list)
    except:
        print("bad json")
        return

    exclude_list= exclude_list['matching_ids']


    new_class_schemes_map= []
    new_others= []
    for scheme_document_name_map in others_scheme_ids:
        if list(scheme_document_name_map.keys())[0] in exclude_list:
            new_class_schemes_map.append(scheme_document_name_map)
        else:
            new_others.append(scheme_document_name_map)


    schemedocs.update_one({'document_type_name': others_classname,}, 
                          {'$set': {'scheme_document_name_map': new_others,
                                    'document_code': len(SCHEMEDOC_CLASSES),
                                    'lastModifiedOn': datetime.now(),
                                    "lastModifiedBy": ObjectId("6880b8918d6ccea849d2857c"),
                                    }})
    schemedocs.insert_one({
        'document_code': new_class_number,
        'document_type_name': new_schemedoc_type,
        'scheme_document_name_map': new_class_schemes_map,
        'createdOn': datetime.now(),
        'lastModifiedOn': datetime.now(),
        "status": 1,
        "createdBy": ObjectId("6880b8918d6ccea849d2857c"),
        "lastModifiedBy": ObjectId("6880b8918d6ccea849d2857c"),
    })


def remove_bs_square(text):
    """
    Removes everything between <think></think> tags and any text outside of JSON curly brackets.

    Args:
        text (str): The input string.

    Returns:
        str: The string with text between <think></think> tags removed and only the
             content within the outermost JSON curly brackets.
             Returns an empty string if no valid JSON is found.
    """
    # 1. Remove <think></think> tags
    think_pattern = r'<think>.*?</think>'
    text_without_think = re.sub(think_pattern, '', text, flags=re.DOTALL)

    # 2. Extract JSON content
    # This regex looks for the first opening sqaure bracket and the last closing square bracket.
    # It assumes the JSON structure is well-formed within the string.
    json_match = re.search(r'\[(.*)\]', text_without_think, re.DOTALL)

    if json_match:
        json_content_str = "[" + json_match.group(1) + "]"
        return json_content_str
    else:
        return ""


def get_eligibility_gender_batched(scheme_eligibility_texts: list[dict[str, str]], retry_stack= 0) -> list[dict[str, str | int]]:
    """
    plan is to batch 500 schemes for updateOnes() and for each batch
    batch ~10 schemes' prompts together and just filter out the the [{id, eligibility_gender}]
    and then concatenate them for the given batch
    """
    code_str= query_llm("""
    Context:
    Here are a list of some descriptions about aligibility of a certain government schemes in India:
    ARRAY of {{_id, eligibility_gender}} dicts : 
    {0}

    Question:
    Is there a gender criteria mentioned in it? Return a JSON Array like 
    [{{'_id': "the id of the document which has gender criteria", 'gender': 'the gender eligible'}}] 
    where the gender key can have the values
    'Male' for male, 'Female' for female, 'Transgender' for transgender. 

    DON'T enlist the the scheme ids
    which dont mention any gender based eligibility criteria
    Answer should just have the JSON.

    JSON:
    """.format(scheme_eligibility_texts), "gemini-2.5-flash")

    if code_str is None:
        raise Exception("llm returned None during getting gender eligibility")

    code_str= remove_bs_square(code_str)
    try:
        code: list[dict]= json.loads(code_str)
    except json.JSONDecodeError as je:
        if retry_stack < 3:
            return get_eligibility_gender_batched(scheme_eligibility_texts, retry_stack + 1)
        else:
            raise Exception("retried a lot but didnt get much: " + str(je))
    except Exception as e:
        raise Exception("unexpected in llm output parsing: " + str(e))



    print("code received: ", code)

    setting= {
        1: 'Male',
        2: 'Female',
        3: 'Transgender',
        4: 'All', # all makes sense when we are talking about which genders fit a certain criterion
    }
    setting_inverted= {value: key for key, value in setting.items()}
    print("setting inverted: ", setting)

    res= []
    for scheme in code:
        res.append({"_id": str(scheme["_id"]), 
        "gender": setting_inverted.get(scheme['gender'])})

    print("prompt batch res: ", res)

    return res

def temporarily_add_gender():
    db= get_db()
    if db is None:
        print("no db")
        return
    schemes_coll= db[Collection.SCHEMES]

    # Set the batch size
    batch_size = 300
    mini_batch_size= 5

    # Process documents in batches
    all_documents_cursor = schemes_coll.find({}, {"_id": 1, "eligibilityCriteria": 1})

    batch_updates = []
    mini_batch = []
    count = 0
    doc_count= 1
    last_saved= 1
    checking_batch= 0

    for doc in all_documents_cursor:
        # Apply the transformation function

        print("scheme number and last saved: ", doc_count, last_saved)
        considered_flag= False

        if "eligibilityCriteria" in doc and "eligibilityDescription_md" in doc["eligibilityCriteria"] and doc_count > 2100:
            considered_flag= True

            # take mini_batch (~ 10) at a time
            mini_batch.append({"_id": str(doc["_id"]), "eligibility_description": doc['eligibilityCriteria']['eligibilityDescription_md']})


            if len(mini_batch) == mini_batch_size:
                new_field_values = get_eligibility_gender_batched(
                    mini_batch
                )
                # Create an UpdateOne operation for the document
                update_op = [
                    UpdateOne(
                        {"_id": ObjectId(update_doc["_id"])},
                        {"$set": {"eligibilityGender": update_doc["gender"]}}
                    ) for update_doc in new_field_values
                ]
                batch_updates.extend(update_op)
                mini_batch= []
                count += 1

        # Execute bulk update when the batch size is reached
        if checking_batch == batch_size:
            print(f"\n\n------ Executing bulk write for {len(batch_updates)} documents... ---------")
            schemes_coll.bulk_write(batch_updates)
            batch_updates = [] # Reset the batch
            checking_batch= 0
            last_saved= doc_count

            # post batch process sleep
            print("thak gaya sher")
            time.sleep(8)
            print("uth gaya sher")

        doc_count += 1
        if considered_flag:
            checking_batch += 1

    # Execute any remaining updates in the last batch
    if batch_updates:
        print(f"Executing final bulk write for {len(batch_updates)} documents...")
        schemes_coll.bulk_write(batch_updates)





if __name__== "__main__":
    # main()
    # transform_ref_slugs_to_id_aggregate_and_bulk_write()
    # adding_fields_in_references()
    # adding_status_in_schemes_from_pipeline_api_data()
    # delete_images_with_prefix("scheme-images/")
    # lk_code= 'PIPELINE_STEPS_CODE'
    # lk_description= "The Step Code used in Pipeline's FastAPI Server"
    # setting= {
    #         1: 'GET_SCHEMES_LIST',
    #         2: 'DOWNLOAD_SCHEMES',
    #         3: 'UPLOAD_REFERENCES_TO_S3',
    #         4: 'PROCESS_REFERENCES_CONTENT_INTO_DB',
    #         5: 'UPLOAD_SCHEMES_TO_DB',
    #         6: 'UPDATE_IMAGE_URLS'
    # }
    # lk_code= "PIPELINE_REQUESTS_STATUS"
    # lk_description= "The status field used in pipeline_requests collection"
    # setting= {
    #     0: 'SUCCESS_WITHOUT_ERRORS',
    #     1: 'FAILED',
    #     2: 'IN_PROGRESS',
    # }

    # lk_code= "GENDER"
    # lk_description= "Gender code used in various parts of the database"
    # setting= {
    #     1: 'Male',
    #     2: 'Female',
    #     3: 'Transgender',
    #     4: 'All', # all makes sense when we are talking about which genders fit a certain criterion
    # }
    #
    # # 
    # #
    # c= 1
    # for k, v in setting.items():
    #     push_global_setting({
    #         "lkCode": lk_code,
    #         "description": lk_description,
    #         "keyCode": c,
    #         "key1": k,
    #         "key2": v
    #     })
    #     c+= 1

    # new_scheme_doc_class(26)

    # get_offline_count()


    # search_term = "report"
    #
    # # Perform the full-text search using the $text operator
    # results = collection.find({
    #     "$text": {
    #         "$search": search_term
    #     }
    # }).to_list()
    #
    # print(len(results))
    # inp= str(results)
    # inp= search_scheme("project report")
    # with open("tobesearched.pckl", "wb") as f:
    #     pickle.dump(inp, f)

    # temporarily_add_gender()

    # db= get_db()
    # if db is None:
    #     print("no db")
    #     exit()
    # schemes_coll= db[Collection.SCHEMES]
    #
    # # Process documents in batches
    # all_documents_cursor = schemes_coll.find({}, {"_id": 1, "eligibilityCriteria": 1})
    # for doc in 

    scheme_docs_classify('ams', skip_if_exists= False)

    # client = InferenceClient(
    #     provider="auto",
    #     api_key=os.getenv("HF_TOKEN", ""),
    # )
    #
    # completion = client.chat.completions.create(
    #     model="Qwen/Qwen3-Next-80B-A3B-Instruct",
    #     messages=[
    #         {
    #             "role": "user",
    #             "content": "Generate 10 college level differential equation questions, give options, correct_option, and explanation for each. give the final answer in a JSON array format."
    #         }
    #     ],
    # )
    #
    # print(completion.choices[0].message)








"""
For unique tags:
    db.schemes.aggregate([
      {
        $unwind: "$tags"
      },
      {
        $group: {
          _id: null, // Group all documents together
          uniqueTags: { $addToSet: "$tags" } // Add each unique tag string to a set
        }
      },
      {
        $project: {
          _id: 0, // Exclude the _id field
          uniqueTags: 1 // Include only the uniqueTags array
        }
      }
    ])


For unique scheme categories
[
  {
    $unwind: "$schemeCategory"
  },
  {
    $group: {
      _id: null, // Group all documents together
      uniqueLabels: { $addToSet: "$schemeCategory.label" } // Add each unique label to a set
    }
  },
  {
    $project: {
      _id: 0, // Exclude the _id field
      uniqueLabels: 1 // Include only the uniqueLabels array
    }
  }
]

"""
