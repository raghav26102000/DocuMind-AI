import requests
import pickle
import os

from pymongo import ReturnDocument, UpdateOne
from huggingface_hub import InferenceClient
import json
import ollama
from pathlib import Path
from dotenv import load_dotenv
from schemerpipe.myscheme_utils import get_eligibility_gender, serialize_doc, upload_references_content, upload_scheme_references, update_scheme_image_urls, get_schemedoc_operations_for_scheme, ensure_global_settings
from schemerpipe.models import Collection, GovernmentScheme, ApiData
from datetime import datetime, timezone
import pembot.TextEmbedder.mongodb_embedder as pembed
from schemerpipe.scheme_downloader import scheme_download, get_intermediate_api_data
from schemerpipe.database import get_db, get_s3_client
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from bson import ObjectId

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

# Ensure JWT_SECRET is set
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable not set. Please set it securely.")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(
    root_path= "/api/pipeline"
)
templates = Jinja2Templates(directory="templates")


load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

llm_client = ollama.Client()
inference_client = InferenceClient(
    provider= "hf-inference",
    # provider= "nebius",
    # provider= "auto",
    api_key=HF_TOKEN
)
chunk_size= 2_20_000
embedding_model=  "intfloat/multilingual-e5-large"


server_exception= lambda msg: HTTPException(detail= msg, status_code= status.HTTP_500_INTERNAL_SERVER_ERROR)

