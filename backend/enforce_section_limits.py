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

def enforce_section_limits():
    session: Session = SessionLocal()
    try:
        print("Starting strict section limit enforcement...")
        
        teachers = session.query(Teacher).all()
        
        # Get all valid courses and their max section counts
        courses = session.query(Course).all()
        course_section_counts = {}
        for course in courses:
            count = session.query(Section).filter(Section.course_id == course.id).count()
            if count > 0:
                course_section_counts[course.id] = count
        
        valid_course_ids = list(course_section_counts.keys())
        
        for teacher in teachers:
            if not teacher.faculty_type:
                continue
                
            if teacher.faculty_type == 'Permanent':
                min_limit = 6
                max_limit = 12
            elif teacher.faculty_type == 'Adjunct':
                min_limit = 4
                max_limit = 8
            else:
                continue
                
            prefs = session.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).all()
            current_total = sum(pref.section_count for pref in prefs)
            
            print(f"Teacher: {teacher.name} ({teacher.faculty_type}) - Current: {current_total}")
            
            # Case 1: Too many sections
            if current_total > max_limit:
                excess = current_total - max_limit
                print(f"  Reducing by {excess}...")
                
                while excess > 0 and prefs:
                    # Pick a random preference to reduce
                    pref = random.choice(prefs)
                    
                    if pref.section_count > 1:
                        pref.section_count -= 1
                        excess -= 1
                    else:
                        # Remove preference entirely if count is 1
                        session.delete(pref)
                        prefs.remove(pref)
                        excess -= 1
                
            # Case 2: Too few sections
            elif current_total < min_limit:
                deficit = min_limit - current_total
                print(f"  Increasing by {deficit}...")
                
                existing_course_ids = {p.course_id for p in prefs}
                
                while deficit > 0:
                    # Strategy: 
                    # 1. Try to increase existing preferences if below offered count
                    # 2. If not possible or random choice, add new course
                    
                    # Identify expandable preferences
                    expandable_prefs = [
                        p for p in prefs 
                        if p.course_id in course_section_counts and p.section_count < course_section_counts[p.course_id]
                    ]
                    
                    # Decide whether to expand existing or add new (50/50 if both possible)
                    # But if we have no preferences, we MUST add new.
                    # If we have no expandable preferences, we MUST add new.
                    
                    action = 'add_new'
                    if expandable_prefs:
                        if random.random() < 0.5:
                            action = 'expand_existing'
                    
                    if action == 'expand_existing':
                        pref_to_expand = random.choice(expandable_prefs)
                        pref_to_expand.section_count += 1
                        deficit -= 1
                    else:
                        # Add new course preference
                        available_courses = [cid for cid in valid_course_ids if cid not in existing_course_ids]
                        
                        if not available_courses:
                            # No new courses available, forced to expand existing if possible
                            if expandable_prefs:
                                pref_to_expand = random.choice(expandable_prefs)
                                pref_to_expand.section_count += 1
                                deficit -= 1
                            else:
                                print("  Warning: Cannot meet minimum limit. No available courses or expandable sections.")
                                break
                        else:
                            new_course_id = random.choice(available_courses)
                            new_pref = TeacherPreference(
                                teacher_id=teacher.id,
                                course_id=new_course_id,
                                section_count=1,
                                status="accepted"
                            )
                            session.add(new_pref)
                            prefs.append(new_pref) # Add to local list for next iteration
                            existing_course_ids.add(new_course_id)
                            deficit -= 1

        session.commit()
        print("Enforcement complete.")
        
        # Verification Report
        print("\n" + "="*60)
        print(f"{'Teacher Name':<30} | {'Type':<10} | {'Sections':<10}")
        print("-" * 60)
        
        teachers = session.query(Teacher).all()
        grand_total = 0
        
        for teacher in teachers:
            if not teacher.faculty_type:
                continue
            prefs = session.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).all()
            total = sum(pref.section_count for pref in prefs)
            print(f"{teacher.name:<30} | {teacher.faculty_type:<10} | {total:<10}")
            grand_total += total
            
        print("-" * 60)
        print(f"{'GRAND TOTAL':<43} | {grand_total:<10}")
        print("="*60)

    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    enforce_section_limits()
