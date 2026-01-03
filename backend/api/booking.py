from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel
import json

from core.database import get_db
from core.security import get_current_active_user, get_admin_user
from core.constants import TIME_SLOTS
from models.booking import BookingRequest, BookingStatus
from models.schedule import ClassSchedule
from models.academic import Room, ClassType
from models.user import User
from schemas.booking import BookingRequestCreate, BookingRequest as BookingRequestSchema, BookingRequestUpdate
from services.rag_service import trigger_rag_update, trigger_rag_delete

class BulkBookingAction(BaseModel):
    action: str
    ids: Optional[List[int]] = None

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
    background_tasks: BackgroundTasks,
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

    # Check for double booking (User cannot book multiple rooms at the same time)
    double_booking = db.query(BookingRequest).filter(
        BookingRequest.user_id == current_user.id,
        BookingRequest.booking_date == booking.booking_date,
        BookingRequest.time_slot_id == booking.time_slot_id,
        or_(
            BookingRequest.status == BookingStatus.APPROVED,
            BookingRequest.status == BookingStatus.PENDING
        )
    ).first()

    if double_booking:
        raise HTTPException(status_code=400, detail="You already have a booking request for this time slot.")

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

    # RAG Update
    room = db.query(Room).filter(Room.id == new_booking.room_id).first()
    room_number = room.room_number if room else "Unknown Room"
    
    description = f"Booking request for Room {room_number} by {current_user.email} on {new_booking.booking_date} ({new_booking.day}) at Time Slot {new_booking.time_slot_id}. Status: {new_booking.status}. Reason: {new_booking.reason}."
    
    rag_data = {
        "type": "booking_request",
        "room": room_number,
        "user": current_user.email,
        "date": str(new_booking.booking_date),
        "day": new_booking.day,
        "time_slot": new_booking.time_slot_id,
        "status": new_booking.status,
        "reason": new_booking.reason,
        "description": description
    }
    trigger_rag_update(background_tasks, f"booking_{new_booking.id}", json.dumps(rag_data), {"type": "booking_request", "status": new_booking.status})

    return new_booking

