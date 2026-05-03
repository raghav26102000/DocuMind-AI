from fastapi import APIRouter, HTTPException, status, Depends, Request, Body
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse, JSONResponse
import os, logging
from bson import ObjectId
from jose import jwt, JWTError
from urllib.parse import urlencode
from datetime import datetime, timezone, date
from pymongo import ReturnDocument

from .auth_models import (
    RegisterRequest, LoginRequest, PinUpdateRequest,
    OTPRequest, OTPConfirmRequest, PinResetRequest,
    UpdateProfileRequest
)
from .auth_utils import (
    hash_secret, verify_secret, create_jwt_token, send_sms,
    get_user_by_identifier, users_collection,
    generate_sms_otp, store_otp, verify_otp, resend_otp,
    OTP_EXPIRY_MINUTES, create_or_get_user, get_current_user,
    JWT_SECRET,JWT_ALGORITHM, oauth2_scheme , format_login_otp_message,
    serialize_for_response, get_otp_type_code
)

from .google_oauth import oauth
from .rate_limiter import limiter

# Import outbound logger
from services.outbound_logger import log_outbound


# Router Setup 
router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

# Protected Endpoint
@router.get("/protected-endpoint")
async def protected(user_id: str = Depends(get_current_user)):
    return {"hello": f"user {user_id}"}


# Send SMS OTP for Register or Login
@router.post(
    "/otp", 
    summary="Send OTP for register or login"
)
@limiter.limit("3/minute")
async def send_otp(request: Request, req: OTPRequest):
    """
    - Sends an SMS OTP for register or login
    - OTP expires in 15 minutes
    """
    # check for phone number in users collection
    if req.action == "register" and users_collection.find_one({"phone": req.phone}):
        raise HTTPException(409, "Phone number already registered.")
    if req.action == "login" and not users_collection.find_one({"phone": req.phone}):
        raise HTTPException(404, "Phone number not found.")
    if req.action == "update_phone" and users_collection.find_one({"phone": req.phone, "is_user_registered": 1}):
        raise HTTPException(409, "Phone number already in use by another user.")

    # For update_phone, get current user's email if not provided
    user_email = req.email
    if req.action == "update_phone" and not user_email:
        try:
            current_user = await get_current_user(request)  # fetch from JWT, or get from your session/context
            user_email = current_user.get("email")
        except Exception:
            raise HTTPException(400, "Unable to identify user for phone update OTP. Make sure the user is logged in.")

    # generate & store OTP
    otp = generate_sms_otp()
    store_otp(req.phone, otp, req.action, email=user_email if req.action == "update_phone" else None)

    jwt_token = request.headers.get("Authorization")

    if req.action == "login":
        msg = format_login_otp_message(otp, OTP_EXPIRY_MINUTES)
    elif req.action == "update_phone":
        msg = f"Your MyScheme OTP to update phone number is {otp}"
    else:
        msg = f"Your MyScheme {req.action} OTP is {otp}"
    
    send_sms(req.phone, msg, jwt_token) 
    return {
        "status": 1,
        "message": f"OTP sent for {req.action}, valid for {OTP_EXPIRY_MINUTES} minutes.",
        "data": {"next": "verify_sms_otp"},
        "tag": request.url.path
    }

@router.post(
    "/otp/resend", 
    summary="Resend OTP for register or login"
)
async def otp_resend(request: Request, req: OTPRequest):
    """
    - Resends an SMS OTP for register or login
    - OTP expires in 5 minutes
    """
    otp = resend_otp(req.phone, req.action, cooldown_sec=30, max_resends=3)
    jwt_token = request.headers.get("Authorization")

    if req.action == "login":
        msg = format_login_otp_message(otp, OTP_EXPIRY_MINUTES)
    elif req.action == "update_phone":
        msg = f"Your MyScheme OTP to update phone number is {otp}"
    else:
        msg = f"Your MyScheme {req.action} OTP is {otp}"
    
    send_sms(req.phone, msg, jwt_token)
    return {
        "status": 1,
        "message": "OTP resent",
        "data": {"next": "verify_sms_otp"},
        "tag": request.url.path
    }



# Verify SMS OTP 
@router.post(
    "/otp/verify",
    summary="Verify SMS OTP without login or register",
)
@limiter.limit("5/minute")
async def verify_only_otp(request: Request, payload: OTPConfirmRequest):
    """
    Standalone OTP verification. Returns success if OTP is valid.
    Useful for front-end 'Verify OTP' step.
    """
    ok = (
        verify_otp(payload.phone, payload.otp, is_user_registered=0, action="register")\
            or verify_otp(payload.phone, payload.otp, is_user_registered=1, action="login")
    )

    # For update_phone, check by phone OR by email (if provided)
    if not ok:
        ok = verify_otp(
            payload.phone, payload.otp,
            is_user_registered=1,
            action="update_phone",
            email=payload.email
        ) if payload.email else verify_otp(
            payload.phone, payload.otp,
            is_user_registered=1,
            action="update_phone"
        )

    if ok:
        return {
            "status": 1,
            "message": "OTP is valid.",
            "data": {},
            "tag": request.url.path
        }
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired OTP.")



