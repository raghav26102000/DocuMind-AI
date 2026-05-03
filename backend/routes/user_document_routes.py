
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File, Form, Body, status
from typing import Dict, Any, Tuple
from datetime import datetime, timezone
from bson import ObjectId
import os, uuid, boto3, filetype, pymongo
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

from auth.auth_utils import get_current_user
from database.database import get_collection
from models.models import Collection, MyUploadFile
from services.doc_verifier import verify_document_type

router = APIRouter(prefix="/documents", tags=["Documents"])

# S3 CLIENT SETUP 
_s3_config: Dict[str, Any] = {}
_s3_client = None

def get_s3_client():
    global _s3_client, _s3_config
    if _s3_client is None:
        cfg = get_collection(Collection.GLOBAL_SETTINGS).find_one(
            {"lkCode": "S3_CONFIGURATIONS", "status": 1}
        )
        if not cfg:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                "S3 configuration not found or disabled")
        _s3_config = {
            "bucket": cfg["key1"],
            "access": cfg["key2"],
            "secret": cfg["key3"],
            "region": cfg["key4"],
        }
        try:
            _s3_client = boto3.client(
                "s3",
                aws_access_key_id=_s3_config["access"],
                aws_secret_access_key=_s3_config["secret"],
                region_name=_s3_config["region"]
            )
        except Exception:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                "Could not initialize S3 client")
    return _s3_client

def upload_to_s3(file: UploadFile | MyUploadFile, user_id: str | ObjectId) -> Tuple[str, str]:
    """
    Uploads the given UploadFile to S3 under a user-specific path.
    Returns a tuple of (public_url, s3_key).
    Raises HTTPException on failure.
    """

    if isinstance(user_id, ObjectId):
        user_id= str(user_id)

    s3 = get_s3_client()
    bucket = _s3_config["bucket"]
    ext = os.path.splitext(file.filename or "file")[1]
    key = f"users/{user_id}/documents/{uuid.uuid4()}{ext}"

    try:
        file.file.seek(0)
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file.file,
            ContentType=file.content_type
        )
    except ClientError as e:
        # Log full details
        logger.error("S3 put_object failed", exc_info=True)
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_msg = e.response.get("Error", {}).get("Message", "")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 upload failed: {error_code} - {error_msg}"
        )
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Upload error: {e}")

    url = f"https://{bucket}.s3.{_s3_config['region']}.amazonaws.com/{key}"
    return url, key

def serialize_doc(doc: dict) -> dict:
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, dict):
            doc[k] = serialize_doc(v)
        elif isinstance(v, list):
            doc[k] = [serialize_doc(i) if isinstance(i, dict) else i for i in v]
    return doc


# Removed from now as i moved this functionaliy to applications routes in /start route 

# @router.get("/{slug}")
# async def get_scheme_documents_required(slug: str, request: Request):
#     """
#     Fetches only the 'documents_required' field for a specific government scheme by slug.
#     """
#     try:
#         collection = get_collection()
#         scheme_doc = collection.find_one(
#             {"slug": slug},
#             {"documents_required": 1}  # Only retrieve this field
#         )
#         if not scheme_doc:
#             return {
#                 "status": 0,
#                 "message": f"Scheme '{slug}' not found",
#                 "data": {},
#                 "tag": request.url.path
#             }
#         # If the field doesn't exist, default to empty list or None
#         result = {
#             "documents_required": scheme_doc.get("documents_required", [])
#         }
#         return {
#             "status": 1,
#             "message": "Documents required fetched successfully",
#             "data": result,
#             "tag": request.url.path
#         }
#     except Exception as e:
#         return {
#             "status": 0,
#             "message": f"Error fetching documents required for scheme: {e}",
#             "data": {},
#             "tag": request.url.path
#         }


