import sys
import os
from sqlalchemy import func

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Import all models to ensure they are registered with SQLAlchemy
from models import academic, admin, booking, schedule, settings, student, teacher, user, verification

from core.database import SessionLocal
from models.teacher import Teacher
from models.schedule import Section

def check_faculty_assignments():
    db = SessionLocal()
    try:
        # Get all active teachers
        teachers = db.query(Teacher).all()
        
        print(f"Total Teachers: {len(teachers)}")
        
        unassigned_teachers = []
        for teacher in teachers:
            # Count sections assigned to this teacher
            section_count = db.query(Section).filter(Section.teacher_id == teacher.id).count()
            if section_count == 0:
                unassigned_teachers.append(teacher)
            else:
                # print(f"{teacher.initial}: {section_count} sections")
                pass
                
        if unassigned_teachers:
            print(f"\nFound {len(unassigned_teachers)} teachers with 0 assigned sections:")
            for t in unassigned_teachers:
                print(f"- {t.initial} ({t.faculty_type})")
        else:
            print("\nAll teachers have at least one section assigned.")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_faculty_assignments()