# User Registration Endpoint 
@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(request: Request, payload: RegisterRequest):
    """
    - Checks for existing phone/username
    - Hashes PIN with Argon2+pepper
    - Inserts user into MongoDB with `registered_on` timestamp
    """

    try:
        now = datetime.now(timezone.utc)

        otp_doc = users_collection.find_one({
            "phone": payload.phone,
            "otp_type": 1,
            "used": True,
            "expires_at": {"$gt": now},
            "is_user_registered": 0
        })
        if not otp_doc:
            raise HTTPException(400, "OTP invalid or already used or user already registered.")
        
        # Extract the ObjectId of the initial OTP document
        document_id = otp_doc["_id"]

        verif = users_collection.find_one_and_update(
            {
                "_id": document_id
            },
            {
                "$set": {
                    "status":1,
                    "password": hash_secret(payload.password),
                    "full_name": payload.full_name,
                    "dob": payload.dob.isoformat(),
                    "gender": payload.gender,
                    "username": payload.username,
                    "state": payload.state,
                    "email": payload.email,
                    "address": payload.address,
                    "registered_on": now,
                    "createdOn": now,  
                    "createdBy": document_id,                    
                    "lastModifiedOn": now,
                    "lastModifiedBy": document_id,
                    "last_active": now,
                    "is_user_registered": 1
                }
            },
            return_document=ReturnDocument.AFTER
        )
        if not verif:
            raise HTTPException(400, "OTP invalid or already used or user already registered.")

        # Check for username/email uniqueness
        if users_collection.count_documents({"username": payload.username, "is_user_registered": 1, "_id": {"$ne": verif["_id"]}}):
            raise HTTPException(409, "Username already taken.")
        if users_collection.count_documents({"email": payload.email, "is_user_registered": 1, "_id": {"$ne": verif["_id"]}}):
            raise HTTPException(409, "Email already registered.")

        # Clean up OTP fields after registration
        users_collection.update_one(
            {"_id": document_id},
            {"$unset": {
                "otp": "", "otp_type": "", "used": "", "expires_at": "", "requested_at": "", "resend_count": ""
            }}
        )

        return {
            "status": 1,
            "message": "Registration successful",
            "data": {"user_id": str(verif["_id"])},
            "tag": request.url.path
        }
    except Exception as e:
        logging.getLogger(__name__).exception(f"Error during registration: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Database error: {e}")
    

# User Login with PIN Endpoint
@router.post(
    "/login",
    summary="Log in an existing user"
)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest):
    """
    - Retrieves user by phone or username
    - Verifies PIN and auto-rehashes if needed
    - Returns a JWT access token
    """
    user = get_user_by_identifier(payload.email_phone_username)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid identifier or PIN.")
    if "password" not in user:
        raise HTTPException(400, "User registered via social login; please reset PIN or use Google login.")

    user_id = str(user["_id"])
    stored_hash = user["password"]

    if not verify_secret(payload.password, stored_hash, user_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid identifier or PIN.")

    try:
        token = create_jwt_token(user_id)

        now = datetime.now(timezone.utc)
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_active": now}}
        )

        return {
            "status": 1,
            "message": "Login successful",
            "data": {"access_token": token, "token_type": "bearer"},
            "tag": request.url.path
        }
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Token generation failed: {e}")


# Login via OTP
@router.post(
    "/login/confirm-otp", 
    summary="Login via SMS OTP"
)
@limiter.limit("5/minute")
async def login_via_otp(request: Request, body: OTPConfirmRequest):

    user = get_user_by_identifier(body.phone)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid identifier or PIN.")
    if not verify_otp(body.phone, body.otp, is_user_registered=1):
        raise HTTPException(400, "Invalid or expired OTP.")
    
    user_id = str(user["_id"])

    # fetch the real user (skip any SMS docs)
    user = users_collection.find_one({
        "phone": body.phone,
        "is_user_registered": 1
    })
    if not user:
        raise HTTPException(404, "User not found.")

    try:
        token = create_jwt_token(user_id)

        now = datetime.now(timezone.utc)
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_active": now}}
        )

        # Clean up OTP fields after sucessfull login
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$unset": {
                "otp": "", "otp_type": "", "used": "", "expires_at": "", "requested_at": "", "resend_count": ""
            }}
        )

        return {
            "status": 1,
            "message": "Login successful",
            "data": {"access_token": token, "token_type": "bearer"},
            "tag": request.url.path
        }
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Token generation failed: {e}")


