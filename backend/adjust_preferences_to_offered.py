import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import SessionLocal
from models.teacher import Teacher, TeacherPreference
from models.academic import Course
from models.schedule import Section
from models.user import User
from models.student import Student, Enrollment
from models.admin import Admin

def adjust_and_report_preferences():
    session: Session = SessionLocal()
    try:
        print("Starting preference adjustment based on offered sections...")
        
        # 1. Adjust Preferences
        preferences = session.query(TeacherPreference).all()
        adjusted_count = 0
        removed_count = 0
        
        for pref in preferences:
            # Count actual sections for this course
            actual_sections_count = session.query(Section).filter(Section.course_id == pref.course_id).count()
            
            if actual_sections_count == 0:
                # If no sections offered, remove preference
                session.delete(pref)
                removed_count += 1
                # print(f"Removed preference for Teacher {pref.teacher_id} on Course {pref.course_id} (0 sections offered)")
            elif pref.section_count > actual_sections_count:
                # Cap preference at actual sections
                # print(f"Adjusting Teacher {pref.teacher_id} Course {pref.course_id}: {pref.section_count} -> {actual_sections_count}")
                pref.section_count = actual_sections_count
                adjusted_count += 1
        
        session.commit()
        print(f"Adjustment complete. Adjusted {adjusted_count} preferences. Removed {removed_count} preferences.")
        
        # 2. Generate Report
        print("\n" + "="*60)
        print(f"{'Teacher Name':<30} | {'Total Sections Preferred':<25}")
        print("-" * 60)
        
        teachers = session.query(Teacher).all()
        grand_total = 0
        
        for teacher in teachers:
            if not teacher.faculty_type:
                continue
                
            # Re-query preferences after adjustment
            prefs = session.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).all()
            total_sections = sum(pref.section_count for pref in prefs)
            
            print(f"{teacher.name:<30} | {total_sections:<25}")
            grand_total += total_sections
            
        print("-" * 60)
        print(f"{'GRAND TOTAL':<30} | {grand_total:<25}")
        print("="*60)

    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    adjust_and_report_preferences()
