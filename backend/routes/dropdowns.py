from fastapi import APIRouter, Request
import logging
from models.models import Collection

router = APIRouter(prefix="/dropdowns", tags=["Dropdowns"])
logger = logging.getLogger(__name__)

from database.database import get_collection

@router.get("/states", summary="Fetch list of states (and UTs) with keyCode")
async def get_states_list(request: Request):
    try:
        cursor = get_collection(Collection.GLOBAL_SETTINGS).find(
            {"lkCode": "STATE_LIST"},
            {"_id": False, "keyCode": 1, "key1": 1}
        ).sort("keyCode", 1)

        result = [
            {"keyCode": doc["keyCode"], "state": doc["key1"]}
            for doc in cursor
        ]

        return {
            "status": 1,
            "message": "States list fetched successfully",
            "data": result,
            "tag": request.url.path
        }
    except Exception:
        logger.exception("Error fetching state list")
        return {
            "status": 0,
            "message": "Failed to fetch state list",
            "data": [],
            "tag": request.url.path
        }

@router.get("/genders", summary="Fetch list of genders with keyCode")
async def get_genders_list(request: Request):
    try:
        cursor = get_collection(Collection.GLOBAL_SETTINGS).find(
            {"lkCode": "GENDER_LIST"},
            {"_id": False, "keyCode": 1, "key1": 1}
        ).sort("keyCode", 1)

        result = [
            {"keyCode": doc["keyCode"], "gender": doc["key1"]}
            for doc in cursor
        ]

        return {
            "status": 1,
            "message": "Gender list fetched successfully",
            "data": result,
            "tag": request.url.path
        }
    except Exception:
        logger.exception("Error fetching gender list")
        return {
            "status": 0,
            "message": "Failed to fetch gender list",
            "data": [],
            "tag": request.url.path
        }