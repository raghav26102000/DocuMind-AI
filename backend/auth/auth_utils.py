
import os, logging, uuid
from datetime import datetime, timedelta, timezone
import secrets
from dotenv import load_dotenv
from jose import jwt, JWTError, ExpiredSignatureError
from bson.objectid import ObjectId
from argon2 import PasswordHasher
from fastapi import Depends, HTTPException#, Request, WebSocket
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Literal, Optional
from twilio.rest import Client
from services.outbound_logger import log_outbound
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from database.database import get_collection, Collection

# Load & Validate Environment
load_dotenv()

JWT_SECRET        = os.getenv("JWT_SECRET")
JWT_ALGORITHM     = os.getenv("JWT_ALGORITHM", "HS256")
TOKEN_EXPIRE_DAYS = int(os.getenv("TOKEN_EXPIRE_DAYS", "1"))
PASSWORD_PEPPER   = os.getenv("PASSWORD_PEPPER")
OTP_EXPIRY_MINUTES = 5

if not JWT_SECRET:
    raise RuntimeError("Missing JWT_SECRET env var!")
if not PASSWORD_PEPPER:
    raise RuntimeError("Missing PASSWORD_PEPPER env var!")

# Twilio senders & client
TWILIO_SMS_NUMBER       = os.getenv("TWILIO_PHONE_NUMBER")
TWILIO_WHATSAPP_NUMBER  = os.getenv("TWILIO_WHATSAPP_NUMBER")
twilio_client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
EMAIL_FROM = os.getenv("EMAIL_FROM")

# Database Collection
users_collection = get_collection(Collection.USERS)
global_settings_collection = get_collection(Collection.GLOBAL_SETTINGS)


# Argon2 Hasher Configuration
ph = PasswordHasher(
    time_cost=2,       # number of iterations
    memory_cost=2**16, # 65 536 KiB = 64 MiB
    parallelism=8      # threads
)

oauth2_scheme = HTTPBearer()

# Password Hashing & Verification
def hash_secret(password: str) -> str:
    """
    Hashes a plain-text PIN+pepper using Argon2.
    """
    return ph.hash(password + PASSWORD_PEPPER)


def verify_secret(password: str, stored_hash: str, user_id: str) -> bool:
    """
    Verifies a plain-text PIN against the stored Argon2 hash.
    If the hash parameters have been strengthened, rehash & persist automatically.
    Returns True if the PIN is correct, False otherwise.
    """
    try:
        # 1) Verify Argon2 hash
        valid = ph.verify(stored_hash, password + PASSWORD_PEPPER)
        
        # 2) Auto‑rehash if parameters changed
        if valid and ph.check_needs_rehash(stored_hash):
            new_hash = ph.hash(password + PASSWORD_PEPPER)
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"password": new_hash}}
            )
        return valid
    except Exception:
        return False