async def get_current_user_id(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        if not JWT_SECRET:
            raise server_exception("Server Error Happened while trying to authorize")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        print("jwt decoded: ")
        print(payload)
        username: str | None = payload.get("username")
        if username is None:
            raise credentials_exception
        elif username != 'cron_kumar':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
    except JWTError:
        raise credentials_exception

    try:
        db = get_db()
        if db is None:
            raise server_exception("Database initialization failed while trying to authorize")
        users_collection = db.get_collection(Collection.USERS)
        user_doc = users_collection.find_one({"username": username})

        if user_doc is None:
            raise credentials_exception

        # MongoDB _id can be ObjectId, convert to string
        return str(user_doc["_id"])
    except Exception as e:
        print(f"Error fetching user from DB: {e}")
        raise server_exception("Database error during user validation.")



def upload_schemes(user_id: str, request_id: str) -> tuple[str, int, str]:
    """
    Loads ApiData objects from the requests database document identified by request_id,
    converts them to GovernmentScheme Pydantic models, and uploads them to a MongoDB database.
    Updates the request document step and status accordingly.
    """
    print("Starting scheme upload process...")

    db = get_db()
    if db is None:
        msg= "Database connection failed in upload_schemes."
        print(msg)
        return request_id, 1, msg

    pipecoll = db[Collection.PIPELINE_REQUESTS]
    try:
        # Mark step 1 completion and step=3 start as in progress
        current_request = pipecoll.find_one_and_update(
            filter={"_id": ObjectId(request_id)},
            update={"$set": {
                "step": 5,
                "status": 2,  # In progress
                "lastModifiedOn": datetime.now(timezone.utc),
                "lastModifiedBy": ObjectId(user_id),
            }},
            return_document=ReturnDocument.AFTER
        )
        if not current_request:
            raise Exception(f"Request with ID {request_id} not found or update failed.")

        api_data_list: list[ApiData] = get_intermediate_api_data(db, request_id)
        if not api_data_list:
            raise Exception("No API data found for processing in step 3.")
        print(f"Loaded {len(api_data_list)} ApiData objects from database for request {request_id}")

        schemes_to_upload_dicts = []

        api_data_length= len(api_data_list)
        for i, api_data in enumerate(api_data_list):
            print(f"at scheme {i + 1} / {api_data_length}")
            try:
                dummy_api_response_dict = {
                    "status": "success",
                    "statusCode": 200,
                    "errorDescription": "",
                    "error": "",
                    "data": api_data.model_dump(by_alias=True)
                }

                # Create GovernmentScheme instance using the from_api_response class method
                scheme = GovernmentScheme.from_api_response(dummy_api_response_dict)
                schemedict= scheme.model_dump(by_alias=True)
                finalschemedict= {**schemedict, **{
                        "lastModifiedOn": datetime.now(timezone.utc),
                        "lastModifiedBy": ObjectId(user_id),
                        "status": 1,
                        "_id": ObjectId(schemedict["_id"])
                    }
                }
                print("final id: ", finalschemedict["_id"], finalschemedict["slug"])
                schemes_to_upload_dicts.append(finalschemedict)
            except Exception as e:
                scheme_name = (
                    api_data.en.basicDetails.schemeName
                    if api_data.en and api_data.en.basicDetails and api_data.en.basicDetails.schemeName
                    else "Unnamed Scheme"
                )
                print(f"Skipping scheme '{scheme_name}' (slug: {api_data.slug}) at index {i} due to Pydantic validation or processing error: {e}")
                continue

        if len(schemes_to_upload_dicts) == 0:
            msg= "No schemes were prepared for upload. Exiting."
            print(msg)
            return request_id, 1, msg


        collection = db.get_collection(Collection.SCHEMES)
        scheme_docs_collection = db.get_collection(Collection.SCHEME_DOCUMENTS)

        print(f"Attempting to insert {len(schemes_to_upload_dicts)} schemes into MongoDB collection '{collection.name}'...")

        # mark the old ones as inactive

        new_slugs= [x["slug"] for x in schemes_to_upload_dicts]
        old_schemes_filter= {'slug': {'$nin': new_slugs}}

        # updating the old ones, filtering by the ones which dont have the latest pipeline_api_data's _ids
        result = collection.update_many(
            old_schemes_filter,
            {'$set': {'status': 0}}
        )

        basic_types = ensure_global_settings(db)
        bulk_operations = []
        bulk_operations_scheme_documents= []
        for scheme_data in schemes_to_upload_dicts:
            set_on_insert= {
                "createdOn": datetime.now(timezone.utc),
                "createdBy": ObjectId(user_id),
            }
            if "eligibilityCriteria" in scheme_data and "eligibilityDescription_md" in scheme_data["eligibilityCriteria"]:
                # if the key really does exist and then pass it to a function to 
                # get "F" "M" or "T" (use global settings to set code)
                set_on_insert["eligibilityGender"]= get_eligibility_gender(
                    scheme_data['eligibilityCriteria']['eligibilityDescription_md']
                )

            bulk_operations.append(
                UpdateOne(
                    {'_id': scheme_data['_id']},
                    {
                        '$set': scheme_data,
                        '$setOnInsert': set_on_insert
                    },
                    upsert=True
                )
            )

            # to push the scheme documents mentioned in scheme data into the SCHEME_DOCUMENTS collection
            # to show in frontend later
            ops= get_schemedoc_operations_for_scheme(scheme_data, basic_types)
            if ops is not None:
                bulk_operations_scheme_documents.extend(ops)


        # Execute bulk operation
        collection.bulk_write(bulk_operations)
        scheme_docs_collection.bulk_write(bulk_operations_scheme_documents)

        print(f"Successfully upserted {len(schemes_to_upload_dicts)} documents into MongoDB.")

        pipecoll.update_one(
            {"_id": current_request["_id"]},
            {"$set": {
                "status": 0,
                "error_message": "",
                "lastModifiedOn": datetime.now(timezone.utc),
                "lastModifiedBy": ObjectId(user_id)
            }}
        )

        return request_id, 0, ""

    except Exception as e:
        print(f"Error uploading schemes for request {request_id}: {e}")
        pipecoll.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "status": 1,
                "lastModifiedOn": datetime.now(timezone.utc),
                "lastModifiedBy": ObjectId(user_id),
                "error_message": str(e)
            }}
        )
        return request_id, 1, str(e)


def chunk_schemes():

    try:
        db= get_db()
        if db is None:
            raise Exception("couldnt initialize db")
        collection= db[Collection.SCHEMES]
        schemes= collection.find({}).to_list()
        for scheme in schemes:
            scheme_id= str(scheme['_id'])
            scheme['_id']= scheme_id
            scheme= serialize_doc(scheme)
            jsonstr= json.dumps(scheme)
            print("jsonstr: ", jsonstr[:50] + "  ... ")
            pembed.process_document_and_embed(
                db, llm_client, inference_client, Path(), chunk_size,
                embedding_model= embedding_model,
                embeddings_collection_name= "scheme_chunks",
                use_custom_id= scheme_id, use_custom_input= jsonstr
            )

    except Exception as e:
        print(f"Error chunking schemes to MongoDB: {e}")
        print("Please ensure your MongoDB instance is running and accessible, and MONGO_URI is correct.")



