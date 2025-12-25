import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Text, Date
from sqlalchemy.orm import relationship
from core.database import Base

class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class BookingRequest(Base):
    """
    SQLAlchemy model for Booking Requests.
    Allows users to request room bookings for specific slots.
    """
    __tablename__ = "booking_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    booking_date = Column(Date, nullable=False) # Specific date for the booking
    day = Column(String, nullable=False) # Day of week (e.g., "Monday") for easier querying against schedule
    time_slot_id = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False) # Mandatory field
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)

    user = relationship("User")
    room = relationship("Room")

    def __repr__(self):
        return f"<BookingRequest(user_id={self.user_id}, room_id={self.room_id}, date={self.booking_date}, status='{self.status}')>"
