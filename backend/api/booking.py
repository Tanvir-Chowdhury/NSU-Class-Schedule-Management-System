from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date

from core.database import get_db
from core.security import get_current_active_user, get_admin_user
from models.booking import BookingRequest, BookingStatus
from models.schedule import ClassSchedule
from models.academic import Room, ClassType
from models.user import User
from schemas.booking import BookingRequestCreate, BookingRequest as BookingRequestSchema, BookingRequestUpdate

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)

@router.get("/availability")
def check_availability(
    booking_date: date,
    time_slot_id: int,
    room_type: Optional[ClassType] = None,
    db: Session = Depends(get_db)
):
    """
    Check room availability for a specific date and time slot.
    Returns a list of rooms with their status (AVAILABLE, OCCUPIED).
    """
    # Get day of week from date (e.g., "Monday")
    day_of_week = booking_date.strftime("%A")
    
    # Get all rooms (optionally filtered by type)
    query = db.query(Room)
    if room_type:
        query = query.filter(Room.type == room_type)
    rooms = query.all()
    
    results = []
    for room in rooms:
        status = "AVAILABLE"
        reason = None
        
        # Check ClassSchedule (Recurring)
        # Handle patterns: ST (Sun/Tue), MW (Mon/Wed), RA (Thu/Sat)
        pattern_match = None
        if day_of_week in ['Sunday', 'Tuesday']:
            pattern_match = 'ST'
        elif day_of_week in ['Monday', 'Wednesday']:
            pattern_match = 'MW'
        elif day_of_week in ['Thursday', 'Saturday']:
            pattern_match = 'RA'

        schedule_query = db.query(ClassSchedule).filter(
            ClassSchedule.room_id == room.id,
            ClassSchedule.time_slot_id == time_slot_id
        )

        if pattern_match:
            schedule_query = schedule_query.filter(
                or_(ClassSchedule.day == day_of_week, ClassSchedule.day == pattern_match)
            )
        else:
            schedule_query = schedule_query.filter(ClassSchedule.day == day_of_week)

        class_schedule = schedule_query.first()
        
        if class_schedule:
            status = "OCCUPIED"
            reason = "Class Scheduled"
        else:
            # Check BookingRequests (Specific Date)
            # Check for APPROVED or PENDING requests
            booking_request = db.query(BookingRequest).filter(
                BookingRequest.room_id == room.id,
                BookingRequest.booking_date == booking_date,
                BookingRequest.time_slot_id == time_slot_id,
                or_(
                    BookingRequest.status == BookingStatus.APPROVED,
                    BookingRequest.status == BookingStatus.PENDING
                )
            ).first()
            
            if booking_request:
                if booking_request.status == BookingStatus.APPROVED:
                    status = "OCCUPIED"
                    reason = "Booked"
                else:
                    status = "PENDING"
                    reason = "Pending Request"
        
        results.append({
            "id": room.id,
            "room_number": room.room_number,
            "type": room.type,
            "capacity": room.capacity,
            "status": status,
            "reason": reason
        })
        
    return results

@router.post("/request", response_model=BookingRequestSchema)
def create_booking_request(
    booking: BookingRequestCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new booking request.
    - Validates that the room is empty in ClassSchedule.
    - Reason is mandatory.
    - Status defaults to PENDING.
    """
    if not booking.reason.strip():
        raise HTTPException(status_code=400, detail="Reason is mandatory for booking requests.")

    # Check if the slot is already occupied in ClassSchedule
    # Note: This check includes Friday bookings if they exist in ClassSchedule
    conflict = db.query(ClassSchedule).filter(
        ClassSchedule.room_id == booking.room_id,
        ClassSchedule.day == booking.day,
        ClassSchedule.time_slot_id == booking.time_slot_id
    ).first()

    if conflict:
        raise HTTPException(status_code=400, detail="Room is already occupied by a class at this time.")

    # Check if there is already an approved or pending booking for this slot
    existing_booking = db.query(BookingRequest).filter(
        BookingRequest.room_id == booking.room_id,
        BookingRequest.booking_date == booking.booking_date,
        BookingRequest.time_slot_id == booking.time_slot_id,
        or_(
            BookingRequest.status == BookingStatus.APPROVED,
            BookingRequest.status == BookingStatus.PENDING
        )
    ).first()

    if existing_booking:
        raise HTTPException(status_code=400, detail="Room is already booked or has a pending request at this time.")

    new_booking = BookingRequest(
        user_id=current_user.id,
        room_id=booking.room_id,
        booking_date=booking.booking_date,
        day=booking.day,
        time_slot_id=booking.time_slot_id,
        reason=booking.reason,
        status=BookingStatus.PENDING
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

@router.get("/my-requests", response_model=List[BookingRequestSchema])
def read_my_bookings(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all booking requests for the current user.
    """
    return db.query(BookingRequest).filter(BookingRequest.user_id == current_user.id).all()

# --- Admin Endpoints ---

@router.get("/admin/requests", response_model=List[BookingRequestSchema], dependencies=[Depends(get_admin_user)])
def read_all_bookings(db: Session = Depends(get_db)):
    """
    Admin: Get all booking requests.
    """
    return db.query(BookingRequest).all()

@router.put("/admin/requests/{booking_id}", response_model=BookingRequestSchema, dependencies=[Depends(get_admin_user)])
def update_booking_status(
    booking_id: int, 
    booking_update: BookingRequestUpdate, 
    db: Session = Depends(get_db)
):
    """
    Admin: Approve or Reject a booking request.
    """
    db_booking = db.query(BookingRequest).filter(BookingRequest.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking request not found")
    
    # If approving, double check for conflicts again
    if booking_update.status == BookingStatus.APPROVED:
        conflict = db.query(ClassSchedule).filter(
            ClassSchedule.room_id == db_booking.room_id,
            ClassSchedule.day == db_booking.day,
            ClassSchedule.time_slot_id == db_booking.time_slot_id
        ).first()
        if conflict:
             raise HTTPException(status_code=400, detail="Cannot approve: Room is occupied by a class.")
             
        existing_booking = db.query(BookingRequest).filter(
            BookingRequest.room_id == db_booking.room_id,
            BookingRequest.booking_date == db_booking.booking_date,
            BookingRequest.time_slot_id == db_booking.time_slot_id,
            BookingRequest.status == BookingStatus.APPROVED,
            BookingRequest.id != booking_id
        ).first()
        if existing_booking:
            raise HTTPException(status_code=400, detail="Cannot approve: Room is already booked.")

    db_booking.status = booking_update.status
    db.commit()
    db.refresh(db_booking)
    return db_booking
