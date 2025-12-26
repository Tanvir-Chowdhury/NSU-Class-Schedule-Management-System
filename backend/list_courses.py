import sys
import os

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

def list_courses():
    session: Session = SessionLocal()
    try:
        courses = session.query(Course).all()
        for course in courses:
            print(f"ID: {course.id}, Code: {course.code}, Type: {course.type}, Title: {course.title}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    list_courses()
