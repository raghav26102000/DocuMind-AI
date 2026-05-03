import pickle
from schemerpipe.myscheme_utils import getApiDataFromSlug
from schemerpipe.models import ApiData, Collection
from schemerpipe.database import get_db
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ReturnDocument, UpdateOne

def get_intermediate_api_data(db, request_id: str):
    apidata_coll= db[Collection.PIPELINE_API_DATA]
    pipeline_apidata_output= apidata_coll.find({'request_id': ObjectId(request_id)}).to_list()

    def apidata_instance(apidata: ApiData, scheme_id: str) -> ApiData:
        apidata.id = scheme_id
        return apidata

    existing_api_data: list[ApiData] = list([apidata_instance(pickle.loads(
        pipout["api_data"]
    ), str(pipout["_id"])) for pipout in pipeline_apidata_output])
    return existing_api_data

def scheme_download(user_id: str, request_id: str) -> tuple[str, int, str]:

    db= get_db()
    if db is None:
        msg= "no db innit?"
        print(msg)
        return "", 1, msg
    pipecoll= db[Collection.PIPELINE_REQUESTS]
    apidata_coll= db[Collection.PIPELINE_API_DATA]

    # if pipeline api data already has schemes from last request, delete them all
    delete_result = apidata_coll.delete_many({"request_id": {"$ne": ObjectId(request_id)}})
    print(f"Deleted {delete_result.deleted_count} documents with old request_ids.")


    current_request= pipecoll.find_one_and_update(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "step": 2,
            "status": 2,
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": ObjectId(user_id),
        }},
        return_document=ReturnDocument.AFTER
    )

    slugs = []
    # Load slugs from the queue and download them
    try:
        print("current request is: ", current_request)
        slugs= current_request.get("slugs_queue", [])
        if len(slugs) == 0:
            raise Exception("step 1 not done properly")

        slugs_queue_left = []

        # Load existing data from database if it exists
        # This list will now store ApiData objects we're done with
        existing_api_data= get_intermediate_api_data(db, request_id)


        for i, slug in enumerate(slugs):
            print(f"[{i+1}/{len(slugs)}] Processing slug: {slug}")
            # getEnglishDataFromSlug now returns ApiData
            api_data = getApiDataFromSlug(slug)
            if api_data is None:
                print(f"Failed to fetch data for slug: {slug}. Adding to retry queue.")
                slugs_queue_left.append(slug)
            else:
                existing_api_data.append(api_data)
                print(f"Successfully fetched and added data for slug: {slug}. Total collected: {len(existing_api_data)}")


        # if slugs queue left is > 0, dont return 0 status
        if len(slugs_queue_left) > 0:
            status= 2
            error_message= "not all schemes have been downloaded"
        else:
            status= 0
            error_message= ""

        pipecoll.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": ObjectId(user_id),
            "status": status,
            "error_message": error_message,
            "slugs_queue": slugs_queue_left
            }}
        )

        upsertions= []
        for api_data_scheme in existing_api_data:
            upsertions.append(UpdateOne(
                {
                    "slug": api_data_scheme.slug,
                    "request_id": ObjectId(request_id),
                },
                {"$setOnInsert": {
                    "api_data": pickle.dumps(api_data_scheme),
                    "slug": api_data_scheme.slug,
                    "request_id": ObjectId(request_id),
                    "lastModifiedOn": datetime.now(timezone.utc),
                    "lastModifiedBy": ObjectId(user_id),
                    "createdOn": datetime.now(timezone.utc),
                    "createdBy": ObjectId(user_id),
                }},
                upsert= True
            ))
        apidata_coll.bulk_write(upsertions)
        return request_id, status, error_message

    except Exception as e:
        print(f"Error loading slugs: {e}")
        pipecoll.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
            "step": 2,
            "status": 1,
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": ObjectId(user_id),
            "error_message": str(e)
            }}
        )
        return request_id, 1, str(e)


if __name__ == "__main__":
    print("hemlow scheme downloader")
