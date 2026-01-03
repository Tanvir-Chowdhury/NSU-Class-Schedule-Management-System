from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Any, Dict
from datetime import datetime
from pydantic import BaseModel

from core.database import get_db
from core.security import get_current_active_user
from core.constants import TIME_SLOTS
from models.user import User
from models.student import Student, Enrollment
from models.schedule import Section, ClassSchedule
from models.academic import Course, Room
from models.teacher import Teacher

router = APIRouter(prefix="/student", tags=["student"])

class EnrollmentRequest(BaseModel):
    section_id: int

@router.get("/available-sections")
def get_available_sections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Fetch all sections with course and teacher info
    sections = db.query(Section).join(Course).all()
    
    result = []
    for section in sections:
        course = section.course
        teacher = section.teacher
        
        # Get schedule for this section
        schedules = db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).all()
        schedule_text = []
        for sched in schedules:
            time_str = TIME_SLOTS.get(sched.time_slot_id, "Unknown")
            schedule_text.append(f"{sched.day} {time_str} ({sched.room.room_number})")
            
        result.append({
            "id": section.id,
            "course_code": course.code,
            "course_title": course.title,
            "credits": course.credits,
            "section_number": section.section_number,
            "teacher": teacher.name if teacher else "TBA",
            "schedule": schedule_text
        })
        
    return result

@router.post("/enroll")
def enroll_in_section(
    request: EnrollmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Check if already enrolled in this section
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.section_id == request.section_id
    ).first()
    
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="Already enrolled in this section")
        
    # Check if already enrolled in another section of the same course
    section_to_enroll = db.query(Section).filter(Section.id == request.section_id).first()
    if not section_to_enroll:
        raise HTTPException(status_code=404, detail="Section not found")
        
    same_course_enrollment = db.query(Enrollment).join(Section).filter(
        Enrollment.student_id == student.id,
        Section.course_id == section_to_enroll.course_id
    ).first()
    
    if same_course_enrollment:
        raise HTTPException(status_code=400, detail="Already enrolled in a section for this course")

    # TODO: Check for time conflicts with other enrolled sections
    
    new_enrollment = Enrollment(student_id=student.id, section_id=request.section_id)
    db.add(new_enrollment)
    db.commit()
    
    return {"message": "Enrolled successfully"}

@router.delete("/enrollments/{enrollment_id}")
def drop_course(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id,
        Enrollment.student_id == student.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
        
    db.delete(enrollment)
    db.commit()
    
    return {"message": "Course dropped successfully"}

@router.get("/enrollments")
def get_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    
    result = []
    for enrollment in enrollments:
        section = enrollment.section
        course = section.course
        teacher = section.teacher
        
        # Get schedule for this section
        schedules = db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).all()
        schedule_text = []
        for sched in schedules:
            time_str = TIME_SLOTS.get(sched.time_slot_id, "Unknown")
            schedule_text.append(f"{sched.day} {time_str} ({sched.room.room_number})")
            
        result.append({
            "id": enrollment.id,
            "course_code": course.code,
            "course_title": course.title,
            "credits": course.credits,
            "section": section.section_number,
            "teacher": teacher.name if teacher else "TBA",
            "schedule": schedule_text
        })
        
    return result