# Upload and create a document in our user_document collection
@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = ObjectId(current_user["_id"])
        col = get_collection(Collection.USER_DOCUMENTS)
        col_scheme_docs = get_collection(Collection.SCHEME_DOCUMENTS)

        # Check for existing document with the same title
        if col.find_one({"user_id": user_id, "title": title, "status": 1}):
            return {
                "status": 0,
                "message": f"You've already uploaded a document titled '{title}'.",
                "data": None,
                "tag": request.url.path,
            }

        url, key = upload_to_s3(file, user_id)
        
        # Check file type
        file.file.seek(0)
        kind = filetype.guess(file.file.read(261))
        file.file.seek(0)
        if kind is None or kind.mime not in ("application/pdf"):
            raise HTTPException(415, detail="Unsupported or invalid file type")

        # Verify document type
        lower_title = title.strip().lower()
        if "aadhaar card" in lower_title:
            expected = "aadhaar"
        elif "pan card" in lower_title:
            expected = "pan"
        else:
            expected = "other"

        user_name = current_user.get("full_name", "").strip()
        if not user_name:
            logger.warning("No user_name provided — skipping name check in Aadhaar verification")

        bucket = _s3_config["bucket"]
        verified, markdown_path = verify_document_type(
            s3_client=_s3_client,
            s3_config=_s3_config,
            bucket=bucket, 
            key=key, 
            expected_type=expected, 
            user_name=user_name
        )

        if not verified:
            if user_name == "":
                logger.warning("Aadhaar verification failed because user_name was empty")
            try:
                _s3_client.delete_object(Bucket=_s3_config["bucket"], Key=key)
            except Exception as e:
                logger.exception("Failed to delete S3 object after verification failure: %s", e)
            raise HTTPException(status_code=400, detail=f"Document is not a valid {title}")
        
        scheme_doc_match = col_scheme_docs.find_one({
            "document_type_name": { "$regex": f"^{title}$" }
        })

        if scheme_doc_match:
            document_type_code = int(scheme_doc_match["document_code"])
        else:
            document_type_code = None

        doc = {
            "status":1,
            "user_id": user_id,
            "title": title,
            "document_type_code": document_type_code,
            "filename": file.filename,
            "s3_url": url,
            "s3_key": key,
            "createdOn": datetime.now(timezone.utc),  
            "createdBy": user_id,                    
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": user_id, 
            "verified": verified
        }
        # Insert into Database
        col = get_collection(Collection.USER_DOCUMENTS)
        res = col.insert_one(doc)
        document_id = res.inserted_id

        # Save OCR / Markdown content in user_documents_ocr
        ocr_col = get_collection(Collection.USER_DOCUMENTS_OCR)
        markdown_str = None
        try:
            with open(markdown_path, "r", encoding="utf-8") as f:
                markdown_str = f.read()
        except Exception as e:
            logger.error("Failed to read markdown file %s: %s", markdown_path, e)
            markdown_str = None
        
        ocr_doc = {
            "user_id": user_id,
            "document_id": document_id,
            "title": title,
            "status": 1,
            "markdown_content": markdown_str,
            "createdOn": datetime.now(timezone.utc),
            "createdBy": user_id,
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": user_id,
        }
        ocr_col.insert_one(ocr_doc)

        # clean up temp file
        try:
            if markdown_path and os.path.exists(markdown_path):
                os.remove(markdown_path)
                logger.info("Temporary markdown file %s deleted", markdown_path)
            else:
                logger.warning("Temporary markdown file %s not found for deletion", markdown_path)
        except Exception as del_e:
            logger.exception("Failed to delete temporary markdown file %s: %s", markdown_path, del_e)

        return {
            "status": 1,
            "message": "Uploaded document",
            "data": serialize_doc(doc), 
            "tag": request.url.path
        }

    except HTTPException as e:
        return {
            "status": 0,
            "message": e.detail,
            "data": None,
            "tag": request.url.path
        }
    except pymongo.errors.DuplicateKeyError:
        # Just in case a concurrent insert slipped through before the find_one check
        get_s3_client().delete_object(Bucket=_s3_config["bucket"], Key=key)
        return {
            "status": 0,
            "message": f"Duplicate document title '{title}' detected.",
            "data": None,
            "tag": request.url.path,
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Unexpected error: {e}",
            "data": None,
            "tag": request.url.path
        }