def enqueue_all_slugs(user_id: str, some: int | None= None) -> tuple[str, int, str]:
    """
    Sends a request to find out all the schemes which are available in all schemes endpoint
    and then, stores all the ids (slugs) into requests collection slugs_queue array, to be used as a download queue later, in scheme_downloader
    """


    db= get_db()
    if db is None:
        msg= "no db innit?"
        print(msg)
        return "", 1, msg
    pipecoll= db[Collection.PIPELINE_REQUESTS]

    insert_result= pipecoll.insert_one({
        "status": 2,
        "step": 1,
        "createdOn": datetime.now(timezone.utc),
        "createdBy": ObjectId(user_id),
    })

    try:
        print("Fetching scheme slugs for download queue...")
        url_all_files= "https://api.myscheme.gov.in/schemes/v5/public/schemes"
        res= requests.get(url_all_files, headers= {'Accept': 'application/json, text/plain, */*', 'x-api-key': os.getenv('SCHEMER_API_KEY'), 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0', 'Origin': 'https://www.myscheme.gov.in', 'Host': 'api.myscheme.gov.in'})
        res.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        allfiles_resj= res.json()

        data= allfiles_resj['data']
        slugs= list(map(lambda d: d['slug'], data))
        if some and some > 0 and some < len(slugs):
            slugs= slugs[:some]
        print(f"Found {len(slugs)} slugs. Saving to slugs_queue in requests.")
        pipecoll.update_one(
            {"_id": insert_result.inserted_id},
            {"$set": {
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": ObjectId(user_id),
            "status": 0,
            "error_message": "",
            "slugs_queue": slugs
            }}
        )
        tbr_request_id= str(insert_result.inserted_id)
        print("returning to persist in state: ", tbr_request_id)
        return tbr_request_id, 0, ""
    except Exception as e:
        pipecoll.update_one(
            {"_id": insert_result.inserted_id},
            {"$set": {
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": ObjectId(user_id),
            "status": 1,
            "error_message": str(e)
            }}
        )
        return "", 1, str(e)



def is_one_of_the_unreferenced_ones(scheme_id: str, unreferenced_schemes: list):
    for unref_scheme in unreferenced_schemes:
        if unref_scheme['_id'] == scheme_id:
            # print(f"Got the scheme {slug} in api data list which is one of the unreferenced ones, not queuing..")
            return True
    return False


def should_it_be_queued(scheme_id: str, processing_queue: dict[str, list], unreferenced_schemes: list):
    if scheme_id in processing_queue and isinstance(processing_queue[scheme_id], list) and len(processing_queue[scheme_id]) > 0:
        # no need, its done
        # print("wow thats a nice slug")
        return False
    elif scheme_id in processing_queue and isinstance(processing_queue[scheme_id], list) and is_one_of_the_unreferenced_ones(scheme_id, unreferenced_schemes):
        # empty list, but no references, so should be empty anyway case
        return False

    return True


def upload_references(user_id: str, request_id: str) -> tuple[str, int, str]:
    """
    Loads ApiData objects from pipeline_api_data
    transforms them to GovernmentScheme
    Pydantic models, and uploads references of each scheme to s3
    """
    db = get_db()
    if db is None:
        msg= "Database connection failed in upload_references."
        print(msg)
        return request_id, 1, msg
    pipecoll = db[Collection.PIPELINE_REQUESTS]

    try:
        current_request = pipecoll.find_one_and_update(
            filter={"_id": ObjectId(request_id)},
            update={"$set": {
                "step": 3,
                "status": 2, # In progress
                "lastModifiedOn": datetime.now(timezone.utc),
                "lastModifiedBy": ObjectId(user_id),
            }},
            return_document=ReturnDocument.AFTER
        )

        if not current_request:
            raise Exception(f"Request with ID {request_id} not found or update failed.")

        # Load api_data_list from the database
        api_data_list: list[ApiData] = get_intermediate_api_data(db, request_id)
        if not api_data_list:
            raise Exception("No API data found for processing in step 3.")
        print(f"Loaded {len(api_data_list)} ApiData objects from database for request {request_id}")

        # Load processing_queue from the database
        processing_queue = pickle.loads(current_request.get("processing_queue", pickle.dumps({})))
        empty_queue_flag = len(processing_queue) == 0
        print(f"Loaded {len(processing_queue)} items into processing_queue from database.")

        unreferenced_schemes = []
        schemes_coll = db[Collection.SCHEMES] # Use a separate collection object for schemes
        unreferenced_schemes = schemes_coll.find({"schemeContent.references": {"$eq": []}}).to_list()

        print("unreferenced_schemes: ", len(unreferenced_schemes))

        if not empty_queue_flag:
            # only upload the ones which havent been uploaded already
            api_data_list = [scheme for scheme in api_data_list if should_it_be_queued(scheme.id, processing_queue, unreferenced_schemes)]

        tbd_length = len(api_data_list)
        print("length after removing unnecessary ones: ", tbd_length)

        scheme_refs_to_be_parsed = processing_queue # Continue processing from existing queue

        s3_client, s3_bucket_name, s3_region = get_s3_client()

        for i, api_data in enumerate(api_data_list):
            scheme_refs_to_be_parsed[api_data.id] = upload_scheme_references(api_data, s3_bucket_name, s3_client=s3_client)
            print("processed: ", i + 1, '/', tbd_length)

            # Update processing_queue in the database after each item
            pipecoll.update_one(
                {"_id": current_request["_id"]}, # Use _id from current_request
                {"$set": {
                    "processing_queue": pickle.dumps(scheme_refs_to_be_parsed),
                    "lastModifiedOn": datetime.now(timezone.utc),
                    "lastModifiedBy": ObjectId(user_id),
                }}
            )

        # Final update on successful completion
        pipecoll.update_one(
            {"_id": current_request["_id"]},
            {"$set": {
                "step": 4, # Move to next step (step 4 for references)
                "status": 0, # Success
                "error_message": "",
                "lastModifiedOn": datetime.now(timezone.utc),
                "lastModifiedBy": ObjectId(user_id),
                "processing_queue": pickle.dumps(scheme_refs_to_be_parsed), # Ensure final state is saved
            }}
        )
        return request_id, 0, ""

    except Exception as e:
        print(f"Error in upload_references for request {request_id}: {e}")
        pipecoll.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "step": 3, # Remain on step 3 if error occurs
                "status": 1, # Failed
                "lastModifiedOn": datetime.now(timezone.utc),
                "lastModifiedBy": ObjectId(user_id),
                "error_message": str(e)
            }}
        )
        return request_id, 1, str(e)


