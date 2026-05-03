
from fastapi import APIRouter, Request, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException, status
from datetime import datetime, timezone,date
from bson import ObjectId
import logging
from pymongo import ReturnDocument
from typing import Any
import json

from database.database import get_collection
from models.models import Collection, StartAppRequest, UpdateAppRequest#, ModelProvider
from auth.auth_utils import get_current_user
from services.playwright_agent import run_playwright_agent#, DEFAULT_PROMPT
# from services.scheme_doc_utils import SCHEME_DOC_MAP
from services.scheme_doc_utils import clean_string, relevance_pipeline
from services.websocket_manager import manager


router = APIRouter(prefix="/applications", tags=["Applications"])
logger = logging.getLogger(__name__)


# Load application status codes dynamically from globalSettings
def load_status_map() -> dict[str, int]:
    col = get_collection(Collection.GLOBAL_SETTINGS)
    docs = col.find({"lkCode": "APPLICATION_STATUS", "status": 1})
    return {doc["key1"]: int(doc["keyCode"]) for doc in docs}

STATUS_MAP = load_status_map()

def serialize_doc(doc: dict[str, Any] | list) -> dict[str, Any] | list:
    """
    Manually serializes MongoDB document for API response.
    Converts ObjectId to string and datetime to ISO format string.
    """
    if isinstance(doc, list):
        for i, docdict in enumerate(doc):
            doc[i]= serialize_doc(docdict)

        return doc

    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, dict):
            doc[key] = serialize_doc(value)
        elif isinstance(value, list):
            doc[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, ObjectId):
            doc[key] = str(value)

    return doc

def serialize_app(doc: dict) -> dict:
    code = doc.get("status")
    label = next((k for k, v in STATUS_MAP.items() if v == code), None)
    return {
        "application_id": str(doc.get("_id")),
        "scheme_slug": doc.get("scheme_slug"),
        "status": label or code,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None
    }


