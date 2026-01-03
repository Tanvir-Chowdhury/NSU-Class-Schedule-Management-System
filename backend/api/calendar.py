from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
from typing import List, Dict, Any
from datetime import datetime, timedelta

from core.database import get_db
from core.security import get_current_active_user
from models.user import User
from models.teacher import Teacher
from models.student import Student
from models.academic import Course
from models.schedule import ClassSchedule, Section
from models.booking import BookingRequest
from services.google_calendar import get_google_auth_url, get_credentials_from_code, sync_schedule
from core.constants import TIME_SLOTS

router = APIRouter(
    prefix="/calendar",
    tags=["Calendar"]
)

def get_start_time_from_slot(slot_id: int) -> str:
    time_range = TIME_SLOTS.get(slot_id)
    if not time_range:
        return "00:00"
    start_str = time_range.split(" - ")[0]
    try:
        dt = datetime.strptime(start_str, "%I:%M %p")
        return dt.strftime("%H:%M")
    except ValueError:
        return "00:00"

@router.get("/my-schedule", response_model=List[Dict[str, Any]])
def get_my_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    events = []
    
    # 1. Fetch Class Schedules
    if current_user.role == "TEACHER":
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if teacher:
            schedules = db.query(ClassSchedule).join(Section).filter(Section.teacher_id == teacher.id).all()
            for sch in schedules:
                course = sch.section.course
                duration_minutes = 190 if course.duration_mode == "EXTENDED" else 90
                
                events.append({
                    "id": f"class-{sch.id}",
                    "title": course.code,
                    "type": "class",
                    "day": sch.day,
                    "time_slot_id": sch.time_slot_id,
                    "start_time": get_start_time_from_slot(sch.time_slot_id),
                    "duration_minutes": duration_minutes,
                    "room": sch.room.room_number if sch.room else "TBA",
                    "section": sch.section.section_number
                })

    elif current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            for enrollment in student.enrollments:
                section = enrollment.section
                schedules = db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).all()
                for sch in schedules:
                    course = section.course
                    duration_minutes = 190 if course.duration_mode == "EXTENDED" else 90
                    events.append({
                        "id": f"class-{sch.id}",
                        "title": course.code,
                        "type": "class",
                        "day": sch.day,
                        "time_slot_id": sch.time_slot_id,
                        "start_time": get_start_time_from_slot(sch.time_slot_id),
                        "duration_minutes": duration_minutes,
                        "room": sch.room.room_number if sch.room else "TBA",
                        "section": section.section_number
                    })

    # 2. Fetch Approved Bookings
    bookings = db.query(BookingRequest).filter(
        BookingRequest.user_id == current_user.id,
        BookingRequest.status == "APPROVED"
    ).all()

    for booking in bookings:
        start_time_str = get_start_time_from_slot(booking.time_slot_id)
        
        events.append({
            "id": f"booking-{booking.id}",
            "title": f"Booking: {booking.reason}",
            "type": "booking",
            "time_slot_id": booking.time_slot_id,
            "start": f"{booking.booking_date}T{start_time_str}:00",
            "end": f"{booking.booking_date}T{start_time_str}:00", # Frontend will adjust end
            "duration_minutes": 90, # Standard slot duration
            "room": booking.room.room_number if booking.room else "TBA",
            "status": booking.status
        })

    return events

@router.get("/google/login")
def login_google():
    """
    Redirects user to Google OAuth2 login.
    """
    auth_url = get_google_auth_url()
    return {"auth_url": auth_url}

@router.get("/google/callback")
def callback_google(code: str, state: str = None):
    """
    Callback for Google OAuth2.
    Redirects to frontend with the code.
    """
    # Redirect to frontend with code
    # Assuming frontend is running on localhost:5173
    # We pass the code as a query param so frontend can call /connect
    return RedirectResponse(f"http://localhost:5173/google/callback?code={code}")

@router.post("/google/connect")
def connect_google(
    request: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Connects the current user's account to Google Calendar using the auth code.
    """
    code = request.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
        
    try:
        creds = get_credentials_from_code(code)
        current_user.google_access_token = creds.token
        current_user.google_refresh_token = creds.refresh_token
        db.commit()
        
        # Trigger initial sync
        count = sync_schedule(current_user, creds, db)
        
        return {"message": f"Connected and synced {count} events to Google Calendar"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect: {str(e)}")


@router.post("/google/sync")
def sync_google_calendar(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Syncs the current user's schedule to Google Calendar.
    """
    # We need to reconstruct credentials from stored tokens
    if not current_user.google_access_token:
        raise HTTPException(status_code=400, detail="Not connected to Google Calendar")
        
    from google.oauth2.credentials import Credentials
    import os
    
    creds = Credentials(
        token=current_user.google_access_token,
        refresh_token=current_user.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=['https://www.googleapis.com/auth/calendar']
    )
    
    return {"synced_count": sync_schedule(current_user, creds, db)}