def delete_file_if_exists(filename):
    """
    Deletes a file in the current working directory if it exists.
    Ignores the operation if the file does not exist.

    Args:
        filename (str): The name of the file to be deleted.
    """
    if os.path.exists(filename):
        try:
            os.remove(filename)
            print(f"File '{filename}' deleted successfully.")
        except OSError as e:
            print(f"Error deleting file '{filename}': {e}")
    else:
        print(f"File '{filename}' does not exist, skipping deletion.")




PIPELINE_HINT= """
give space separated command line arguments to specify the steps to be taken, in order
to execute all, give no args

idea is to push all steps to the stack, make a list, and execute some (or all) based on the args

STEP 1 -> get all schemes
STEP 2 -> download schemes to pipeline_api_data: scheme_downloader
STEP 3 -> read from exisinting_api_data and upload to s3, makes the processing_queue
STEP 4 -> read from processing_queue, and s3 and upload content to mongodb.references : myscheme_utils.upload_references_content
STEP 5 -> uploading all the schemes to mongodb
STEP 6 -> update the image urls in the uploaded schemes
"""
# This part of the code puts scheme slugs into a download queue.
# The actual downloading of detailed scheme content (ApiData)
# is performed by scheme_downloader.py, which then populates pipeline_api_data
# enqueue_all_slugs(some= 100)
# STEP 1 -> get all schemes
def step_1(user_id: str, request_id: str):
    print(f"User {user_id} executing step 1: Enqueueing all slugs.")
    return enqueue_all_slugs(user_id)

# STEP 2 -> download schemes to pipeline_api_data scheme_downloader
def step_2(user_id: str, request_id: str):
    print(f"User {user_id} executing step 2: Downloading schemes.")
    return scheme_download(user_id, request_id)

# STEP 3 -> read from pipeline_api_data and upload to s3, makes the processing_queue
def step_3(user_id: str, request_id: str):
    print(f"User {user_id} executing step 3: Uploading references to S3 and making processing queue.")
    return upload_references(user_id, request_id)

# STEP 4 -> read from processing_queue, and s3 and upload content to mongodb.references : myscheme_utils.upload_references_content
def step_4(user_id: str, request_id: str):
    print(f"User {user_id} executing step 4: Uploading references content to MongoDB.")
    return upload_references_content(user_id, request_id)

# STEP 5 -> get the pipeline_api_data, parse it all to GovernmentScheme format and upload to MongoDB
def step_5(user_id: str, request_id: str):
    print(f"User {user_id} executing step 5: Uploading schemes to MongoDB.")
    return upload_schemes(user_id, request_id)

def step_6(user_id: str, request_id: str):
    print(f"User {user_id} executing step 6: Updating Images in schemes")
    return update_scheme_image_urls(user_id, request_id)

