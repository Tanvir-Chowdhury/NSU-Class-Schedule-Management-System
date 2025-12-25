from pydantic import BaseModel
from enum import Enum
from datetime import date

class BookingStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

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

    class Config:
        from_attributes = True

