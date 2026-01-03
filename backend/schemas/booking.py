from pydantic import BaseModel
from enum import Enum
from datetime import date
from typing import Optional
from schemas.academic import Room
from schemas.teacher import Teacher
from schemas.student import Student

class BookingStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class UserSummary(BaseModel):
    id: int
    email: str
    teacher_profile: Optional[Teacher] = None
    student_profile: Optional[Student] = None
    
    class Config:
        from_attributes = True

class BookingRequestBase(BaseModel):
    room_id: int
    booking_date: date
    day: str
    time_slot_id: int
    reason: str

class BookingRequestCreate(BookingRequestBase):
    pass

class BookingRequestUpdate(BaseModel):
    status: BookingStatus

class BookingRequest(BookingRequestBase):
    id: int
    user_id: int
    status: BookingStatus
    room: Optional[Room] = None
    user: Optional[UserSummary] = None

    class Config:
        from_attributes = True