# Login via Google
@router.get("/google/login")
async def login_via_google(request: Request):
    redirect_uri = request.url_for("auth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def auth_google_callback(request: Request):
    """
    OAuth2 callback endpoint for Google login.
    - Exchanges authorization code for tokens.
    - Attempts to extract user info.
    - Creates or retrieves a user in our DB.
    - Generates our own JWT.
    - Redirects back to frontend with app JWT and user info via URL params.
    """

    logger = logging.getLogger(__name__)
    
    start = datetime.now(timezone.utc)

    # Step 1: Exchange code for Google tokens
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        logger.exception("OAuth token exchange failed")
        error_url = (
            f"{os.getenv('FRONTEND_BASE_URL')}/login?error=oauth_failed"
        )
        return RedirectResponse(url=error_url)
    end = datetime.now(timezone.utc)
    # Audit the token‐exchange outbound call
    log_outbound(
        api_url="https://oauth2.googleapis.com/token",
        jwt_token=None,
        request_data={"code": request.query_params.get("code")},
        response_data=token,
        status_code=200,
        start_time=start,
        end_time=end
    )

    user_info = None

    # Step 2a: Try id_token parsing if present
    if token.get("id_token"):
        try:
            user_info = await oauth.google.parse_id_token(request, token)
        except Exception as e:
            logger.warning("id_token parsing failed: %s", e)

    # Step 2b: Fall back to userinfo endpoint
    if not user_info:
        start = datetime.now(timezone.utc)
        try:
            resp = await oauth.google.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                token=token
            )
            resp.raise_for_status()
            user_info = resp.json()
        except Exception as e:
            logger.warning("Fetching userinfo endpoint failed: %s", e)
        end = datetime.now(timezone.utc)
        # Audit the userinfo‐fetch outbound call
        log_outbound(
            api_url="https://www.googleapis.com/oauth2/v2/userinfo",
            jwt_token=None,
            request_data={},
            response_data=(user_info or {"error": "fetch_failed"}),
            status_code=(resp.status_code if 'resp' in locals() else 500),
            start_time=start,
            end_time=end
        )

    # Step 2c: Final fallback using get_user_info()
    if not user_info:
        try:
            user_info = await oauth.google.get_user_info(token)
        except Exception as e:
            logger.warning("Fallback get_user_info failed: %s", e)

    # Step 3: Validate retrieved user info
    if not user_info or not user_info.get("email"):
        logger.error("Google user info incomplete: %s", user_info)
        error_url = (
            f"{os.getenv('FRONTEND_BASE_URL')}/login?error=oauth_failed"
        )
        return RedirectResponse(url=error_url)

    # Step 4: Create or retrieve user in our DB
    try:
        user = create_or_get_user(user_info)
        app_jwt = create_jwt_token(str(user["_id"]))

        now = datetime.now(timezone.utc)
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "status":1,
                "createdOn": now,  
                "createdBy": user["_id"],                    
                "lastModifiedOn": now,
                "lastModifiedBy": user["_id"],
                "last_active": now,
                "is_user_registered": 1
            }}
        )

    except Exception as e:
        logger.exception("Failed to create/retrieve user from DB")
        error_url = (
            f"{os.getenv('FRONTEND_BASE_URL')}/login?error=user_error"
        )
        return RedirectResponse(url=error_url)

    # Step 5: Build redirect URL with encoded params
    params = {
        "token": app_jwt,
        "email": user_info["email"],
        "name": user_info.get("name", "")
    }
    base = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
    redirect_url = f"{base}/api/auth/success?{urlencode(params)}"

    return RedirectResponse(url=redirect_url)


@router.post("/forgot-pin", summary="Send OTP to reset PIN")
async def forgot_pin(req: PinResetRequest, request: Request):
    user = users_collection.find_one({"phone": req.phone, "is_user_registered": 1})
    if not user:
        raise HTTPException(404, "Phone number not registered.")
    otp = generate_sms_otp()
    # Using same action="login" for forgot pin
    store_otp(req.phone, otp, action="login")

    jwt_token = request.headers.get("Authorization")
    send_sms(req.phone, f"Your MyScheme PIN reset OTP is {otp}", jwt_token)

    return {
        "status": 1,
        "message": "OTP sent for PIN reset",
        "data": {"next": "reset-pin"},
        "tag": request.url.path
    }


@router.post("/reset-pin", summary="Reset PIN using OTP")
async def reset_pin(payload: PinUpdateRequest, request: Request):
    if not verify_otp(payload.phone, payload.otp, is_user_registered=1):
        raise HTTPException(400, "Invalid or expired OTP.")
    new_hash = hash_secret(payload.new_pin)
    result = users_collection.update_one(
        {"phone": payload.phone},
        {"$set": {"password": new_hash}}
    )
    if not result.matched_count:
        raise HTTPException(404, "User not found.")
    return {
        "status": 1,
        "message": "PIN reset successful.",
        "data": {},
        "tag": request.url.path
    }


