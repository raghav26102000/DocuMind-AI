
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["10/minute"],        # Global limit per IP
    application_limits=["100/hour"]      # App‑wide limit
)
