import random
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.teacher import Teacher, TeacherPreference
from models.academic import Course
from models.schedule import Section # Import Section to resolve relationship
from models.student import Student
from models.admin import Admin
from models.user import User

def add_dummy_data():
    db: Session = SessionLocal()
    try:
        teachers = db.query(Teacher).all()
        courses = db.query(Course).all()
        
        if not courses:
            print("No courses found. Please add courses first.")
            return

        print(f"Found {len(teachers)} teachers and {len(courses)} courses.")

        for teacher in teachers:
            # 1. Assign Faculty Type Randomly
            faculty_type = random.choice(['Permanent', 'Adjunct'])
            teacher.faculty_type = faculty_type
            print(f"Teacher {teacher.initial}: Assigned {faculty_type}")

            # 2. Clear existing preferences
            db.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).delete()

            # 3. Assign Preferences based on type
            target_credits = 12 if faculty_type == 'Permanent' else 3
            current_credits = 0
            
            # Shuffle courses to pick random ones
            random_courses = list(courses)
            random.shuffle(random_courses)
            
            for course in random_courses:
                if current_credits >= target_credits:
                    break
                
                # Determine how many sections (1 or 2)
                # For Adjunct (3 credits), usually 1 section of a 3 credit course
                # For Permanent (12 credits), maybe 4 sections of 3 credits
                
                sections_to_take = 1
                if faculty_type == 'Permanent' and current_credits + (course.credits * 2) <= target_credits:
                     sections_to_take = random.choice([1, 2])
                
                if current_credits + (course.credits * sections_to_take) <= target_credits + 2: # Allow slight overflow
                    pref = TeacherPreference(
                        teacher_id=teacher.id,
                        course_id=course.id,
                        section_count=sections_to_take,
                        status='accepted' # Directly accept for auto-scheduler
                    )
                    db.add(pref)
                    current_credits += (course.credits * sections_to_take)
                    print(f"  - Added Preference: {course.code} ({sections_to_take} sections)")

        db.commit()
        print("Dummy data added successfully.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_dummy_data()
