import random
import sys
import os

# Add the current directory to sys.path to make imports work
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

def update_teacher_preferences():
    session: Session = SessionLocal()
    try:
        print("Starting teacher preference update...")

        # 1. Identify valid courses (those that have sections)
        valid_course_ids_tuples = session.query(Section.course_id).distinct().all()
        valid_course_ids = [id_tuple[0] for id_tuple in valid_course_ids_tuples]
        
        if not valid_course_ids:
            print("No courses with sections found. Cannot assign preferences.")
            return

        print(f"Found {len(valid_course_ids)} valid courses (with sections).")

        # 2. Iterate through all teachers
        teachers = session.query(Teacher).all()
        
        for teacher in teachers:
            print(f"Processing teacher: {teacher.name} ({teacher.faculty_type})")
            
            if not teacher.faculty_type:
                print(f"  Skipping teacher {teacher.name} - No faculty type defined.")
                continue

            # Fetch existing preferences
            existing_prefs = session.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).all()
            existing_course_ids = {pref.course_id for pref in existing_prefs}
            
            # Filter out preferences for invalid courses (courses with no sections)
            # Although the prompt implies we should only ADD valid ones, 
            # it's good practice to ensure existing ones are valid too, 
            # but I will just focus on adding/adjusting based on valid list.
            
            if teacher.faculty_type == 'Permanent':
                # Constraint: 6-12 distinct courses
                min_courses = 6
                max_courses = 12
                
                current_course_count = len(existing_prefs)
                target_course_count = random.randint(min_courses, max_courses)
                
                print(f"  Current courses: {current_course_count}, Target: {target_course_count}")

                if current_course_count < target_course_count:
                    # Need to add more courses
                    num_to_add = target_course_count - current_course_count
                    available_courses = list(set(valid_course_ids) - existing_course_ids)
                    
                    if len(available_courses) < num_to_add:
                        print(f"  Warning: Not enough available valid courses to meet target. Adding all {len(available_courses)} available.")
                        courses_to_add = available_courses
                    else:
                        courses_to_add = random.sample(available_courses, num_to_add)
                    
                    for course_id in courses_to_add:
                        new_pref = TeacherPreference(
                            teacher_id=teacher.id,
                            course_id=course_id,
                            section_count=1, # Default to 1 section
                            status="accepted" # Assuming auto-accepted for this script
                        )
                        session.add(new_pref)
                        existing_course_ids.add(course_id)
                    print(f"  Added {len(courses_to_add)} new course preferences.")

                elif current_course_count > max_courses:
                    # Need to remove courses
                    num_to_remove = current_course_count - max_courses
                    prefs_to_remove = random.sample(existing_prefs, num_to_remove)
                    for pref in prefs_to_remove:
                        session.delete(pref)
                    print(f"  Removed {num_to_remove} excess course preferences.")
                
                # Ensure section_count is at least 1 for all preferences
                # (The prompt didn't specify section count for Permanent, just course count. 
                # But let's ensure it's reasonable)
                # If we wanted to be strict about "6-12 courses", we are done.

            elif teacher.faculty_type == 'Adjunct':
                # Constraint: 2-10 sections total
                min_sections = 2
                max_sections = 10
                
                current_total_sections = sum(pref.section_count for pref in existing_prefs)
                target_total_sections = random.randint(min_sections, max_sections)
                
                print(f"  Current total sections: {current_total_sections}, Target: {target_total_sections}")

                if current_total_sections < target_total_sections:
                    needed = target_total_sections - current_total_sections
                    
                    # Strategy: Add new courses with 1 section until we run out of courses or hit target, 
                    # then increase section counts of existing preferences.
                    
                    while needed > 0:
                        available_courses = list(set(valid_course_ids) - existing_course_ids)
                        
                        if available_courses:
                            # Add a new course
                            course_id = random.choice(available_courses)
                            new_pref = TeacherPreference(
                                teacher_id=teacher.id,
                                course_id=course_id,
                                section_count=1,
                                status="accepted"
                            )
                            session.add(new_pref)
                            existing_course_ids.add(course_id)
                            # Update our local tracking
                            existing_prefs.append(new_pref) 
                            needed -= 1
                        else:
                            # No more new courses available, increment existing
                            if not existing_prefs:
                                print("  Error: No valid courses available and no existing preferences to increment.")
                                break
                            
                            pref_to_boost = random.choice(existing_prefs)
                            pref_to_boost.section_count += 1
                            needed -= 1
                    print(f"  Adjusted preferences to meet target sections.")

                elif current_total_sections > max_sections:
                    to_remove = current_total_sections - max_sections
                    
                    while to_remove > 0 and existing_prefs:
                        # Pick a preference to decrement
                        pref = random.choice(existing_prefs)
                        if pref.section_count > 1:
                            pref.section_count -= 1
                            to_remove -= 1
                        else:
                            # If section count is 1, removing it removes the course preference entirely
                            session.delete(pref)
                            existing_prefs.remove(pref)
                            to_remove -= 1
                    print(f"  Reduced preferences to meet max sections.")

        session.commit()
        print("Database updated successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    update_teacher_preferences()
