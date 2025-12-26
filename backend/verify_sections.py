import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.academic import Course
from models.schedule import Section
from models.teacher import TeacherPreference
from models.teacher import Teacher
from models.user import User
from models.student import Student, Enrollment
from models.admin import Admin

def verify_sections_vs_preferences():
    session: Session = SessionLocal()
    try:
        print(f"{'Course Code':<15} | {'Offered Sections':<20} | {'Preferred Sections':<20}")
        print("-" * 60)

        courses = session.query(Course).all()
        
        total_offered = 0
        total_preferred = 0

        for course in courses:
            # Count offered sections
            offered_count = session.query(Section).filter(Section.course_id == course.id).count()
            
            # Sum preferred sections
            prefs = session.query(TeacherPreference).filter(TeacherPreference.course_id == course.id).all()
            preferred_count = sum(p.section_count for p in prefs)
            
            print(f"{course.code:<15} | {offered_count:<20} | {preferred_count:<20}")
            
            total_offered += offered_count
            total_preferred += preferred_count

        print("-" * 60)
        print(f"{'GRAND TOTAL':<15} | {total_offered:<20} | {total_preferred:<20}")
        print("=" * 60)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    verify_sections_vs_preferences()