@router.put("/update")
async def update_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = ObjectId(current_user["_id"])
        col = get_collection(Collection.USER_DOCUMENTS)

        # Find the existing active document with the same title
        existing = col.find_one({
            "user_id": user_id,
            "title": title,
            "status": 1
        })

        # Upload new file to S3
        url, key = upload_to_s3(file, user_id)

        # Validate file type (same as upload flow)
        file.file.seek(0)
        kind = filetype.guess(file.file.read(261))
        file.file.seek(0)
        if kind is None or kind.mime not in ("application/pdf",):
            # Clean up S3 on invalid type
            _s3_client.delete_object(Bucket=_s3_config["bucket"], Key=key)
            raise HTTPException(415, detail="Unsupported or invalid file type")

        # Determine expected verification type
        lower_title = title.strip().lower()
        expected = (
            "aadhaar" if "aadhaar card" in lower_title else
            "pan" if "pan card" in lower_title else
            "other"
        )
        user_name = current_user.get("full_name", "").strip()

        # Perform OCR and type verification
        verified = verify_document_type(
            s3_client=_s3_client,
            s3_config=_s3_config,
            bucket=_s3_config["bucket"],
            key=key,
            expected_type=expected,
            user_name=user_name
        )

        if not verified:
            _s3_client.delete_object(Bucket=_s3_config["bucket"], Key=key)
            raise HTTPException(status_code=400, detail=f"New document failed verification for '{title}'")

        # Delete old document from S3 and mark its MongoDB record as inactive
        if verified:
            if existing:
                old_key = existing.get("s3_key")
                if old_key:
                    try:
                        _s3_client.delete_object(Bucket=_s3_config["bucket"], Key=old_key)
                    except Exception as e:
                        logger.exception("Error deleting old document from S3: %s", e)
                col.update_one({"_id": existing["_id"]}, {"$set": {"status": 0}})

        # Insert new document record
        new_doc = {
            "status": 1,
            "user_id": user_id,
            "title": title,
            "filename": file.filename,
            "s3_url": url,
            "s3_key": key,
            "createdOn": datetime.now(timezone.utc),
            "createdBy": user_id,
            "lastModifiedOn": datetime.now(timezone.utc),
            "lastModifiedBy": user_id,
            "verified": verified
        }
        res = col.insert_one(new_doc)
        new_doc["_id"] = res.inserted_id

        return {
            "status": 1,
            "message": f"Document '{title}' updated successfully",
            "data": serialize_doc(new_doc),
            "tag": request.url.path
        }

    except HTTPException as e:
        return {
            "status": 0,
            "message": e.detail,
            "data": None,
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Unexpected error: {e}",
            "data": None,
            "tag": request.url.path
        }


# List all documents for a user
@router.post("")
async def list_documents(request: Request, current_user: dict = Depends(get_current_user)):
    try:
        user_id = ObjectId(current_user["_id"])
        col = get_collection(Collection.USER_DOCUMENTS)
        docs = [serialize_doc(d) for d in col.find({"user_id": user_id,"status":1})]
        return {
            "status": 1,
            "message": "Fetched documents",
            "data": docs,
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Unexpected error: {e}",
            "data": None,
            "tag": request.url.path
        }


# Get a specific document for a user
@router.post("/{doc_id}")
async def get_document(doc_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    try:
        user_id = ObjectId(current_user["_id"])
        col = get_collection(Collection.USER_DOCUMENTS)
        doc = col.find_one({"_id": ObjectId(doc_id), "user_id": user_id})
        if not doc:
            return {
                "status": 0,
                "message": "Document not found",
                "data": None,
                "tag": request.url.path
            }
        return {
            "status": 1,
            "message": "Document fetched",
            "data": serialize_doc(doc),
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Unexpected error: {e}",
            "data": None,
            "tag": request.url.path
        }


# Download a specific document for a user
@router.post("/{doc_id}/download")
async def download_document(doc_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    try:
        user_id = ObjectId(current_user["_id"])
        col = get_collection(Collection.USER_DOCUMENTS)
        doc = col.find_one({"_id": ObjectId(doc_id), "user_id": user_id})
        if not doc:
            return {
                "status": 0,
                "message": "Document not found",
                "data": None,
                "tag": request.url.path
            }

        key = doc.get("s3_key")
        if not key:
            return {
                "status": 0,
                "message": "Missing s3_key",
                "data": None,
                "tag": request.url.path
            }

        s3 = get_s3_client()
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": _s3_config["bucket"], "Key": key},
            ExpiresIn=3600
        )
        return {
            "status": 1,
            "message": "Download link generated",
            "data": {"url": url},
            "tag": request.url.path
        }
    except HTTPException as e:
        return {
            "status": 0,
            "message": e.detail,
            "data": None,
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Unexpected error: {e}",
            "data": None,
            "tag": request.url.path
        }


# Delete a specific document for a user
@router.delete("/{doc_id}")
async def delete_document(doc_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    try:
        user_id = ObjectId(current_user["_id"])
        col = get_collection(Collection.USER_DOCUMENTS)
        doc = col.find_one({"_id": ObjectId(doc_id), "user_id": user_id, "status": 1})
        if not doc:
            return {
                "status": 0,
                "message": "Document not found",
                "data": None,
                "tag": request.url.path
            }

        key = doc.get("s3_key")
        if key:
            try:
                get_s3_client().delete_object(Bucket=_s3_config["bucket"], Key=key)
            except ClientError as e:
                return {
                    "status": 0,
                    "message": f"S3 delete failed: {e}",
                    "data": None,
                    "tag": request.url.path
                }

        col.update_one({"_id": ObjectId(doc_id)}, {"$set": {"status": 0}})
        return {
            "status": 1,
            "message": "Document Deleted from s3 and status of the document set to 0 in user_document collection",
            "data": None,
            "tag": request.url.path
        }
    except Exception as e:
        return {
            "status": 0,
            "message": f"Unexpected error: {e}",
            "data": None,
            "tag": request.url.path
        }
