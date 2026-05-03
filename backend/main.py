from fastapi import FastAPI
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi.middleware.cors import CORSMiddleware
from fastapi_utils.tasks import repeat_every
from starlette.middleware.sessions import SessionMiddleware
import os
from datetime import datetime
from database.database import get_db

# Include routers
from routes.scheme_routes import router as scheme_router
from auth.auth_routes import router as auth_router
from routes.chatbot_routes import router as chat_router
from routes.user_document_routes import router as document_router
from routes.applications_routes import router as applications_router
from routes.dropdowns import router as dropdowns_router

# Rate limiting setup
from auth.rate_limiter import limiter
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Audit middleware
from middleware.audit import AuditMiddleware

app = FastAPI(
    title="MyScheme Backend API",
    description="API to fetch Government Scheme data from MongoDB.",
    version="0.1.0",
    root_path= "/api/master"
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost", "http://localhost:9000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "supersecret_session_key")
)

# Audit middleware
app.add_middleware(AuditMiddleware)

@app.on_event("startup")
async def startup_event():
    get_db()
    FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

    # Schedule periodic clean-up of expired OTPs
    @repeat_every(seconds=60 * 10)  # every 10 minutes
    def cleanup_expired_otps():
        from auth.auth_utils import verif_collection
        verif_collection.delete_many({"expires_at": {"$lt": datetime.utcnow()}})


app.include_router(scheme_router, tags=["Schemes"])
app.include_router(auth_router, tags=["Auth"])
app.include_router(document_router, tags=["Documents"])
app.include_router(chat_router, tags=["Chatbot"])
app.include_router(applications_router, tags=["Applications"])
app.include_router(dropdowns_router, tags=["Dropdowns"])


@app.get("/")
async def read_root():
    return {"message": "Welcome to the MyScheme Backend API! Access /docs for API documentation."}
