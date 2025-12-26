import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.academic import Course
from models.schedule import Section
from models.teacher import Teacher, TeacherPreference
from models.user import User
from models.student import Student, Enrollment
from models.admin import Admin

def update_sections_by_preference():
    session: Session = SessionLocal()
    try:
        print("Updating course sections based on faculty preferences...")
        print(f"{'Course':<10} | {'Pref Total':<10} | {'Old Count':<10} | {'New Count':<10}")
        print("-" * 50)

        courses = session.query(Course).all()
        
        for course in courses:
            # 1. Calculate total preferences for this course
            prefs = session.query(TeacherPreference).filter(TeacherPreference.course_id == course.id).all()
            total_preferred = sum(p.section_count for p in prefs)

            # 2. Determine target number of sections (Max 15)
            target_count = min(total_preferred, 15)
            
            # If total_preferred is 0, target is 0. 
            # (Though we expect >0 based on previous cleanup, but good to handle)

            # 3. Get current sections
            current_sections = session.query(Section).filter(Section.course_id == course.id).order_by(Section.section_number).all()
            current_count = len(current_sections)

            # 4. Adjust sections
            if current_count < target_count:
                # Add sections
                to_add = target_count - current_count
                last_section_num = current_sections[-1].section_number if current_sections else 0
                
                for i in range(to_add):
                    new_section = Section(
                        course_id=course.id,
                        section_number=last_section_num + i + 1,
                        teacher_id=None # New sections have no teacher assigned yet
                    )
                    session.add(new_section)
                    
            elif current_count > target_count:
                # Remove sections (from the end)
                to_remove = current_count - target_count
                for i in range(to_remove):
                    # Remove the last section
                    section_to_remove = current_sections[-(i+1)]
                    session.delete(section_to_remove)
            
            print(f"{course.code:<10} | {total_preferred:<10} | {current_count:<10} | {target_count:<10}")

        session.commit()
        print("-" * 50)
        print("Database updated successfully.")

    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    update_sections_by_preference()
