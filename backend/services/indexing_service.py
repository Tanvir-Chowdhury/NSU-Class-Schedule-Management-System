from sqlalchemy.orm import Session
from models.academic import Room, Course
from models.teacher import Teacher, OfficeHour
from models.booking import BookingRequest
from models.user import User
from models.student import Student
from models.admin import Admin
from models.schedule import Section, ClassSchedule
from services.rag_service import upsert_data_bulk
import json

def index_all_data(db: Session):
    """
    Indexes all relevant data (Rooms, Teachers, Courses, Schedules) into Pinecone.
    """
    print("Starting full database indexing...")
    
    items_to_index = []

    # Index Rooms
    rooms = db.query(Room).all()
    for room in rooms:
        data = {
            "type": "room",
            "room_number": room.room_number,
            "room_type": room.type,
            "capacity": room.capacity,
            "description": f"Room {room.room_number} is a {room.type} room with a capacity of {room.capacity} students."
        }
        items_to_index.append({
            "vector_id": f"room_{room.id}",
            "data_text": json.dumps(data),
            "metadata": {"type": "room", "room_number": room.room_number}
        })
        
    # Index Teachers
    teachers = db.query(Teacher).all()
    for teacher in teachers:
        data = {
            "type": "teacher",
            "name": teacher.name,
            "initial": teacher.initial,
            "email": teacher.user.email if teacher.user else None,
            "department": teacher.department,
            "faculty_type": teacher.faculty_type,
            "research_interests": teacher.research_interests,
            "published_papers": teacher.published_papers,
            "projects": teacher.projects,
            "contact_details": teacher.contact_details,
            "profile_picture": teacher.profile_picture,
            "description": f"Teacher {teacher.name} ({teacher.initial}) is a {teacher.faculty_type} faculty from the {teacher.department} department. Email: {teacher.user.email if teacher.user else 'N/A'}. Research interests: {teacher.research_interests}. Contact: {teacher.contact_details}."
        }
        items_to_index.append({
            "vector_id": f"teacher_{teacher.id}",
            "data_text": json.dumps(data),
            "metadata": {"type": "teacher", "initial": teacher.initial}
        })
        
    # Index Courses
    courses = db.query(Course).all()
    for course in courses:
        data = {
            "type": "course",
            "code": course.code,
            "title": course.title,
            "credits": course.credits,
            "description": f"Course {course.code}: {course.title} is a {course.credits} credit course."
        }
        items_to_index.append({
            "vector_id": f"course_{course.id}",
            "data_text": json.dumps(data),
            "metadata": {"type": "course", "code": course.code}
        })
        
    # Index Sections & Schedules
    sections = db.query(Section).all()
    for section in sections:
        teacher_name = section.teacher.name if section.teacher else "TBA"
        course_code = section.course.code
        course_title = section.course.title
        
        schedule_texts = []
        schedules_data = []
        for schedule in section.schedules:
            schedule_texts.append(f"{schedule.day} at Time Slot {schedule.time_slot_id} in Room {schedule.room.room_number}")
            schedules_data.append({
                "day": schedule.day,
                "time_slot": schedule.time_slot_id,
                "room": schedule.room.room_number
            })
            
        schedule_str = ", ".join(schedule_texts)
        
        data = {
            "type": "section",
            "section_number": section.section_number,
            "course_code": course_code,
            "course_title": course_title,
            "teacher": teacher_name,
            "schedules": schedules_data,
            "description": f"Section {section.section_number} of {course_code} ({course_title}) is taught by {teacher_name}. Schedule: {schedule_str}."
        }
               
        items_to_index.append({
            "vector_id": f"section_{section.id}",
            "data_text": json.dumps(data),
            "metadata": {"type": "section", "course_code": course_code}
        })

    # Index Office Hours
    office_hours = db.query(OfficeHour).all()
    for oh in office_hours:
        teacher_name = oh.teacher.name if oh.teacher else "Unknown Teacher"
        teacher_initial = oh.teacher.initial if oh.teacher else "Unknown"
        course_code = oh.course.code if oh.course else "General"
        
        description = f"Office hours for {teacher_name} ({teacher_initial}) are on {oh.day} from {oh.start_time} to {oh.end_time}."
        if oh.course:
            description += f" for course {course_code}."
            
        data = {
            "type": "office_hour",
            "teacher": teacher_name,
            "initial": teacher_initial,
            "day": oh.day,
            "start_time": oh.start_time,
            "end_time": oh.end_time,
            "course": course_code,
            "description": description
        }
        items_to_index.append({
            "vector_id": f"office_hour_{oh.id}",
            "data_text": json.dumps(data),
            "metadata": {"type": "office_hour", "teacher": teacher_initial}
        })

    # Index Booking Requests
    bookings = db.query(BookingRequest).all()
    for booking in bookings:
        room_number = booking.room.room_number if booking.room else "Unknown Room"
        user_email = booking.user.email if booking.user else "Unknown User"
        
        description = f"Booking request for Room {room_number} by {user_email} on {booking.booking_date} ({booking.day}) at Time Slot {booking.time_slot_id}. Status: {booking.status}. Reason: {booking.reason}."
        
        data = {
            "type": "booking_request",
            "room": room_number,
            "user": user_email,
            "date": str(booking.booking_date),
            "day": booking.day,
            "time_slot": booking.time_slot_id,
            "status": booking.status,
            "reason": booking.reason,
            "description": description
        }
        items_to_index.append({
            "vector_id": f"booking_{booking.id}",
            "data_text": json.dumps(data),
            "metadata": {"type": "booking_request", "status": booking.status}
        })

    # Perform bulk upsert
    if items_to_index:
        upsert_data_bulk(items_to_index)

    print("Full database indexing completed.")
