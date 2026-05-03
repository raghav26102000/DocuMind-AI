
import json, os, time, asyncio
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from database.database import get_db 

AUDIT_COLL = os.getenv("AUDIT_REQUEST_COLLECTION_NAME", "AuditRequest")

class AsyncIteratorWrapper:
    def __init__(self, parts: list[bytes]):
        self._iter = iter(parts)
    def __aiter__(self):
        return self
    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1) Capture start
        start_ts = time.time()
        start_dt = datetime.utcnow()

        # 2) Read body if JSON
        try:
            req_body = await request.json()
        except:
            req_body = {}

        # 3) Call downstream
        response = await call_next(request)

        # 4) Re‑buffer response body so client still gets it
        parts = [chunk async for chunk in response.body_iterator]
        response.body_iterator = AsyncIteratorWrapper(parts)
        try:
            resp_body = json.loads(b"".join(parts))
        except:
            resp_body = b"".join(parts).decode(errors="ignore")

        end_ts = time.time()
        end_dt = datetime.utcnow()

        # 5) Build audit doc
        audit_doc = {
            "apiUrl":       str(request.url),
            "jwtToken":     request.headers.get("authorization"),
            "requestData":  req_body,
            "responseData": resp_body,
            "status":       1 if response.status_code < 400 else 0,
            "startTime":    start_dt,
            "endTime":      end_dt,
            "timeTaken":    int((end_ts - start_ts) * 1000),
            "requestType":  "INBOUND",
            "tag":          request.url.path,
            "createdOn":    datetime.utcnow()
        }

        # 6) Offload insert to threadpool: fire‑and‑forget
        loop = asyncio.get_running_loop()
        db = get_db()
        coll = db[AUDIT_COLL]
        loop.run_in_executor(
            None,
            lambda doc=audit_doc: coll.insert_one(doc)
        )

        return response