# Get Current User
async def get_current_user(
    # request: Request,
    # websocket: Optional[WebSocket] = None,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme)
) -> dict:
    
    if token:
        # Token from WebSocket query parameter
        pass
    elif credentials:
        token = credentials.credentials
    else:
        raise HTTPException(401, "Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except JWTError:
        raise HTTPException(401, "Invalid token")

    user_id = payload.get("sub")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(401, "User not found")
    return user



# OTP Generation & Storage
def generate_sms_otp() -> str:
    """Returns a zero‑padded 6‑digit string."""
    return f"{secrets.randbelow(10**6):06d}"


def get_otp_type_code(action: Literal["register","login","update_phone"]) -> int:
    """
    Fetch the keyCode from globalSettings for OTP_TYPE + action.
    Expects three documents in global_settings_collection:
      - { lkCode: "OTP_TYPE", keyCode: 1, key1: "REGISTRATION", … }
      - { lkCode: "OTP_TYPE", keyCode: 2, key1: "LOGIN", … }
      - { lkCode: "OTP_TYPE", keyCode: 3, key1: "UPDATE_PHONE", … }
    """
    setting = global_settings_collection.find_one({
        "lkCode": "OTP_TYPE",
        "key1": action.upper()
    })
    if not setting:
        raise RuntimeError(f"No OTP_TYPE setting found for action={action}")
    return setting["keyCode"]


def format_login_otp_message(otp: str, expire_mins: int) -> str:
    """
    Load the 'Login_Otp_Message' template from GlobalSettings,
    substitute {OTP} and {expireMins}, and return the final string.
    Falls back to a default if the setting is missing.
    """
    config = global_settings_collection.find_one({ "lkCode": "Login_Otp_Message" })
    template = (
        config.get("key1")
        if config and config.get("key1")
        else "Your OTP is {OTP}, valid for {expireMins} minutes."
    )
    try:
        return template.replace("{OTP}", otp).replace("{expireMins}", str(expire_mins))
    except Exception as e:
        # In case the template has unexpected placeholders
        raise HTTPException(500, f"OTP template formatting error: {e}")


# Twilio Client
def send_sms(phone: str, message: str, jwt_token: str | None = None):
    """
    Sends an SMS via Twilio, then logs an OUTBOUND audit entry 
    only if the globalSettings.lkCode == "SEND_REGISTRATION_SMS"
    has key1 == "yes".
    """

    # check global settings
    config = global_settings_collection.find_one({ "lkCode": "SEND_REGISTRATION_SMS" })
    
    # check key1
    if not config or config.get("key1", "").lower() != "yes":
        logging.getLogger(__name__).info(
            "SMS disabled by GlobalSettings (key1=%r), skipping send to %s",
            config and config.get("key1"), phone
        )
        return None
    
    # Send on both channels
    for channel, to_pref, from_pref, sender in [
        ("sms",     "",           "",                        TWILIO_SMS_NUMBER),
        ("whatsapp","whatsapp:",  "whatsapp:",               TWILIO_WHATSAPP_NUMBER),
    ]:
        payload = {"to": f"{to_pref}{phone}", "body": message}
        api_url = f"Twilio {channel.upper()} Messaging API"
        start   = datetime.now(timezone.utc)

        try:
            resp = twilio_client.messages.create(
                to   = f"{to_pref}{phone}",
                from_= f"{from_pref}{sender}",
                body = message
            )
            status, sid = resp.status, resp.sid
        except Exception as exc:
            logging.getLogger(__name__).error(
                f"Error sending {channel.upper()} OTP to {phone}: {exc}"
            )
            status, sid = "failed", None

        end = datetime.now(timezone.utc)
        log_outbound(
            api_url       = api_url,
            jwt_token     = jwt_token,
            request_data  = payload,
            response_data = {"sid": sid, "status": status},
            status_code   = 200 if status != "failed" else 500,
            start_time    = start,
            end_time      = end
        )
    
    # Email sending only during login (if user has an email)
    
    user = users_collection.find_one({ "phone": phone })
    email = user.get("email") if user else None
    if email:
        mail = Mail(
            from_email=EMAIL_FROM,
            to_emails=email,
            subject="Your OTP for MyScheme Login",
            plain_text_content=message
        )
        try:
            response = sg.send(mail)
            log_outbound(
                api_url       = "SendGrid Mail Send API",
                jwt_token     = jwt_token,
                request_data  = payload,
                response_data = {"sid": sid, "status": status},
                status_code   = response.status_code,
                start_time    = start,
                end_time      = end
            )
        except Exception as exc:
            logging.getLogger(__name__).error("SendGrid error: %s", exc)


def store_otp(phone: str, otp: str, action: Literal["register","login","update_phone"], email: str = None):
    """
    For registration: insert a new SMS doc (is_user_registered=0).
    For login: update the existing user record with OTP fields (is_user_registered=1).
    """
    now = datetime.now(timezone.utc)
    otp_type_code = get_otp_type_code(action)

    otp_payload = {
        "otp": otp,
        "otp_type": otp_type_code,
        "used": False,
        "requested_at": now,
        "resend_count": 0,
        "expires_at": now + timedelta(minutes=OTP_EXPIRY_MINUTES),
        "is_user_registered": 1 if action in ("login","update_phone") else 0
    }

    if action == "login":
        # Attach OTP data to the existing, registered user document
        result = users_collection.update_one(
            {"phone": phone, "is_user_registered": 1},
            {"$set": otp_payload}
        )
        if result.matched_count == 0:
            # no such user to send OTP to
            raise HTTPException(404, "Phone number not found for login.")
        
    elif action == "update_phone":
        # First try by phone (if changing to a NEW phone, may not exist!),
        # so look up by email when phone is not yet assigned.
        update_query = {"is_user_registered": 1}
        if users_collection.find_one({"phone": phone, "is_user_registered": 1}):
            update_query["phone"] = phone
        elif email:
            update_query["email"] = email
        else:
            raise HTTPException(404, "User document not found for update_phone with either phone or email.")

        result = users_collection.update_one(
            update_query,
            {"$set": otp_payload}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "User document not found for update_phone.")
    else:
        # registration flow still uses a separate OTP doc
        doc = {"phone": phone, **otp_payload}
        users_collection.insert_one(doc)


def verify_otp(
    phone: str, 
    otp: str, 
    is_user_registered: int, 
    action: Literal["register","login","update_phone"],
    email: str = None
    ) -> bool:
    now = datetime.now(timezone.utc)
    query = {
        "phone": phone, 
        "otp": otp, 
        "otp_type": get_otp_type_code(action), 
        "used": False, 
        "expires_at": {"$gt": now},
        "is_user_registered": is_user_registered
    }
    v = users_collection.find_one_and_update(query, {"$set": {"used": True}})
    if v is not None:
        return True

    # Fallback for update_phone+email only -- query is always defined!
    if action == "update_phone" and email:
        query_email = query.copy()
        query_email.pop("phone")
        query_email["email"] = email
        v = users_collection.find_one_and_update(query_email, {"$set": {"used": True}})
        if v is not None:
            return True

    return False




def resend_otp(phone: str, action: Literal["register","login","update_phone"],
               cooldown_sec: int, max_resends: int, for_user_id: ObjectId = None) -> str:
    now = datetime.now(timezone.utc)
    otp_type_code = get_otp_type_code(action)

    # Primary: search by phone
    query = {
        "phone": phone,
        "otp_type": otp_type_code,
        "is_user_registered": 1 if action in ("login", "update_phone") else 0
    }
    doc = users_collection.find_one(query, sort=[("requested_at", -1)])

    # If not found and update_phone with for_user_id, try fallback
    if not doc and action == "update_phone" and for_user_id:
        doc = users_collection.find_one({
            "for_user_id": for_user_id,
            "otp_type": otp_type_code,
            "is_user_registered": 1
        }, sort=[("requested_at", -1)])

    # Cooldown & resend-limit checks
    if doc:
        elapsed = (now - doc["requested_at"]).total_seconds()
        if elapsed < cooldown_sec:
            raise HTTPException(429, f"Wait {int(cooldown_sec - elapsed)}s before resending OTP.")
        if doc.get("resend_count", 0) >= max_resends:
            raise HTTPException(429, "Resend limit reached; please try later.")

    new_otp = generate_sms_otp()

    if doc:
        users_collection.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "otp": new_otp,
                    "requested_at": now,
                    "expires_at": now + timedelta(minutes=OTP_EXPIRY_MINUTES)
                },
                "$inc": {"resend_count": 1}
            }
        )
    else:
        store_otp(phone, new_otp, action)

    return new_otp


