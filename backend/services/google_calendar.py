import os
import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.user import User
from models.teacher import Teacher
from models.schedule import ClassSchedule, Section
from models.booking import BookingRequest, BookingStatus
from models.academic import Course, DurationMode
from core.constants import TIME_SLOTS

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_google_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
    )

def get_google_auth_url():
    flow = get_google_flow()
    auth_url, _ = flow.authorization_url(prompt='consent')
    return auth_url

def get_credentials_from_code(code: str):
    flow = get_google_flow()
    flow.fetch_token(code=code)
    return flow.credentials

def get_next_day_date(day_name: str):
    """
    Returns the date of the next occurrence of the given day name.
    """
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    today = datetime.date.today()
    target_day_index = days.index(day_name)
    current_day_index = today.weekday()
    
    days_ahead = target_day_index - current_day_index
    if days_ahead < 0: # Target day has passed this week
        days_ahead += 7
        
    return today + datetime.timedelta(days=days_ahead)

def sync_schedule(user: User, creds: Credentials, db: Session):
    service = build('calendar', 'v3', credentials=creds)

    # 1. Fetch Schedule Events
    events_to_sync = []
    
    # A. Recurring Class Schedules (Teachers Only)
    if user.role == "TEACHER":
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        if teacher:
            schedules = db.query(ClassSchedule).join(Section).filter(Section.teacher_id == teacher.id).all()
            for sch in schedules:
                course = sch.section.course
                # Calculate next occurrence of this day
                next_date = get_next_day_date(sch.day)
                
                # Calculate start and end datetime
                # sch.start_time is datetime.time
                start_dt = datetime.datetime.combine(next_date, sch.start_time)
                
                duration_minutes = 190 if course.duration_mode == DurationMode.EXTENDED else 90
                end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)
                
                # Map day name to RRULE BYDAY
                day_map = {
                    'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE', 
                    'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA', 'Sunday': 'SU'
                }
                byday = day_map.get(sch.day, 'MO')

                events_to_sync.append({
                    'summary': f"{course.code} - {course.title}",
                    'location': sch.room.room_number if sch.room else "TBA",
                    'description': f"Section: {sch.section.section_number}",
                    'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Dhaka'},
                    'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Dhaka'},
                    'recurrence': [f'RRULE:FREQ=WEEKLY;COUNT=14;BYDAY={byday}']
                })
                
    elif user.role == "STUDENT":
        # Placeholder for student sync logic
        pass

    # B. One-time Room Bookings (All Users)
    bookings = db.query(BookingRequest).filter(
        BookingRequest.user_id == user.id,
        BookingRequest.status == BookingStatus.APPROVED
    ).all()

    for booking in bookings:
        # Map slot ID to time
        # TIME_SLOTS is a dict like {1: "08:00 AM - 09:30 AM", ...}
        slot_str = TIME_SLOTS.get(booking.time_slot_id)
        if slot_str:
            start_str, end_str = slot_str.split(' - ')
            start_time = datetime.datetime.strptime(start_str, "%I:%M %p").time()
            end_time = datetime.datetime.strptime(end_str, "%I:%M %p").time()
            
            start_dt = datetime.datetime.combine(booking.booking_date, start_time)
            end_dt = datetime.datetime.combine(booking.booking_date, end_time)
            
            events_to_sync.append({
                'summary': f"Room Booking: {booking.reason}",
                'location': booking.room.room_number if booking.room else "TBA",
                'description': f"Approved Booking",
                'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Dhaka'},
                'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Dhaka'},
            })

    # 2. Insert Events
    created_count = 0
    for event in events_to_sync:
        try:
            service.events().insert(calendarId='primary', body=event).execute()
            created_count += 1
        except Exception as e:
            print(f"Error syncing event {event['summary']}: {e}")
            
    return created_count