async def get_current_user_from_websocket(websocket: WebSocket) -> dict:
    """
    Dependency to get the current user from a WebSocket connection's query parameters.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token not provided")
        # Raising an HTTPException here will close the connection with the given code
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token not provided")

    user = await get_current_user(token= token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return user



applications_collection = get_collection(Collection.APPLICATIONS)
schemes_collection = get_collection(Collection.SCHEMES)


@router.websocket("/ws/{application_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    application_id: str,
    current_user: dict = Depends(get_current_user_from_websocket)
):

    user_id = ObjectId(current_user["_id"])
    application = applications_collection.find_one({
        "_id": ObjectId(application_id),
        "user_id": user_id
    })

    if not application:
        await websocket.close(code=1008) # Policy Violation
        return

    await manager.connect(application_id, websocket)
    # TONOTDO: test mode
    # await manager.connect("test123123", websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "user_input_response":
                    await manager.forward_client_response(application_id, message.get("data"))
            except (json.JSONDecodeError, AttributeError):
                # Can log this if needed, but for now just ignore malformed messages
                pass
    except WebSocketDisconnect:
        manager.disconnect(application_id)
    except Exception as e:
        logger.error(f"Error in websocket for application {application_id}: {e}")
        manager.disconnect(application_id)

async def playwright_runner_new_thread(
    application_id: str,
    user: dict[str, Any],
    user_data: list[dict[str, Any]],
    scheme: dict[str, Any],
    # prompt_instructions: str = DEFAULT_PROMPT,
    # model_provider: ModelProvider = "gemini",
    # model_id: str | None = None,
    headless: bool = False,
    # download_path: str | None = None,
    # timeout: int = 30000,
    # viewport: dict[str, int] | None = None
    ):
    print("something in the WAYYYYYYy")

    # to_thread is important because asyncio.to_run wont run if fastapi's event loop
    # is already running in the thread. unavoidable too because smolagents' tools
    # gotta be sync only. and so, asyncio needs to be used there.

    # await asyncio.to_thread(
    #     run_playwright_agent,
    #     application_id= application_id,
    #     user= user,
    #     user_data= user_data,
    #     scheme= scheme,
    #     headless= headless
    # )
    await run_playwright_agent(
        application_id= application_id,
        user= user,
        user_data= user_data,
        scheme= scheme,
        headless= headless
    )


# START OR RESUME APPLICATION
@router.post("/start", summary="Start or resume an application")
async def start_application(
    payload: StartAppRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = ObjectId(current_user["_id"])
        now = datetime.now(timezone.utc)
        inprog = STATUS_MAP.get("IN_PROGRESS")

        scheme = schemes_collection.find_one({"slug": payload.scheme_slug})
        if not scheme:
            return {
                "status": 0,
                "message": f"Scheme '{payload.scheme_slug}' not found",
                "data": None,
                "tag": request.url.path
            }
        scheme_id = scheme["_id"]
        scheme_idstr= str(scheme_id)

        def _gather_required_docs(user_id: ObjectId, scheme_doc: dict):
            user_docs_col = get_collection(Collection.USER_DOCUMENTS)
            scheme_docs_col = get_collection(Collection.SCHEME_DOCUMENTS)
            user_docs = user_docs_col.find({"user_id": user_id, "status": 1}, 
                                             {'_id': 1,
                                              'title': 1, 
                                              's3_url': 1,
                                              's3_key': 1,
                                              'document_type_code': 1,
                                              }).to_list()

            required_docs = []

            relevant_scheme_docs= scheme_docs_col.aggregate(relevance_pipeline(scheme_idstr))

            # Add the $count stage to the end of the pipeline
            count_pipeline = relevance_pipeline(scheme_idstr) + [{"$count": "document_count"}]

            # Execute the pipeline and get the result
            count_result = scheme_docs_col.aggregate(count_pipeline)

            # The result is a cursor with a single document containing the count
            try:
                count_document = next(count_result)
                num_documents = count_document["document_count"]
                # print(f"The relevance pipeline returns {num_documents} documents.",  "\n now looping through each, and then inside the maps of each")
            except StopIteration:
                print("There are no relevant documents for this scheme.")

            for scheme_doc in relevant_scheme_docs:
                # print("iteration for scheme_doc: ", scheme_doc)

                attached_documents_for_doctype= list(filter(lambda x: x['document_type_code'] == scheme_doc['document_code'], user_docs))
                # print("got attached documents already there in user docs for this specific doc type {0} (a subset of user_documents): ".format(scheme_doc['document_code']), attached_documents_for_doctype)
                    

                for scheme_doc_object_sametype in scheme_doc['scheme_document_name_map']:
                    # looping because sometimes many scheme documents may be of the same type 
                    # (all misclassified as Other / PAN front + PAN back)

                    attached_documents_for_doctype_and_title= list(filter(lambda x: clean_string(x['title']) == clean_string(scheme_doc_object_sametype[scheme_idstr]), attached_documents_for_doctype))
                    # print("looping through each type, got the attached:: ", attached_documents_for_doctype_and_title)

                    attached= not len(attached_documents_for_doctype_and_title) == 0
                    if attached:
                        # print("found attached! while looping through scheme docs map")
                        for attached_document in attached_documents_for_doctype_and_title:
                            attached_document['doc_id']= attached_document.pop('_id')

                    required_docs.append({
                        "old_title": scheme_doc_object_sametype[scheme_idstr],
                        "title": scheme_doc['document_type_name'],
                        "document_type_code": int(scheme_doc['document_code']),
                        "attached": attached,
                        # taking the first document because theres gotta be only one document in user docs which has the
                        # SAME document type and SAME EXACT title
                        "attached_document": None if not attached else attached_documents_for_doctype_and_title[0]
                    })

            return required_docs

        existing = applications_collection.find_one({
            "user_id": user_id,
            "scheme_slug": payload.scheme_slug,
            "scheme_id": scheme_id,
            "application_status": inprog
        })
        required_docs = _gather_required_docs(user_id, scheme)
        reqdocs_serialized= serialize_doc(required_docs)

        # print("made required docs successfully: ", required_docs)

        if existing:
            return {
                "status": 1,
                "message": "Resuming existing application",
                "data": {
                    "application_id": str(existing["_id"]),
                    "required_documents": reqdocs_serialized
                },
                "tag": request.url.path
            }

        new_doc = {
            "status": 1,
            "user_id": user_id,
            "scheme_id": scheme_id,
            "scheme_slug": payload.scheme_slug,
            "application_status": inprog,
            "createdOn": now,
            "createdBy": user_id,
            "lastModifiedOn": now,
            "lastModifiedBy": user_id,
            "required_documents_status": required_docs,
            "dpr_documents": [],
            "dpr_generation_status": 0,
            "dpr_last_started": None,
        }

        try:
            res = applications_collection.insert_one(new_doc)
            application_id = str(res.inserted_id)
            # TONOTDO: test run
            # application_id= "test123123"
        except Exception:
            concurrent = applications_collection.find_one({
                "user_id": user_id,
                "scheme_slug": payload.scheme_slug,
                "scheme_id": scheme_id,
                "application_status": inprog
            })
            if concurrent:
                return {
                    "status": 1,
                    "message": "Resuming existing application",
                    "data": {"application_id": str(concurrent["_id"]), "required_documents": reqdocs_serialized},
                    "tag": request.url.path
                }
            raise

        
        return {
            "status": 1,
            "message": "Application started",
            "data": {
                "application_id": application_id,
                "required_documents": reqdocs_serialized
            },
            "tag": request.url.path
        }

    except Exception:
        logger.exception("Error in start_application")
        return {
            "status": 0,
            "message": "Failed to start application",
            "data": None,
            "tag": request.url.path
        }


# UPDATE IN-PROGRESS APPLICATION
@router.patch("/{app_id}", summary="Attach document with S3 metadata")
async def update_application(
    app_id: str,
    payload: UpdateAppRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):

    try:
        user_id = ObjectId(current_user["_id"])
        now = datetime.now(timezone.utc)
        inprog_status = STATUS_MAP.get("IN_PROGRESS")

        # if not payload.doc_id or not (payload.title or payload.old_title):
        #     return {"status": 0, "message": "Required: 'doc_id' plus 'title' or 'old_title'", "data": None, "tag": request.url.path}

        # Define filters and arrayFilters to locate nested element
        filter_query = {
            "_id": ObjectId(app_id),
            "user_id": user_id,
            "application_status": inprog_status,
        }
        array_filters = []
        if payload.title:
            filter_query["required_documents_status.title"] = payload.title
        else:
            filter_query["required_documents_status.old_title"] = payload.old_title

        array_filters = [{"elem.title": payload.title} if payload.title else {"elem.old_title": payload.old_title}]

        # Update only the matching array element
        updated = applications_collection.find_one_and_update(
            filter_query,
            {
                "$set": {
                    "required_documents_status.$[elem].attached": True,
                    "required_documents_status.$[elem].attached_document": {
                        "doc_id": ObjectId(payload.doc_id),
                        "s3_url": payload.s3_url,
                        "s3_key": payload.s3_key
                    },
                    "lastModifiedOn": now,
                    "lastModifiedBy": user_id
                }
            },
            array_filters=array_filters,
            return_document=ReturnDocument.AFTER
        )

        if not updated:
            return {"status": 0, "message": "No matching document found", "data": None, "tag": request.url.path}

        return {
            "status": 1,
            "message": "Document metadata updated successfully",
            "data": {
                "application_id": app_id,
                "doc_id": payload.doc_id,
                "s3_url": payload.s3_url,
                "s3_key": payload.s3_key,
                "updated_at": now.isoformat()
            },
            "tag": request.url.path
        }

    except Exception:
        logger.exception("Error updating document metadata")
        return {"status": 0, "message": "Failed to update document", "data": None, "tag": request.url.path}


# SUBMIT COMPLETED APPLICATION
@router.get("/{app_id}/submit", summary="Submit a completed application")
async def submit_application(
    app_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = ObjectId(current_user["_id"])

        scheme_id= applications_collection.find_one({"_id": ObjectId(app_id)}, {"scheme_id": 1})
        if scheme_id:
            scheme_id= scheme_id['scheme_id']
        else:
            raise Exception("scheme not found for this application")
        scheme = schemes_collection.find_one({"_id": scheme_id})
        if not scheme:
            # might happen is its a deleted scheme / id of the source scheme doc changed while the application
            # was dormant
            raise Exception("scheme not found for this id")

        if scheme.get("applicationProcess"):
            for process in scheme["applicationProcess"]:
                if process.get("mode") == "Online":
                    # md_text = process.get("process_md", "")
                    # application_url= ''
                    # urls= re.findall(r'(https?://[^\s]+)', md_text)
                    # if urls:
                    #     application_url = ', '.join(urls)

                    user_docs = list(get_collection(Collection.USER_DOCUMENTS).find({"user_id": user_id}))

                    current_user['password']= 'REDACTED'


                    current_user= serialize_doc(current_user)
                    print("current user is: ", current_user)
                    scheme= serialize_doc(scheme)
                    user_docs= serialize_doc(user_docs)

                    print("playwright runner code path was hit")
                    await playwright_runner_new_thread(
                        application_id=app_id,
                        user=current_user,
                        user_data=user_docs,
                        scheme=scheme,
                        headless=True
                    )
                    break

        now = datetime.now(timezone.utc)
        inprog = STATUS_MAP.get("IN_PROGRESS")
        submitted = STATUS_MAP.get("SUBMITTED")

        print("submission to database code path got hit")
        submitted = applications_collection.find_one_and_update(
            {"_id": ObjectId(app_id), "user_id": user_id, "application_status": inprog},
            {"$set": {"application_status": submitted, "lastModifiedOn": now, "lastModifiedBy": user_id}},
            return_document=True
        )
        if not submitted:
            return {
                "status": 0,
                "message": "No in-progress application to submit",
                "data": None,
                "tag": request.url.path
            }

        return {
            "status": 1,
            "message": "Application submitted successfully",
            "data": {"application_id": app_id},
            "tag": request.url.path
        }

    except Exception as e:
        logger.exception("Error in submit_application: ", str(e))
        return {
            "status": 0,
            "message": "Failed to submit application",
            "data": None,
            "tag": request.url.path
        }


# LIST ALL APPLICATIONS
def bson_to_jsonable(obj: Any) -> Any:
    """
    Recursively convert BSON types to JSON-serializable Python types.
    - ObjectId -> str
    - datetime/date -> ISO 8601 string
    - dict/list -> recurse
    """
    # primitive safe types
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj

    # ObjectId -> string
    if isinstance(obj, ObjectId):
        return str(obj)

    # datetime/date -> isoformat
    if isinstance(obj, (datetime, date)):
        # if aware, keep timezone; isoformat handles both naive & aware
        return obj.isoformat()

    # dict -> convert each value
    if isinstance(obj, dict):
        return {str(k): bson_to_jsonable(v) for k, v in obj.items()}

    # list / tuple -> convert each element
    if isinstance(obj, (list, tuple)):
        return [bson_to_jsonable(v) for v in obj]

    # for other unknown objects, try to stringify (safe fallback)
    try:
        return str(obj)
    except Exception:
        return None


@router.post("/", summary="List all my applications with minimal scheme details")
async def list_applications(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = ObjectId(current_user["_id"])

        # find applications for user (sync PyMongo assumed; if using Motor, use await & to_list)
        app_cursor = applications_collection.find({"user_id": user_id}).sort("lastModifiedOn", -1)

        results = []
        for app_doc in app_cursor:
            # Use your existing serialize_app to get the shape you already prefer
            app_serialized = serialize_app(app_doc)

            # fetch only required fields from scheme
            scheme_slug = app_doc.get("scheme_slug")
            scheme_doc = schemes_collection.find_one(
                {"slug": scheme_slug},
                {"schemeName": 1, "level": 1, "state": 1}  # projection
            )

            if scheme_doc:
                # convert entire scheme_doc to JSON-safe structure (including _id -> str)
                app_serialized["scheme"] = bson_to_jsonable(scheme_doc)
            else:
                app_serialized["scheme"] = None

            # ensure the application object itself has JSON-safe values (e.g., updated_at)
            app_serialized = bson_to_jsonable(app_serialized)

            results.append(app_serialized)

        return {
            "status": 1,
            "message": "Your applications",
            "data": results,
            "tag": request.url.path
        }

    except Exception:
        logger.exception("Error in list_applications")
        return {
            "status": 0,
            "message": "Failed to list applications",
            "data": None,
            "tag": request.url.path
        }




