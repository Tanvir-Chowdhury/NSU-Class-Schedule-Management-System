import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import SessionLocal
from models.teacher import Teacher, TeacherPreference
from models.user import User
from models.academic import Course
from models.schedule import Section
from models.student import Student, Enrollment
from models.admin import Admin

def check_preferences():
    session: Session = SessionLocal()
    try:
        print(f"{'Teacher Name':<30} | {'Type':<10} | {'Total Sections':<15} | {'Course Count':<15}")
        print("-" * 80)
        
        teachers = session.query(Teacher).all()
        grand_total_sections = 0
        
        for teacher in teachers:
            if not teacher.faculty_type:
                continue
                
            prefs = session.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).all()
            
            total_sections = sum(pref.section_count for pref in prefs)
            course_count = len(prefs)
            
            print(f"{teacher.name:<30} | {teacher.faculty_type:<10} | {total_sections:<15} | {course_count:<15}")
            
            grand_total_sections += total_sections

        print("-" * 80)
        print(f"{'GRAND TOTAL':<43} | {grand_total_sections:<15} |")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_preferences()