# JWT Token Utilities
def create_jwt_token(user_id: str) -> str:
    """
    Creates a signed JWT access token with a subject and expiry.
    """
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=TOKEN_EXPIRE_DAYS),
        "jti": jti
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    

# User Lookup Helpers
def get_user_by_identifier(email_phone_username: str) -> dict | None:
    """
    Fetch a user by phone or username.
    """
    return users_collection.find_one({
        "$or": [
            {"phone": email_phone_username},
            # {"username": email_phone_username},
            {"email": email_phone_username}
        ]
    })


def get_user_by_id(user_id: str) -> dict | None:
    """
    Fetch a user by their ObjectId string.
    """
    return users_collection.find_one({"_id": ObjectId(user_id)})


def create_or_get_user(user_info: dict) -> dict:
    email = user_info.get("email")
    user = users_collection.find_one({"email": email})
    if user:
        return user
    # create new user from Google profile
    new = users_collection.insert_one({
        "email": email,
        "full_name": user_info.get("name"),
        "google_sub": user_info.get("sub"),
        "registered_on": datetime.now(timezone.utc),
        # We may add phone/dob later according to the requirements
    })
    return users_collection.find_one({"_id": new.inserted_id})


def serialize_for_response(d):
    serialized = {}
    for k, v in d.items():
        if isinstance(v, ObjectId):
            serialized[k] = str(v)
        else:
            serialized[k] = v
    return serialized