# COMMENTED BECAUSE NOT NEEDED NOW, USING AGENT + TOOLS FOR SEARCHING
# STEP 6 -> chunk the schemes in mongodb into a new collection for RAGging
# def step_6(user_id: str, request_id: str):
#     print(f"User {user_id} executing step 6: Chunking schemes for RAG.")
#     return chunk_schemes()

# This list maps step numbers (1-indexed) to their corresponding functions.
process = [step_1, step_2, step_3, step_4, step_5, step_6] #, step_7]

PIPELINE_TAG= "Pipeline Process Response, contains the real data in the 'data' field; status 0 means success; 1 means failure;"


@app.get("/")
async def run_pipeline_step(step: int | None = None, request_id: str | None= None, current_user_id: str = Depends(get_current_user_id)):
    """
    Executes a specific pipeline step based on the 'step' query parameter.
    Requires a valid JWT in the Authorization header.
    The user ID from the JWT will be passed to the executed step function.
    """

    if step is None:
        return JSONResponse(
            content= {
                "status": 1,
                "message": f"Please provide a step field. Must be between 1 and {len(process)}. More information in data.",
                "data": {"message": PIPELINE_HINT},
                "tag": PIPELINE_TAG,
            },
            status_code=status.HTTP_400_BAD_REQUEST,
        )


    if not (1 <= step <= len(process)):
        return JSONResponse(
            content= {
                "status": 1,
                "message": f"Invalid step number. Must be between 1 and {len(process)}.",
                "data": {},
                "tag": PIPELINE_TAG,
            },
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        print(f"Executing step {step} for user ID: {current_user_id}")
        # Call the corresponding step function with the user_id
        print("request id from query params: ", request_id)
        if not request_id and step > 1:
            print("no request_id was received in query params.")
            return JSONResponse(
                content= {
                    "status": 1,
                    "message": "no request id was received",
                    "data": {},
                    "tag": PIPELINE_TAG,
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        res= process[step - 1](current_user_id, request_id if request_id else "")
        request_status= 2
        msg= ""
        if res:
            request_id, request_status, msg = res

        if request_status == 0:
            return JSONResponse(
                content= {
                    "status": 0,
                    "message": "Success",
                    "data": {"message": f"Step {step} executed successfully by user {current_user_id}.", "request_id": request_id},
                    "tag": PIPELINE_TAG,
                },
                status_code= status.HTTP_201_CREATED
            )
        elif request_status== 2:
            return JSONResponse(
                content= {
                    "status": 2,
                    "message": "Partial Success",
                    "data": {"message": f"Step {step} executed with partial success by user {current_user_id}.", "request_id": request_id},
                    "tag": PIPELINE_TAG,
                },
                status_code= status.HTTP_207_MULTI_STATUS
            )
        else:
            return JSONResponse(
                content= {
                    "status": 1,
                    "message": "Failure",
                    "data": {"message": f"Error executing step {step}: {msg}", "request_id": request_id},
                    "tag": PIPELINE_TAG,
                },
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    except Exception as e:
        return JSONResponse(
            content= {
                "status": 1,
                "message": "Failure",
                "data": {"message": f"Error executing step {step}: {str(e)}", "request_id": request_id},
                "tag": PIPELINE_TAG,
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@app.get("/request")
async def get_request_status(request_id: str):
    try:
        db = get_db()
        if db is None:
            raise server_exception("Database initialization failed while trying to authorize")
        reqs = db.get_collection(Collection.PIPELINE_REQUESTS)
        req = reqs.find_one({"_id": ObjectId(request_id)})
        if req:
            req= serialize_doc(req)
            req["request_id"]= req["_id"]
            del req["_id"]
            return JSONResponse(content= {"status": 0, "message": "Success", "data": req})
        else:
            return JSONResponse(content= {"status": 1, "message": "Failure, no pipeline request was found like that"})
    except Exception as e:
        return JSONResponse(
            content= {"status": 1, "message": str(e)}, 
            status_code= status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    
@app.delete("/request")
async def delete_pipeline_request(request_id: str):
    print("yeah probably not deleted: ", request_id)
    return JSONResponse(content= {"status": 0, "message": "Not Implmented"}, status_code=status.HTTP_501_NOT_IMPLEMENTED)


@app.get("/plumber", response_class=HTMLResponse)
async def serve_plumber_ui(request: Request):
    """
    Serves the Alpine.js Pipeline Management UI.
    """
    # The first argument "plumber.html" must match the filename in the templates/ folder.
    # The 'request' object must be passed in the context.
    return templates.TemplateResponse("plumber.html", {"request": request})
