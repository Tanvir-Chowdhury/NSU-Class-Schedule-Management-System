import sys
import os
import random

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.teacher import Teacher, TeacherPreference
from models.academic import Course
from models.schedule import Section
from models.user import User
from models.student import Student, Enrollment
from models.admin import Admin

def cleanup_data():
    session: Session = SessionLocal()
    try:
        print("Starting cleanup...")

        # --- Task 1: Enforce Max 12 Preferences for Permanent Faculty ---
        print("\n--- Checking Permanent Faculty Preferences ---")
        permanent_teachers = session.query(Teacher).filter(Teacher.faculty_type == 'Permanent').all()
        
        for teacher in permanent_teachers:
            prefs = session.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).all()
            count = len(prefs)
            
            if count > 12:
                print(f"Teacher {teacher.name} has {count} preferences. Reducing to 12.")
                # Randomly select preferences to keep, or just remove the excess from the end
                # Let's remove random ones to be fair, or just the last ones. 
                # Random is probably better to avoid bias if they were added in order.
                
                # We need to remove (count - 12) items
                num_to_remove = count - 12
                prefs_to_remove = random.sample(prefs, num_to_remove)
                
                for pref in prefs_to_remove:
                    session.delete(pref)
                
                print(f"  Removed {num_to_remove} preferences.")
        
        session.commit() # Commit changes for Task 1

        # --- Task 2: Remove Courses with No Preferences ---
        print("\n--- Checking for Courses with No Preferences ---")
        
        # Get all course IDs
        all_courses = session.query(Course).all()
        all_course_ids = {c.id for c in all_courses}
        
        # Get course IDs that have at least one preference
        preferred_course_ids_tuples = session.query(TeacherPreference.course_id).distinct().all()
        preferred_course_ids = {id_tuple[0] for id_tuple in preferred_course_ids_tuples}
        
        # Identify courses to remove
        courses_to_remove_ids = all_course_ids - preferred_course_ids
        
        if not courses_to_remove_ids:
            print("All courses have at least one teacher preference.")
        else:
            print(f"Found {len(courses_to_remove_ids)} courses with no teacher preferences.")
            
            for course_id in courses_to_remove_ids:
                course = session.query(Course).get(course_id)
                if course:
                    print(f"  Removing course: {course.code} - {course.title}")
                    session.delete(course)
            
            session.commit() # Commit changes for Task 2
            print(f"Removed {len(courses_to_remove_ids)} courses.")

    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_data()
