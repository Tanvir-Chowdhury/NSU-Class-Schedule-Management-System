from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from core.database import get_db
from core.security import get_current_active_user
from models.user import User
from models.teacher import Teacher, OfficeHour
from models.academic import Course
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

    # 2. Office Hours (list)
    office_hours = db.query(OfficeHour).filter(OfficeHour.teacher_id == teacher.id).all()
    office_hours_list = [
        f"{oh.day}: {oh.start_time} - {oh.end_time}" for oh in office_hours
    ]

    # 3. Pending Booking Requests
    pending_bookings = db.query(func.count(BookingRequest.id))\
        .filter(BookingRequest.user_id == current_user.id, BookingRequest.status == "PENDING").scalar()

    # 4. Total Credits (of assigned courses)
    # Get all distinct courses assigned to teacher
    assigned_courses = db.query(Course).join(Section).filter(Section.teacher_id == teacher.id).distinct().all()
    total_credits = sum(course.credits for course in assigned_courses)

    return {
        "total_courses": total_courses or 0,
        "office_hours": office_hours_list,
        "pending_bookings": pending_bookings or 0,
        "total_credits": total_credits or 0
    }
