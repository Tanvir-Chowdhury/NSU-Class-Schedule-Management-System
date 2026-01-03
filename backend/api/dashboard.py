from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Dict, Any, List
from datetime import datetime

from core.database import get_db
from core.security import get_current_active_user
from core.constants import TIME_SLOTS
from models.user import User
from models.teacher import Teacher, OfficeHour
from models.student import Student, Enrollment
from models.academic import Course, Room
from models.schedule import ClassSchedule, Section
from models.booking import BookingRequest

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/teacher/stats", response_model=Dict[str, Any])
def get_teacher_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Not authorized")

    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # 1. Total Courses (assigned in schedule)
    # Count distinct courses in Section for this teacher
    total_courses = db.query(func.count(func.distinct(Section.course_id)))\
        .filter(Section.teacher_id == teacher.id).scalar()

    # 2. Office Hours (Total Duration)
    office_hours = db.query(OfficeHour).filter(OfficeHour.teacher_id == teacher.id).all()
    total_minutes = 0
    for oh in office_hours:
        try:
            # Parse "HH:MM AM/PM"
            start = datetime.strptime(oh.start_time, "%I:%M %p")
            end = datetime.strptime(oh.end_time, "%I:%M %p")
            diff = end - start
            total_minutes += diff.total_seconds() / 60
        except Exception:
            pass # Skip invalid formats
            
    total_hours = round(total_minutes / 60, 1)
    # Format as "12h" or "12.5h"
    office_hours_display = f"{int(total_hours)}h" if total_hours.is_integer() else f"{total_hours}h"

    # 3. Pending Booking Requests
    pending_bookings = db.query(func.count(BookingRequest.id))\
        .filter(BookingRequest.user_id == current_user.id, BookingRequest.status == "PENDING").scalar()

    # 4. Total Credits (of assigned courses)
    # Sum credits of all sections assigned to teacher (e.g. 4 sections of 3 credits = 12 credits)
    total_credits = db.query(func.sum(Course.credits))\
        .join(Section, Section.course_id == Course.id)\
        .filter(Section.teacher_id == teacher.id).scalar()

    return {
        "total_courses": total_courses or 0,
        "office_hours": office_hours_display,
        "pending_bookings": pending_bookings or 0,
        "total_credits": total_credits or 0
    }

@router.get("/teacher/today", response_model=List[Dict[str, Any]])
def get_teacher_today_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="Not authorized")

    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Determine today's day
    today = datetime.now().strftime("%A") # e.g., "Monday"
    
    # Map to schedule days
    day_filters = [today]
    if today in ["Sunday", "Tuesday"]:
        day_filters.append("ST")
    if today in ["Monday", "Wednesday"]:
        day_filters.append("MW")
    if today == "Thursday":
        day_filters.append("RA")

    schedules = db.query(ClassSchedule).join(Section).join(Course).join(Room)\
        .filter(Section.teacher_id == teacher.id)\
        .filter(ClassSchedule.day.in_(day_filters))\
        .order_by(ClassSchedule.time_slot_id).all()

    result = []
    for sched in schedules:
        result.append({
            "time": TIME_SLOTS.get(sched.time_slot_id, "Unknown"),
            "code": sched.section.course.code,
            "title": sched.section.course.title,
            "room": sched.room.room_number,
            "type": "Lab" if sched.section.course.code.endswith("L") else "Lecture",
            "students": 0 # Placeholder
        })
    
    return result

@router.get("/student/today", response_model=List[Dict[str, Any]])
def get_student_today_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Not authorized")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Determine today's day
    today = datetime.now().strftime("%A")
    
    day_filters = [today]
    if today in ["Sunday", "Tuesday"]:
        day_filters.append("ST")
    if today in ["Monday", "Wednesday"]:
        day_filters.append("MW")
    if today == "Thursday":
        day_filters.append("RA")

    # Join Enrollment -> Section -> ClassSchedule
    schedules = db.query(ClassSchedule).join(Section).join(Enrollment)\
        .filter(Enrollment.student_id == student.id)\
        .filter(ClassSchedule.day.in_(day_filters))\
        .order_by(ClassSchedule.time_slot_id).all()

    result = []
    for sched in schedules:
        result.append({
            "time": TIME_SLOTS.get(sched.time_slot_id, "Unknown"),
            "code": sched.section.course.code,
            "title": sched.section.course.title,
            "room": sched.room.room_number,
            "type": "Lab" if sched.section.course.code.endswith("L") else "Lecture",
            "section": sched.section.section_number
        })
    
    return result

@router.get("/student/stats", response_model=Dict[str, Any])
def get_student_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Not authorized")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # 1. Enrolled Courses
    enrolled_count = db.query(Enrollment).filter(Enrollment.student_id == student.id).count()

    # 2. Upcoming Classes (Today's remaining classes)
    # Reuse logic from today schedule but filter by time? 
    # For simplicity, let's just return the count of today's classes.
    today = datetime.now().strftime("%A")
    day_filters = [today]
    if today in ["Sunday", "Tuesday"]:
        day_filters.append("ST")
    if today in ["Monday", "Wednesday"]:
        day_filters.append("MW")
    if today == "Thursday":
        day_filters.append("RA")

    today_classes_count = db.query(ClassSchedule).join(Section).join(Enrollment)\
        .filter(Enrollment.student_id == student.id)\
        .filter(ClassSchedule.day.in_(day_filters))\
        .count()

    # 3. Total Credits
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    total_credits = sum(e.section.course.credits for e in enrollments)

    return {
        "enrolled_courses": enrolled_count,
        "upcoming_classes": today_classes_count,
        "cgpa": student.cgpa if student.cgpa else "N/A",
        "total_credits": total_credits
    }
