import sys
import os

# Add the current directory to sys.path to allow imports from core and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.academic import Course
from models.teacher import TeacherPreference
from models.schedule import Section
from models.user import User
from models.student import Student, Enrollment
from models.admin import Admin

def cleanup_courses():
    db: Session = SessionLocal()
    try:
        # Get all course IDs that are referenced in teacher preferences
        preferred_course_ids = db.query(TeacherPreference.course_id).distinct().all()
        preferred_course_ids = {id[0] for id in preferred_course_ids}
        
        print(f"Found {len(preferred_course_ids)} courses in teacher preferences.")

        # Get all courses
        all_courses = db.query(Course).all()
        print(f"Total courses in database: {len(all_courses)}")

        courses_to_delete = []
        for course in all_courses:
            if course.id not in preferred_course_ids:
                courses_to_delete.append(course)

        if not courses_to_delete:
            print("No courses to delete.")
            return

        print(f"Found {len(courses_to_delete)} courses to delete.")
        
        # Delete the courses
        for course in courses_to_delete:
            print(f"Deleting course: {course.code} - {course.title}")
            db.delete(course)
        
        db.commit()
        print("Successfully deleted courses.")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_courses()
