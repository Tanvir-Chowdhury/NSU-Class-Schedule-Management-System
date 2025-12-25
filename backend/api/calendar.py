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

router = APIRouter(
    prefix="/calendar",
    tags=["Calendar"]
)

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
                duration_minutes = 190 if course.duration_mode == "EXTENDED" else 90 # 3h 10m = 190m, 1h 30m = 90m
                
                # We need to convert day/time to actual dates for the calendar view.
                # However, react-big-calendar handles recurring events differently or we generate them for a range.
                # For simplicity, we will return the raw schedule info and let frontend generate events for the current week,
                # OR we generate events for the current week here.
                # Let's return the raw schedule data with a type 'class' and let frontend handle recurrence.
                # Actually, react-big-calendar expects specific dates.
                # Let's generate events for the next 4 weeks? Or just return the pattern.
                # The prompt says "Event Mapping... set event end time to Start + ...".
                # This implies we should return objects that can be easily mapped.
                
                events.append({
                    "id": f"class-{sch.id}",
                    "title": f"{course.code} - {course.title}",
                    "type": "class",
                    "day": sch.day,
                    "start_time": sch.start_time.strftime("%H:%M"),
                    "duration_minutes": duration_minutes,
                    "room": sch.room.room_number if sch.room else "TBA",
                    "section": sch.section.section_number
                })

    elif current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            # Assuming student.sections is a relationship to Section
            # We need to join ClassSchedule
            # This depends on how enrollment is modeled. 
            # If Student has many-to-many with Section:
            for section in student.sections:
                schedules = db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).all()
                for sch in schedules:
                    course = section.course
                    duration_minutes = 190 if course.duration_mode == "EXTENDED" else 90
                    events.append({
                        "id": f"class-{sch.id}",
                        "title": f"{course.code} - {course.title}",
                        "type": "class",
                        "day": sch.day,
                        "start_time": sch.start_time.strftime("%H:%M"),
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
        # Bookings are one-time events with a specific date
        # We need to calculate end time based on slot or just assume 90 mins?
        # The booking has time_slot_id. We need to map that to time.
        # For now, let's assume standard 90 mins for slots.
        # Slot 1: 08:00, Slot 2: 09:40, etc.
        # We should probably have a helper for this.
        
        # Mapping slot ID to start time (approximate based on frontend constant)
        slot_map = {
            1: "08:00", 2: "09:40", 3: "11:20", 4: "13:00", 
            5: "14:40", 6: "16:20", 7: "18:00"
        }
        start_time_str = slot_map.get(booking.time_slot_id, "08:00")
        
        events.append({
            "id": f"booking-{booking.id}",
            "title": f"Booking: {booking.reason}",
            "type": "booking",
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
