from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.STUDENT
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    verification_code: Optional[str] = None

    @field_validator('email')
    def validate_email_domain(cls, v):
        if not v.endswith('@northsouth.edu'):
            raise ValueError('Email must belong to the northsouth.edu domain')
        return v

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserProfile(UserBase):
    id: int
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
