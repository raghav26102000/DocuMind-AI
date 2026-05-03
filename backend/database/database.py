# database.py

import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, TEXT
from typing import Optional
from models.models import Collection

load_dotenv()

# Required environment variables
MONGO_URI = os.getenv("MONGO_URI", "").strip()
DB_NAME = os.getenv("DB_NAME", "").strip()

COLLECTION_NAME = os.getenv("COLLECTION_NAME", "").strip()
USER_DOCUMENTS_COLLECTION_NAME = os.getenv("USER_DOCUMENTS_COLLECTION_NAME", "").strip()
USERS_COLLECTION_NAME = os.getenv("USERS_COLLECTIONS_NAME", "").strip() or os.getenv("USERS_COLLECTION_NAME", "").strip()
AUDIT_COLLECTION_NAME = os.getenv("AUDIT_REQUEST_COLLECTION_NAME", "").strip()
GLOBAL_SETTINGS_COLLECTION_NAME = os.getenv("GLOBAL_SETTINGS_COLLECTION_NAME", "").strip()
APPLICATIONS_COLLECTION_NAME = os.getenv("APPLICATIONS_COLLECTION_NAME", "").strip()
SCHEME_DOCUMENTS_COLLECTION_NAME = os.getenv("SCHEME_DOCUMENTS_COLLECTION_NAME", "").strip()
USER_DOCUMENTS_OCR_COLLECTION_NAME = os.getenv("USER_DOCUMENTS_OCR_COLLECTION_NAME", "").strip()

# Module-level singletons
_client: Optional[MongoClient] = None
_db = None
_schemes_collection = None
_user_documents_collection = None
_users_collection = None
_audit_collection = None
_global_settings_collection = None
_applications_collection = None
_scheme_documents_collection = None
_user_documents_ocr_collection = None

def _init_client_and_collections():
    global _client, _db
    global _schemes_collection, _user_documents_collection, _users_collection
    global _audit_collection, _global_settings_collection, _applications_collection
    global _scheme_documents_collection, _user_documents_ocr_collection

    if _client is not None:
        # Already initialized
        return

    # Validate required env vars
    missing = []
    if not MONGO_URI:
        missing.append("MONGO_URI")
    if not DB_NAME:
        missing.append("DB_NAME")
    if not COLLECTION_NAME:
        missing.append("COLLECTION_NAME")
    if not USER_DOCUMENTS_COLLECTION_NAME:
        missing.append("USER_DOCUMENTS_COLLECTION_NAME")
    if not USERS_COLLECTION_NAME:
        missing.append("USERS_COLLECTION_NAME")
    if not AUDIT_COLLECTION_NAME:
        missing.append("AUDIT_REQUEST_COLLECTION_NAME")
    if not GLOBAL_SETTINGS_COLLECTION_NAME:
        missing.append("GLOBAL_SETTINGS_COLLECTION_NAME")
    if not APPLICATIONS_COLLECTION_NAME:
        missing.append("APPLICATIONS_COLLECTION_NAME")
    if not SCHEME_DOCUMENTS_COLLECTION_NAME:
        missing.append("SCHEME_DOCUMENTS_COLLECTION_NAME")
    if not USER_DOCUMENTS_OCR_COLLECTION_NAME:
        missing.append("USER_DOCUMENTS_OCR_COLLECTION_NAME")

    if missing:
        raise RuntimeError(f"Missing required environment variable(s) for MongoDB setup: {', '.join(missing)}")

    # Initialize client and db
    _client = MongoClient(MONGO_URI)
    _db = _client[DB_NAME]

    # Initialize collection handles
    _schemes_collection = _db[COLLECTION_NAME]
    _user_documents_collection = _db[USER_DOCUMENTS_COLLECTION_NAME]
    _users_collection = _db[USERS_COLLECTION_NAME]
    _audit_collection = _db[AUDIT_COLLECTION_NAME]
    _global_settings_collection = _db[GLOBAL_SETTINGS_COLLECTION_NAME]
    _applications_collection = _db[APPLICATIONS_COLLECTION_NAME]
    _scheme_documents_collection = _db[SCHEME_DOCUMENTS_COLLECTION_NAME]
    _user_documents_ocr_collection = _db[USER_DOCUMENTS_OCR_COLLECTION_NAME]

    # Test connection
    _client.admin.command('ping')
    print("Successfully connected to MongoDB!")
    _ensure_indexes()

def _ensure_indexes():
    try:
        if _schemes_collection is None or _user_documents_collection is None:
            return

        # Example: indexes for schemes collection
        _schemes_collection.create_index([("slug", ASCENDING)], unique=True, background=True)
        _schemes_collection.create_index([("schemeName", TEXT), ("schemeContent.briefDescription", TEXT)], background=True)

        # For user_documents
        _user_documents_collection.create_index([("uid", ASCENDING)], background=True)
        _user_documents_collection.create_index([("scheme_slug", ASCENDING)], background=True)

        # For users collection: OTP expiry TTL index (if applicable)
        existing = _users_collection.index_information()
        for idx_name in existing:
            if 'expires_at' in idx_name:
                try:
                    _users_collection.drop_index(idx_name)
                except Exception:
                    pass

        _users_collection.create_index(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
            background=True,
            partialFilterExpression={"otp_type": 1, "is_user_registered": 0},
            name="otp_expires_at_sms"
        )

        print("✅ MongoDB indexes ensured on startup")
    except Exception as e:
        print(f"⚠️ Error creating MongoDB indexes: {e}")

def get_db():
    """
    Returns the DB instance, initializing if needed.
    """
    _init_client_and_collections()
    return _db

def get_collection(collection: Collection):
    """
    Returns a MongoDB collection for the given enum.
    Raises if the collection isn't configured.
    """
    _init_client_and_collections()

    mapping = {
        Collection.SCHEMES: _schemes_collection,
        Collection.USER_DOCUMENTS: _user_documents_collection,
        Collection.USERS: _users_collection,
        Collection.AUDIT_REQUESTS: _audit_collection,
        Collection.GLOBAL_SETTINGS: _global_settings_collection,
        Collection.APPLICATIONS: _applications_collection,
        Collection.SCHEME_DOCUMENTS: _scheme_documents_collection,
        Collection.USER_DOCUMENTS_OCR: _user_documents_ocr_collection
    }

    coll = mapping.get(collection)
    if coll is None:
        raise RuntimeError(f"Collection for {collection} is not configured (None). Check env collection names.")
    return coll
