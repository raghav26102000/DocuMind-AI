from fastapi import APIRouter, HTTPException, Query, Request, Body, Depends, WebSocket, WebSocketDisconnect, UploadFile, File
from typing import List, Dict, Any, Optional
from auth.auth_utils import get_current_user
from database.database import get_collection
from bson import ObjectId
from datetime import datetime, timezone
from fastapi_cache.decorator import cache
from rapidfuzz import fuzz
from routes.applications_routes import get_current_user_from_websocket
import re
from services.dpr_gen import dpr
from services.websocket_manager import manager
import json
from models.models import Collection, MyUploadFile
import logging
import asyncio
import pymongo
import boto3
import tempfile
import os
import mimetypes
from routes.user_document_routes import upload_to_s3
from pathlib import Path

router = APIRouter()
logger = logging.getLogger(__name__)

def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Manually serializes MongoDB document for API response.
    Converts ObjectId to string and datetime to ISO format string.
    """
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



def parse_eligibility_to_questions(eligibility_md: str) -> List[str]:
    """
    Simpler but more robust parser that turns eligibility markdown
    into clear Yes/No questions (strings). Keeps order and returns list.
    Caches results per exact markdown text (in-process).
    """
    if not eligibility_md:
        return []

    md = eligibility_md.replace("\r\n", "\n").strip()

    # split numbered / bullet lists first
    clauses = re.findall(r'^\s*\d+\.\s*(.+)$', md, flags=re.MULTILINE)
    if not clauses:
        clauses = re.findall(r'^[\-\*\•]\s*(.+)$', md, flags=re.MULTILINE)
    if not clauses:
        # fallback: split by double newline, then by single lines
        parts = [p.strip() for p in re.split(r'\n\s*\n', md) if p.strip()]
        clauses = []
        for p in parts:
            lines = [l.strip() for l in p.splitlines() if l.strip()]
            if len(lines) == 1:
                clauses.append(lines[0])
            else:
                clauses.extend(lines)

    questions: List[str] = []
    for raw in clauses:
        s = raw.strip()
        if not s or "note" in s.lower():
            continue

        # Clean HTML entities & excessive whitespace
        s = s.replace("&nbsp;", " ").replace("&#39;", "'")
        s = re.sub(r"\s+", " ", s).strip().rstrip(".")

        # Heuristics to produce nicer yes/no questions:
        # 1) Age -> "Is your age X years or below?" (yes/no)
        m_age = re.search(r"(?:age|aged|years? old).{0,30}?(\d{1,3})", s, flags=re.IGNORECASE)
        if m_age:
            maxv = m_age.group(1)
            q = f"Is your age {maxv} years or below?"
            questions.append(q)
            continue

        # 2) Community membership -> "Do you belong to the X community?"
        m_comm = re.search(r"belong(?:ing)?(?: to)? the ([A-Za-z &'\-]+?) community", s, flags=re.IGNORECASE)
        if m_comm:
            comm = m_comm.group(1).strip()
            q = f"Do you belong to the {comm} community?"
            questions.append(q)
            continue

        # 3) Residency -> "Do you reside in <region>?"
        m_res = re.search(r"(?:reside|resident|living) (?:in|within|at) (.+?)(?:[.,]|$)", s, flags=re.IGNORECASE)
        if m_res:
            region = m_res.group(1).strip()
            q = f"Do you reside in {region}?"
            questions.append(q)
            continue

        # 4) Enterprise location -> "Is your enterprise set up in <place>?"
        m_ent = re.search(r"(?:set up|establish|located|based).{0,40}(?:enterprise|business|unit|project).{0,40}(?:in|at)\s*(.+?)(?:[.,]|$)", s, flags=re.IGNORECASE)
        if m_ent:
            place = m_ent.group(1).strip()
            q = f"Is your enterprise set up in {place}?"
            questions.append(q)
            continue

        # 5) Required documents -> "Do you have the following documents: ...?"
        m_docs = re.search(r"(?:documents?|upload).{0,40}(:|such as|like|including)\s*(.+)", s, flags=re.IGNORECASE)
        if m_docs:
            docs_blob = m_docs.group(2).strip()
            docs_blob = re.sub(r'\s+and\s+|\s*,\s*', ', ', docs_blob)
            q = f"Do you have the following documents: {docs_blob}?"
            questions.append(q)
            continue

        # 6) Default fallback: turn the clause into a straightforward yes/no question
        # Try to remove leading "The applicant ..." for readability
        q_text = re.sub(r'^\s*(the applicant|the beneficiary|the student)\s+', '', s, flags=re.IGNORECASE)
        # If it already starts with a verb, prepend "Does"
        if re.match(r'^[A-Z][a-z]+', q_text):
            q = f"Does {q_text}?"
        else:
            q = f"Does the applicant satisfy this: {q_text}?"
        # make sure question mark exists
        if not q.endswith("?"):
            q += "?"
        questions.append(q)

    return questions


def _normalize_bool(val: Any) -> Optional[bool]:
    """
    Accepts booleans, strings ('yes','no','true','false','1','0'), ints 1/0.
    Returns True/False or None if cannot normalize.
    """
    if isinstance(val, bool):
        return val
    if val is None:
        return None
    if isinstance(val, (int, float)):
        if int(val) == 1:
            return True
        if int(val) == 0:
            return False
        return None
    s = str(val).strip().lower()
    if s in ("yes", "y", "true", "t", "1"):
        return True
    if s in ("no", "n", "false", "f", "0"):
        return False
    return None

# Get all schemes
@router.get("/schemes")
@cache(expire=30)  # Cache list results for 30s
async def get_all_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, gt=0, le=200)
):
    """
    Fetches all government schemes from the MongoDB collection as raw dictionaries.
    This route is currently UNPROTECTED.
    """
    try:
        collection = get_collection(Collection.SCHEMES)
        cursor = collection.find(
            {},
            {
                "_id": 1,
                "slug": 1,
                "schemeName": 1,
                "schemeContent.briefDescription": 1,
                "schemeContent.detailedDescription_md": 1,
                "schemeContent.schemeImageUrl": 1,
                "targetBeneficiaries": 1,
                "schemeCategory": 1,
                "schemeSubCategory": 1,
                "state": 1,
                "nodalDepartmentName": 1,
                "tags": 1
            }
        ).skip(skip).limit(limit)  # Efficient pagination :contentReference[oaicite:6]{index=6}
        data = [serialize_doc(doc) for doc in cursor]
        return {
            "status": 1,
            "message": "Fetched schemes successfully",
            "data": data,
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Error fetching schemes: {e}",
            "data": {},
            "tag": request.url.path
        }


# Get total count of schemes
@router.get("/schemes/count")
@cache(expire=300)
async def get_schemes_count(request: Request):
    """
    Fetches the total count of government schemes in the MongoDB collection.
    This route is currently UNPROTECTED.
    """
    try:
        collection = get_collection(Collection.SCHEMES)
        count = collection.count_documents({})
        return {
            "status": 1,
            "message": "Schemes count retrieved",
            "data": {"count": count},
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Error fetching count: {e}",
            "data": {},
            "tag": request.url.path
        }


# Search schemes
@router.get("/schemes/search")
@cache(expire=300)
async def search_schemes(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, gt=0, le=200),
    q: Optional[str] = Query(None, description="Fuzzy search query."),
    category: Optional[str] = Query(None, description="Filter by scheme category label."),
    state: Optional[str] = Query(None, description="Filter by state label."),
    tag: Optional[str] = Query(None, description="Filter by tags."),
):
    """
    Searches for government schemes based on various criteria.
    This route is UNPROTECTED.

    **Query Parameters:**
    - `q`: Fuzzy search query.
    - `category`: Filters by `schemeCategory.label`.
    - `state`: Filters by `state.label`.
    - `tag`: Filters by `tags` array.

    **Example Usage:**
    - `/schemes/search?q=education`
    - `/schemes/search?category=Business & Entrepreneurship&state=Andhra Pradesh`
    - `/schemes/search?tag=Financial Assistance`
    """
    try:
        collection = get_collection(Collection.SCHEMES)
        query_filter = {}

        # Add specific filters
        if category:
            query_filter["schemeCategory.label"] = category
        if state:
            query_filter["state.label"] = state
        if tag:
            query_filter["tags"] = tag

        projection = {
            "_id": 1,
            "slug": 1,
            "schemeName": 1,
            "schemeContent.briefDescription": 1,
            "schemeContent.detailedDescription_md": 1,
            "schemeContent.schemeImageUrl": 1,
            "targetBeneficiaries": 1,
            "schemeCategory": 1,
            "schemeSubCategory": 1,
            "state": 1,
            "nodalDepartmentName": 1,
            "tags": 1
        }

        matching_schemes_count = None
        if not q:
            matching_schemes_count = collection.count_documents(query_filter)

        # Fetch a broader set for fuzzy ranking (max 500)
        docs = list(
            collection.find(query_filter, projection)
                      .skip(skip)
                      .limit(min(limit * 5, 500))
        )

        if q:
            scored = []
            for doc in docs:
                name = doc.get("schemeName", "")
                short = doc.get("schemeShortTitle", "")

                q_lower = q.lower()

                name_score = fuzz.partial_ratio(q_lower, name.lower())
                short_score = fuzz.partial_ratio(q_lower, short.lower())
                score = max(name_score, short_score)

                # If query longer than candidate, penalize short matches
                if len(q_lower) > len(name) and name_score > 80:
                    score *= 0.5  # Decrease weight significantly
                if len(q_lower) > len(short) and short_score > 80:
                    score *= 0.5

                if score >= 60:
                    scored.append((score, doc))

            scored.sort(key=lambda x: x[0], reverse=True)
            matched_docs = [doc for _, doc in scored][:limit]
        else:
            matched_docs = docs[:limit]

        data = [serialize_doc(doc) for doc in matched_docs]
        return {
            "status": 1,
            "message": "Search results retrieved",
            "count": matching_schemes_count,
            "data": data,
            "tag": request.url.path
        }

    except Exception as e:
        return {
            "status": 0,
            "message": f"Error searching schemes: {e}",
            "data": {},
            "tag": request.url.path
        }


# Get schemes detail using slug
@router.get("/schemes/{slug}")
async def get_scheme_by_slug(slug: str, request: Request):
    """
    Fetches a single government scheme by its slug as a raw dictionary.
    """
    try:
        collection = get_collection(Collection.SCHEMES)
        scheme_doc = collection.find_one({"slug": slug})
        if not scheme_doc:
            return {
                "status": 0,
                "message": f"Scheme '{slug}' not found",
                "data": {},
                "tag": request.url.path
            }
        return {
            "status": 1,
            "message": "Scheme fetched successfully",
            "data": serialize_doc(scheme_doc),
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Error fetching scheme by slug: {e}",
            "data": {},
            "tag": request.url.path
        }

@router.get("/schemes/{slug}/eligibility-questions")
async def get_eligibility_questions(slug: str, request: Request):
    """
    Returns a list of Yes/No eligibility questions for a specific scheme.
    """
    try:
        collection = get_collection(Collection.SCHEMES)
        scheme = collection.find_one(
            {"slug": slug},
            {"_id": 1, "schemeName": 1, "eligibilityCriteria.eligibilityDescription_md": 1}
        )

        if not scheme:
            raise HTTPException(status_code=404, detail="Scheme not found")

        eligibility_md = scheme.get("eligibilityCriteria", {}).get("eligibilityDescription_md", "")
        questions = parse_eligibility_to_questions(eligibility_md)

        return {
            "status": 1,
            "message": f"Eligibility questions for {scheme.get('schemeName', '')}",
            "data": {
                "schemeName": scheme.get("schemeName"),
                "questions": questions
            },
            "tag": request.url.path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching eligibility questions: {e}")


@router.post("/schemes/{slug}/dpr/documents")
async def receive_initial_documents(
    slug: str,
    extra_documents: list[UploadFile] = File(..., description="List of extra documents."),
    current_user: dict = Depends(get_current_user)
):
    """
    Handles uploading of extra documents for a DPR, associating them with a specific application.
    """
    user_id= current_user["_id"]
    if not isinstance(user_id, ObjectId):
        user_id = ObjectId(user_id)

    # Get scheme_id from slug
    schemes_collection = get_collection(Collection.SCHEMES)
    scheme = schemes_collection.find_one({"slug": slug}, {"_id": 1})
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    # Find the latest pending application for the user and scheme
    apps_collection = get_collection(Collection.APPLICATIONS)
    application = apps_collection.find_one(
        {"user_id": user_id, "scheme_slug": slug, "application_status": 1},
        sort=[("createdOn", pymongo.DESCENDING)]
    )

    if not application:
        raise HTTPException(status_code=404, detail="No application found for this user and scheme.")

    application_id = application["_id"]

    # Upload documents to S3
    uploaded_docs = []
    for doc in extra_documents:
        try:
            s3_url, s3_key = upload_to_s3(doc, user_id)
            uploaded_docs.append({
                "title": doc.filename,
                "s3_url": s3_url,
                "s3_key": s3_key,
                "uploaded_at": datetime.now(timezone.utc)
            })
        except HTTPException as e:
            raise HTTPException(status_code=e.status_code, detail=f"Failed to upload {doc.filename}: {e.detail}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred during upload of {doc.filename}: {e}")

    # Update the application with the document URLs
    if uploaded_docs:
        apps_collection.update_one(
            {"_id": application_id},
            {"$push": {"dpr_documents": {"$each": uploaded_docs}}}
        )

    return {
        "status": 1,
        "message": f"Successfully uploaded {len(uploaded_docs)} documents for application {application_id}.",
        "data": {
            "application_id": str(application_id),
            "documents": uploaded_docs
        }
    }


@router.websocket("/schemes/{slug}/dpr")
async def websocket_endpoint(
    websocket: WebSocket,
    slug: str,
    current_user: dict = Depends(get_current_user_from_websocket)
):
    collection = get_collection(Collection.SCHEMES)
    scheme_doc = collection.find_one({"slug": slug}, {"_id": 1})
    if not scheme_doc:
        raise HTTPException(status_code=404, detail="Scheme not found")

    scheme_id = str(scheme_doc["_id"])
    user_id = current_user["_id"]
    user_id_str = str(user_id)
    connection_id = f"dpr-{user_id_str}-{scheme_id}"

    await manager.connect(connection_id, websocket)

    apps_collection = get_collection(Collection.APPLICATIONS)
    application = apps_collection.find_one(
        {"user_id": user_id, "scheme_slug": slug, "application_status": 1},
        sort=[("createdOn", pymongo.DESCENDING)]
    )

    if not application:
        logger.warning(f"No pending application found for user {user_id_str} and scheme {slug}")
        await websocket.close(code=1008, reason="No pending application found.")
        manager.disconnect(connection_id)
        return

    application_id = application["_id"]

    if application.get("dpr_generation_status", 0) != 0:
        logger.warning(f"DPR generation already running for application {application_id}")
        await websocket.send_json({"type": "status", "message": "DPR generation is already in progress."})
        await websocket.close()
        manager.disconnect(connection_id)
        return

    extra_documents: Optional[list[MyUploadFile]] = None
    temp_dir_handle = None

    if application.get("dpr_documents"):
        s3_config = get_collection(Collection.GLOBAL_SETTINGS).find_one({"lkCode": "S3_CONFIGURATIONS"})
        if s3_config:
            try:
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=s3_config.get("key2"),
                    aws_secret_access_key=s3_config.get("key3"),
                    region_name=s3_config.get("key4")
                )
                bucket_name = s3_config.get("key1")
                temp_dir_handle = tempfile.TemporaryDirectory(prefix=f"dpr_{user_id_str}_")
                temp_dir = Path(temp_dir_handle.name)
                
                downloaded_files = []
                for doc_info in application["dpr_documents"]:
                    print("found a dpr doc, passing binary data to generator...")
                    filename = doc_info.get("title", "unknown_file")
                    s3_key = doc_info.get("s3_key")
                    if not s3_key:
                        continue
                    
                    local_path: Path = temp_dir / filename
                    s3_client.download_file(bucket_name, s3_key, local_path)
                    
                    content_type, _ = mimetypes.guess_type(local_path)
                    if content_type is None:
                        content_type = 'application/octet-stream'
                        
                    downloaded_files.append(
                        MyUploadFile(filename=filename, content_type=content_type, binary_data=local_path.read_bytes())
                    )
                if downloaded_files:
                    extra_documents = downloaded_files
            except Exception as e:
                logger.error(f"Error downloading DPR documents from S3 for app {application_id}: {e}")
        else:
            logger.warning("S3_CONFIGURATIONS not found. Cannot download DPR documents.")

    apps_collection.update_one(
        {"_id": application_id},
        {"$set": {"dpr_generation_status": 1, "dpr_last_started": datetime.now(timezone.utc)}}
    )

    exit_flag= 0
    async def dpr_wrapper(docs, temp_dir):
        try:
            hf_models= [
                "Qwen/Qwen3-235B-A22B-Thinking-2507", # cant seem to execute any tool calls
                "Qwen/Qwen3-Next-80B-A3B-Thinking", # calls tools but cant read output, makes bad latex
                "deepseek-ai/DeepSeek-V3.1", # doesnt give end token for tool calls
                "deepseek-ai/DeepSeek-R1-0528", # same as v3.1
                "zai-org/GLM-4.5", # invalid json
                "moonshotai/Kimi-K2-Instruct-0905" # bad tool calling, incorrect params
            ]
            # await dpr(user_id_str, scheme_id, connection_id, docs, "huggingface", "hf_models[0]")
            await dpr(user_id_str, scheme_id, connection_id, docs, "gemini", "gemini-2.5-pro")
            # reset to allow dpr to be generated again
            exit_flag= 0
            
        except Exception as e:
            logger.error(f"DPR task for application {application_id} failed: {e}")
            exit_flag= 2
        finally:
            if temp_dir:
                temp_dir.cleanup()

    asyncio.create_task(dpr_wrapper(extra_documents, temp_dir_handle))

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "user_input_response" or message.get("type") == "user_confirm_response":
                    await manager.forward_client_response(connection_id, message)
            except (json.JSONDecodeError, AttributeError):
                logger.warning(f"Received malformed websocket message from {connection_id}")
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        logger.info(f"Client {connection_id} disconnected.")
        apps_collection.update_one({"_id": application_id}, {"$set": {"dpr_generation_status": exit_flag}})
    except Exception as e:
        logger.error(f"Error in websocket for dpr connection {connection_id}: {e}")
        manager.disconnect(connection_id)



@router.post("/schemes/{slug}/eligibility-check")
async def check_user_eligibility(
    slug: str,
    body: Dict[str, Any] = Body(..., example={"answers": [True, False, True]}),
    request: Request = None
):
    """
    Simple eligibility checker that expects an ordered list of boolean-like values
    (answers must be in the same order as questions returned by /eligibility-questions).
    Accepts flexible truthy values (booleans, 'yes'/'no', 1/0).
    """
    try:
        collection = get_collection(Collection.SCHEMES)
        scheme = collection.find_one(
            {"slug": slug},
            {"_id": 1, "schemeName": 1, "eligibilityCriteria.eligibilityDescription_md": 1}
        )

        if not scheme:
            return {"status": 0, "message": "Scheme not found", "data": {}, "tag": request.url.path}

        eligibility_md = scheme.get("eligibilityCriteria", {}).get("eligibilityDescription_md", "")
        questions = parse_eligibility_to_questions(eligibility_md)

        raw_answers = body.get("answers", [])
        # allow legacy 'answers_list' if clients send that
        if not raw_answers and "answers_list" in body:
            raw_answers = body.get("answers_list") or []

        if not isinstance(raw_answers, list):
            return {"status": 0, "message": "Answers must be an ordered list", "data": {}, "tag": request.url.path}

        if len(raw_answers) != len(questions):
            return {
                "status": 0,
                "message": "Number of answers does not match number of questions",
                "data": {"expected": len(questions), "received": len(raw_answers), "questions": questions},
                "tag": request.url.path
            }

        normalized: List[Optional[bool]] = [_normalize_bool(a) for a in raw_answers]

        # If any answer is ambiguous (None), return error indicating offending indexes
        ambiguous_indices = [i for i, v in enumerate(normalized) if v is None]
        if ambiguous_indices:
            return {
                "status": 0,
                "message": "Some answers are ambiguous (expected yes/no values).",
                "data": {"ambiguous_indices": ambiguous_indices, "questions": questions},
                "tag": request.url.path
            }

        # Eligibility = all True
        eligible = all(normalized)

        return {
            "status": 1,
            "message": f"User eligibility for {scheme.get('schemeName', '')}",
            "data": {
                "eligible": eligible,
                "criteriaChecked": questions,
                "answers": normalized
            },
            "tag": request.url.path
        }

    except Exception as e:
        return {"status": 0, "message": f"Error checking eligibility: {e}", "data": {}, "tag": request.url.path}


# Get document_type_names from scheme_documents collection
@router.get("/document-types-names", summary="List all document types for schemes")
async def list_scheme_document_types(request: Request):
    try:
        scheme_docs_col = get_collection(Collection.SCHEME_DOCUMENTS)
        # Find distinct document_type_name values
        types_cursor = scheme_docs_col.distinct("document_type_name", {})
        # types_cursor is a list of strings
        result = sorted([t for t in types_cursor if t is not None])

        return {
            "status": 1,
            "message": "Scheme document types fetched successfully",
            "data": result,
            "tag": request.url.path
        }
    except Exception as e:
        logger.exception("Error listing scheme document types: %s", e)
        return {
            "status": 0,
            "message": "Failed to fetch scheme document types",
            "data": None,
            "tag": request.url.path
        }
