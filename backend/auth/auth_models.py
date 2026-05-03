
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Literal, Optional
from datetime import date, datetime

# OTP Request Model 
class OTPRequest(BaseModel):
    phone: str = Field(
        ...,
        pattern=r"^\+\d{1,3}\d{10,14}$",
        description="Phone number with country code (e.g. +919988877766)"
    )
    action: Literal["register","login","update_phone"] = Field(
        ...,
        description="Whether this OTP is for new‑user registration or login"
    )
    email: Optional[str] = None

class OTPConfirmRequest(BaseModel):
    phone: str = Field(
        ...,
        pattern=r"^\+\d{1,3}\d{10,14}$",
        description="Phone number with country code (e.g. +919988877766)"
    )
    otp:   str = Field(..., min_length=6, max_length=6, description="6‑digit SMS OTP")
    email: Optional[str] = None

# Register & Login Request Models 
class RegisterRequest(BaseModel):
    """
    Payload for user registration.
    """
    phone: str = Field(
        ...,
        pattern=r"^\+\d{1,3}\d{10,14}$",
        description="Phone number with country code (e.g. +919988877766)"
    )
    password: str = Field(
        ...,
        min_length=4, 
        max_length=6, 
        description="4-6 digit PIN"
    )
    full_name: str = Field(
        ..., 
        min_length=2, 
        description="Full name, at least 2 characters"
    )
    dob: date = Field(
        ..., 
        description="Date of birth in DD-MM-YYYY format"
    )
    gender: str = Field(
        ..., 
        pattern=r"^(Male|Female|Other)$", 
        description="Gender: 'Male', 'Female', or 'Others'"
    )
    username: str = Field(
        ..., 
        min_length=3, 
        max_length=30, 
        pattern=r"^[a-zA-Z0-9_]+$", 
        description="Username (3-30 chars, alphanumeric or underscore)"
    )
    email: EmailStr = Field(
        ..., 
        description="Valid email address"
    )
    state: str = Field(
        ...,
        description="State of the user"
    )
    address: Optional[str] = Field(
        None,
        description="Optional address of the user"
    )

    @field_validator("dob", mode="before")
    @classmethod
    def parse_dob(cls, v):
        if isinstance(v, str):
            try:
                # parse DD-MM-YYYY into a date
                return datetime.strptime(v, "%d-%m-%Y").date()
            except ValueError:
                raise ValueError("Invalid dob format; expected DD-MM-YYYY")
        return v


class LoginRequest(BaseModel):
    """
    Payload for user login.
    """
    email_phone_username: str = Field(
        ..., 
        description="Phone number, username or email"
    )
    password: str = Field(
        ..., 
        description="User's password"
    )


# Token Response Model
class TokenResponse(BaseModel):
    """
    Response containing the JWT access token.
    """
    access_token: str = Field(
        ..., 
        description="JWT access token"
    )
    token_type: str = Field(
        "bearer", 
        description="Token type (always 'bearer')"
    )

# Models for PIN Reset
class PinResetRequest(BaseModel):
    phone: str = Field(
        ...,
        pattern=r"^\+\d{1,3}\d{10,14}$",
        description="Phone number with country code"
    )

class PinUpdateRequest(BaseModel):
    phone: str = Field(
        ...,
        pattern=r"^\+\d{1,3}\d{10,14}$",
        description="Phone number with country code"
    )
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")
    new_pin: str = Field(
        ...,
        min_length=4,
        max_length=6,
        description="New 4-6 digit PIN"
    )


class UpdateProfileRequest(BaseModel):
    phone: Optional[str] = Field(
        None,
        pattern=r"^\+\d{1,3}\d{10,14}$",
        description="Phone number with country code (e.g. +919988877766)"
    )
    full_name: Optional[str] = Field(
        None,
        min_length=2,
        description="Full name, at least 2 characters"
    )
    dob: Optional[date] = Field(
        None,
        description="Date of birth in DD-MM-YYYY format"
    )
    gender: Optional[str] = Field(
        None,
        pattern=r"^(Male|Female|Other)$",
        description="Gender: 'Male', 'Female', or 'Other'"
    )
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Username (3-30 chars, alphanumeric or underscore)"
    )
    state: Optional[str] = Field(
        None,
        description="State of the user"
    )
    address: Optional[str] = Field(
        None,
        description="Optional address of the user"
    )

    @field_validator("dob", mode="before")
    @classmethod
    def parse_dob(cls, v):
        if isinstance(v, str):
            try:
                # parse DD-MM-YYYY into a date
                return datetime.strptime(v, "%d-%m-%Y").date()
            except ValueError:
                raise ValueError("Invalid dob format; expected DD-MM-YYYY")
        return v

