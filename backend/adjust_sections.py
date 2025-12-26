import sys
import os
import random

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.academic import Course
from models.schedule import Section
from models.teacher import Teacher
from models.student import Student, Enrollment
from models.user import User
from models.admin import Admin

def adjust_sections():
    session: Session = SessionLocal()
    try:
        print("Starting section adjustment...")
        
        # 1. Get all courses
        courses = session.query(Course).all()
        course_map = {c.code: c for c in courses}
        
        processed_ids = set()
        
        for course in courses:
            if course.id in processed_ids:
                continue
                
            # Check for pair
            is_lab = course.code.endswith('L')
            pair_course = None
            
            if is_lab:
                theory_code = course.code[:-1]
                if theory_code in course_map:
                    pair_course = course_map[theory_code]
            else:
                lab_code = course.code + 'L'
                if lab_code in course_map:
                    pair_course = course_map[lab_code]
            
            # Get current sections for primary course
            current_sections = session.query(Section).filter(Section.course_id == course.id).order_by(Section.section_number).all()
            count = len(current_sections)
            
            target = count
            
            if pair_course:
                processed_ids.add(pair_course.id)
                pair_sections = session.query(Section).filter(Section.course_id == pair_course.id).order_by(Section.section_number).all()
                pair_count = len(pair_sections)
                
                # Logic for pair
                if count > 5 or pair_count > 5:
                    # If either exceeds 5, bring both to 4-7 range
                    target = random.randint(4, 7)
                    print(f"Pair {course.code} ({count}) & {pair_course.code} ({pair_count}) -> Target {target} (Rule: > 5)")
                elif count != pair_count:
                    # If neither exceeds 5 but they differ, sync them (using max)
                    target = max(count, pair_count)
                    print(f"Pair {course.code} ({count}) & {pair_course.code} ({pair_count}) -> Target {target} (Rule: Sync)")
                
                # Apply to both
                adjust_course_sections(session, course, target, current_sections)
                adjust_course_sections(session, pair_course, target, pair_sections)
                
            else:
                # Logic for standalone
                if count > 5:
                    target = random.randint(4, 7)
                    print(f"Course {course.code} ({count}) -> Target {target} (Rule: > 5)")
                    adjust_course_sections(session, course, target, current_sections)
            
            processed_ids.add(course.id)
            
        session.commit()
        print("Sections adjusted successfully.")

    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

def adjust_course_sections(session, course, target_count, sections):
    current_count = len(sections)
    
    if current_count == target_count:
        return
        
    if current_count < target_count:
        # Add sections
        to_add = target_count - current_count
        last_section = sections[-1].section_number if sections else 0
        for i in range(to_add):
            new_section = Section(
                course_id=course.id,
                section_number=last_section + i + 1,
                teacher_id=None
            )
            session.add(new_section)
        print(f"  Added {to_add} sections to {course.code}")
            
    elif current_count > target_count:
        # Remove sections (from the end)
        to_remove = current_count - target_count
        for i in range(to_remove):
            # Pop from end
            section_to_delete = sections[-(i+1)]
            session.delete(section_to_delete)
        print(f"  Removed {to_remove} sections from {course.code}")

if __name__ == "__main__":
    adjust_sections()