@router.delete("/request/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking_request(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a booking request.
    Allowed only if the scheduled time has not passed.
    """
    booking = db.query(BookingRequest).filter(
        BookingRequest.id == booking_id,
        BookingRequest.user_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found")

    # Calculate booking start datetime
    time_str = TIME_SLOTS.get(booking.time_slot_id)
    if not time_str:
        # Should not happen if data is consistent
        raise HTTPException(status_code=400, detail="Invalid time slot")
    
    start_time_str = time_str.split(" - ")[0] # "08:00 AM"
    start_time = datetime.strptime(start_time_str, "%I:%M %p").time()
    
    booking_datetime = datetime.combine(booking.booking_date, start_time)
    
    if datetime.now() >= booking_datetime:
        raise HTTPException(status_code=400, detail="Cannot delete booking: Scheduled time has passed.")

    db.delete(booking)
    db.commit()

    # RAG Delete
    trigger_rag_delete(background_tasks, f"booking_{booking_id}")

    return None

@router.get("/my-requests", response_model=List[BookingRequestSchema])
def read_my_bookings(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all booking requests for the current user.
    """
    return db.query(BookingRequest).filter(BookingRequest.user_id == current_user.id).order_by(desc(BookingRequest.id)).all()

# --- Admin Endpoints ---

@router.get("/admin/requests", response_model=List[BookingRequestSchema], dependencies=[Depends(get_admin_user)])
def read_all_bookings(db: Session = Depends(get_db)):
    """
    Admin: Get all booking requests.
    """
    return db.query(BookingRequest).options(
        joinedload(BookingRequest.room),
        joinedload(BookingRequest.user).joinedload(User.teacher_profile),
        joinedload(BookingRequest.user).joinedload(User.student_profile)
    ).order_by(desc(BookingRequest.id)).all()

@router.put("/admin/requests/{booking_id}", response_model=BookingRequestSchema, dependencies=[Depends(get_admin_user)])
def update_booking_status(
    booking_id: int, 
    booking_update: BookingRequestUpdate, 
    background_tasks: BackgroundTasks,
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

    # RAG Update
    room = db.query(Room).filter(Room.id == db_booking.room_id).first()
    room_number = room.room_number if room else "Unknown Room"
    user = db.query(User).filter(User.id == db_booking.user_id).first()
    user_email = user.email if user else "Unknown User"
    
    description = f"Booking request for Room {room_number} by {user_email} on {db_booking.booking_date} ({db_booking.day}) at Time Slot {db_booking.time_slot_id}. Status: {db_booking.status}. Reason: {db_booking.reason}."
    
    rag_data = {
        "type": "booking_request",
        "room": room_number,
        "user": user_email,
        "date": str(db_booking.booking_date),
        "day": db_booking.day,
        "time_slot": db_booking.time_slot_id,
        "status": db_booking.status,
        "reason": db_booking.reason,
        "description": description
    }
    trigger_rag_update(background_tasks, f"booking_{db_booking.id}", json.dumps(rag_data), {"type": "booking_request", "status": db_booking.status})

    return db_booking

@router.put("/admin/bulk-action", dependencies=[Depends(get_admin_user)])
def bulk_booking_action(
    action_data: BulkBookingAction,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Admin: Bulk Approve or Reject booking requests.
    If ids is provided, applies to those specific IDs.
    If ids is None, applies to ALL PENDING requests.
    Only affects PENDING requests.
    """
    if action_data.action not in [BookingStatus.APPROVED, BookingStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Invalid action")

    query = db.query(BookingRequest).filter(BookingRequest.status == BookingStatus.PENDING)
    
    if action_data.ids:
        query = query.filter(BookingRequest.id.in_(action_data.ids))
    
    pending_requests = query.all()
    count = 0
    
    updated_requests = []

    for req in pending_requests:
        if action_data.action == BookingStatus.APPROVED:
            # Check for conflicts for each request
            conflict = db.query(ClassSchedule).filter(
                ClassSchedule.room_id == req.room_id,
                ClassSchedule.day == req.day,
                ClassSchedule.time_slot_id == req.time_slot_id
            ).first()
            
            if conflict:
                continue # Skip if conflict with class
                
            existing_booking = db.query(BookingRequest).filter(
                BookingRequest.room_id == req.room_id,
                BookingRequest.booking_date == req.booking_date,
                BookingRequest.time_slot_id == req.time_slot_id,
                BookingRequest.status == BookingStatus.APPROVED
            ).first()
            
            if existing_booking:
                continue # Skip if already booked
        
        req.status = action_data.action
        updated_requests.append(req)
        count += 1
        
    db.commit()

    # RAG Update for all updated requests
    for req in updated_requests:
        db.refresh(req)
        room = db.query(Room).filter(Room.id == req.room_id).first()
        room_number = room.room_number if room else "Unknown Room"
        user = db.query(User).filter(User.id == req.user_id).first()
        user_email = user.email if user else "Unknown User"
        
        description = f"Booking request for Room {room_number} by {user_email} on {req.booking_date} ({req.day}) at Time Slot {req.time_slot_id}. Status: {req.status}. Reason: {req.reason}."
        
        rag_data = {
            "type": "booking_request",
            "room": room_number,
            "user": user_email,
            "date": str(req.booking_date),
            "day": req.day,
            "time_slot": req.time_slot_id,
            "status": req.status,
            "reason": req.reason,
            "description": description
        }
        trigger_rag_update(background_tasks, f"booking_{req.id}", json.dumps(rag_data), {"type": "booking_request", "status": req.status})

    return {"message": f"Successfully {action_data.action.lower()}ed {count} requests"}
