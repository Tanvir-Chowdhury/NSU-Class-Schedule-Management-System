from sqlalchemy.orm import Session
from models.academic import Room, Course
from models.teacher import Teacher
from models.schedule import Section, ClassSchedule
from services.rag_service import upsert_data

def index_all_data(db: Session):
    """
    Indexes all relevant data (Rooms, Teachers, Courses, Schedules) into Pinecone.
    """
    print("Starting full database indexing...")
    
    # Index Rooms
    rooms = db.query(Room).all()
    for room in rooms:
        text = f"Room {room.room_number} is a {room.type} room with a capacity of {room.capacity} students."
        upsert_data(
            vector_id=f"room_{room.id}",
            data_text=text,
            metadata={"type": "room", "room_number": room.room_number}
        )
        
    # Index Teachers
    teachers = db.query(Teacher).all()
    for teacher in teachers:
        text = f"Teacher {teacher.name} ({teacher.initial}) is from the {teacher.department} department. " \
               f"Research interests: {teacher.research_interests}. " \
               f"Contact: {teacher.contact_details}."
        upsert_data(
            vector_id=f"teacher_{teacher.id}",
            data_text=text,
            metadata={"type": "teacher", "initial": teacher.initial}
        )
        
    # Index Courses
    courses = db.query(Course).all()
    for course in courses:
        text = f"Course {course.code}: {course.title} is a {course.credits} credit course."
        upsert_data(
            vector_id=f"course_{course.id}",
            data_text=text,
            metadata={"type": "course", "code": course.code}
        )
        
    # Index Sections & Schedules
    sections = db.query(Section).all()
    for section in sections:
        teacher_name = section.teacher.name if section.teacher else "TBA"
        course_code = section.course.code
        course_title = section.course.title
        
        schedule_texts = []
        for schedule in section.schedules:
            # Assuming time_slot_id maps to actual times, but for now just using ID or we need a mapping
            # Ideally we should have a TimeSlot model or mapping. 
            # For now, let's just say "Time Slot X"
            schedule_texts.append(f"{schedule.day} at Time Slot {schedule.time_slot_id} in Room {schedule.room.room_number}")
            
        schedule_str = ", ".join(schedule_texts)
        
        text = f"Section {section.section_number} of {course_code} ({course_title}) is taught by {teacher_name}. " \
               f"Schedule: {schedule_str}."
               
        upsert_data(
            vector_id=f"section_{section.id}",
            data_text=text,
            metadata={"type": "section", "course_code": course_code}
        )

    print("Full database indexing completed.")
