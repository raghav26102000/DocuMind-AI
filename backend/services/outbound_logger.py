
import os
from datetime import datetime, timezone
from database.database import get_db

AUDIT_COLL = os.getenv("AUDIT_REQUEST_COLLECTION_NAME", "AuditRequest")

def log_outbound(
    api_url: str,
    jwt_token: str | None,
    request_data: dict,
    response_data: dict | str,
    status_code: int,
    start_time: datetime,
    end_time: datetime,
):

    # Normalize both to UTC-aware
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    else:
        start_time = start_time.astimezone(timezone.utc)

    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)
    else:
        end_time = end_time.astimezone(timezone.utc)

    entry = {
        "apiUrl":       api_url,
        "jwtToken":     jwt_token,
        "requestData":  request_data,
        "responseData": response_data,
        "status":       1 if status_code < 400 else 0,
        "startTime":    start_time,
        "endTime":      end_time,
        "timeTaken":    int((end_time - start_time).total_seconds() * 1000),
        "requestType":  "OUTBOUND",
        "tag":          api_url,
        "createdOn":    datetime.now(timezone.utc)
    }

    db = get_db()
    db[AUDIT_COLL].insert_one(entry)
