from authlib.integrations.starlette_client import OAuth
import os

oauth = OAuth()

# Register Google OAuth client with proper configuration
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
        # Force the response to include id_token
        "response_type": "code",
        # Ensure we get refresh token for long-term access
        "access_type": "offline",
        # Force consent screen to ensure we get all required info
        "prompt": "consent"
    },
)