# Logout Endpoint
@router.post("/logout", summary="Logout – revoke current access token")
@limiter.limit("5/minute")
async def logout(request: Request,credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)):

    logger = logging.getLogger(__name__)

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Invalid token.")

    jti = payload.get("jti")

    logger.info("User %s logged out (jti=%s)", payload.get("sub"), jti)
    return {
        "status": 1,
        "message": "Logout successful.",
        "data": {},
        "tag": request.url.path
    }

@router.post("/profile",summary="Get current user profile")
async def get_profile(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Returns user profile details in a standardized format.
    """
    try:
        user_profile = {
            "user_id": str(current_user.get("_id")),
            "phone": current_user.get("phone"),
            "username": current_user.get("username"),
            "email": current_user.get("email"),
            "full_name": current_user.get("full_name"),
            "dob": current_user.get("dob"),
            "gender": current_user.get("gender"),
            "state": current_user.get("state"),
            "address": current_user.get("address"),
            "registered_on": current_user.get("registered_on")
        }
        return {
            "status": 1,
            "message": "Profile fetched successfully",
            "data": user_profile,
            "tag": request.url.path
        }

    except Exception as exc:
        msg = exc.detail if isinstance(exc, HTTPException) else "Internal server error"
        code = exc.status_code if isinstance(exc, HTTPException) else status.HTTP_500_INTERNAL_SERVER_ERROR
        logger.exception("Error in profile endpoint")
        return JSONResponse(
            status_code=code,
            content={
                "status": 0,
                "message": msg,
                "data": {},
                "tag": request.url.path
            }
        )


@router.post("/profile/update", summary="Update user profile")
async def update_profile(
    payload: UpdateProfileRequest = Body(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Allows users, including social users without a phone, to update profile.
    - Cannot modify email or registered_on
    - For adding a phone (only if none exists), OTP must be verified via identity, not by phone alone.
    """
    try:
        user_id = ObjectId(current_user["_id"])

        # Prevent modification of immutable fields
        for forbidden in ["email", "registered_on"]:
            if getattr(payload, forbidden, None) is not None:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{forbidden.replace('_',' ').title()} cannot be updated.")

        update_fields = {k: v for k, v in payload.dict().items() if v is not None}

        # Standardize date-of-birth format
        if "dob" in update_fields and isinstance(update_fields["dob"], date):
            update_fields["dob"] = update_fields["dob"].strftime("%Y-%m-%d")

        # Handle adding a new phone
        if "phone" in update_fields:
            # a) disallow changing existing numbers
            if current_user.get("phone"):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Phone number already exists and cannot be changed.")

            new_phone = update_fields["phone"]

            # b) ensure number isn't used by another
            conflict = users_collection.find_one({
                "phone": new_phone,
                "is_user_registered": 1,
                "_id": {"$ne": user_id}
            })
            if conflict:
                raise HTTPException(status.HTTP_409_CONFLICT, "Phone number already in use by another registered user.")

            # c) validate OTP via identity (user document), not phone
            now = datetime.now(timezone.utc)
            otp_type_code = get_otp_type_code("update_phone")

            otp_verified = users_collection.find_one({
                "_id": user_id,
                "otp_type": otp_type_code,
                "used": True,
                "expires_at": {"$gt": now},
                "is_user_registered": 1
            })
            if not otp_verified:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Phone number must be OTP-verified before updating profile.")

        # Make sure there are fields to update
        if not update_fields:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No updatable fields provided.")

        # Detect no-op updates
        if all(current_user.get(k) == v for k, v in update_fields.items()):
            return {"status": 1, "message": "No changes detected.", "data": {}, "tag": request.url.path}

        # Apply updates, include metadata
        now = datetime.now(timezone.utc)
        update_fields["lastModifiedOn"] = now
        update_fields["lastModifiedBy"] = user_id
        result = users_collection.update_one(
            {"_id": user_id, "is_user_registered": 1},
            {"$set": update_fields}
        )
        if not result.modified_count:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Database update failed (no changes applied).")

        # Clean up OTP fields
        users_collection.update_one(
            {"_id": user_id},
            {"$unset": {
                "otp": "", "otp_type": "", "used": "", "expires_at": "", "requested_at": "", "resend_count": ""
            }}
        )

        # Return only changed fields to client
        return {
            "status": 1,
            "message": "Profile updated successfully.",
            "data": serialize_for_response(update_fields),
            "tag": request.url.path
        }

    except HTTPException:
        raise
    except Exception as exc:
        logging.getLogger(__name__).exception(f"Error in update profile: {exc}")
        return JSONResponse({
            "status": 0,
            "message": "Internal server error",
            "data": {},
            "tag": request.url.path
        }, status_code=500)
