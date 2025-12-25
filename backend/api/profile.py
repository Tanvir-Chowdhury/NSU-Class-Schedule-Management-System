from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import uuid

from core.database import get_db
from core.security import get_current_active_user, get_student_user, get_teacher_user, get_password_hash, verify_password
from models.academic import Room, Course
from models.user import User, UserRole
from models.student import Student
from models.teacher import Teacher, OfficeHour, TeacherPreference, TeacherTimingPreference
from models.admin import Admin
from models.schedule import Section, ClassSchedule
from schemas.student import StudentUpdate, Student as StudentSchema
from schemas.teacher import TeacherUpdate, Teacher as TeacherSchema, TeacherPreferenceCreate, TeacherPreference as TeacherPreferenceSchema
from schemas.user import UserUpdate, PasswordChange, User as UserSchema, UserProfile
from services.rag_service import trigger_rag_update
from core.constants import TIME_SLOTS

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

def construct_student_text(user: User, student: Student, db: Session) -> str:
    """
    Constructs a text representation of the student's profile for RAG.
    """
    text = f"Student Profile:\nEmail: {user.email}\n"
    if student.nsu_id:
        text += f"NSU ID: {student.nsu_id}\n"
    if student.cgpa:
        text += f"CGPA: {student.cgpa}\n"
    
    # Fetch current sections (Enrollment logic not fully implemented, assuming we might have a way or just skip for now)
    # Since we don't have an Enrollment model yet, we'll skip current sections for Student RAG text in this iteration.
    # If we had enrollments, we would list them here.
    
    return text

def construct_teacher_text(user: User, teacher: Teacher, db: Session) -> str:
    """
    Constructs a text representation of the teacher's profile for RAG.
    """
    text = f"Teacher Profile:\nName: {teacher.name}\nInitial: {teacher.initial}\nEmail: {user.email}\n"
    
    if teacher.published_papers:
        text += f"Published Papers: {teacher.published_papers}\n"
    if teacher.research_interests:
        text += f"Research Interests: {teacher.research_interests}\n"
    if teacher.projects:
        text += f"Projects: {teacher.projects}\n"
    if teacher.contact_details:
        text += f"Contact Details: {teacher.contact_details}\n"

    if teacher.office_hours:
        text += "Office Hours:\n"
        for oh in teacher.office_hours:
            course_info = f" (Course: {oh.course.code})" if oh.course else " (General)"
            text += f"- {oh.day}: {oh.start_time} - {oh.end_time}{course_info}\n"
    
    # Fetch assigned sections
    sections = db.query(Section).filter(Section.teacher_id == teacher.id).all()
    if sections:
        text += "Assigned Courses:\n"
        for section in sections:
            course = section.course
            text += f"- {course.code}: {course.title} (Section {section.section_number})\n"
            
            # Fetch schedules for this section
            schedules = db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).all()
            for sched in schedules:
                slot_time = TIME_SLOTS.get(sched.time_slot_id, "Unknown Time")
                text += f"  - {sched.day} {slot_time} (Room {sched.room.room_number})\n"
    
    return text

@router.get("/student", response_model=StudentSchema)
def get_student_profile(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_student_user)
):
    """
    Get current Student profile.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        # Create if not exists
        student = Student(user_id=current_user.id)
        db.add(student)
        db.commit()
        db.refresh(student)
    return student

@router.put("/student", response_model=StudentSchema)
def update_student_profile(
    profile_update: StudentUpdate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_student_user)
):
    """
    Update Student profile and trigger RAG update.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        # Create if not exists
        student = Student(user_id=current_user.id)
        db.add(student)
    
    if profile_update.name is not None:
        student.name = profile_update.name
    if profile_update.nsu_id is not None:
        student.nsu_id = profile_update.nsu_id
    if profile_update.cgpa is not None:
        student.cgpa = profile_update.cgpa
    if profile_update.profile_picture is not None:
        student.profile_picture = profile_update.profile_picture
    
    db.commit()
    db.refresh(student)
    
    # Trigger RAG Update
    data_text = construct_student_text(current_user, student, db)
    vector_id = f"{UserRole.STUDENT}_{current_user.id}"
    trigger_rag_update(background_tasks, vector_id, data_text, {"user_id": current_user.id, "role": UserRole.STUDENT})
    
    return student

@router.get("/teacher", response_model=TeacherSchema)
def get_teacher_profile(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_teacher_user)
):
    """
    Get current Teacher profile.
    """
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    print(f"DEBUG: Teacher ID={teacher.id}, Faculty Type={teacher.faculty_type}")
    return teacher

@router.put("/teacher", response_model=TeacherSchema)
def update_teacher_profile(
    profile_update: TeacherUpdate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_teacher_user)
):
    """
    Update Teacher profile and trigger RAG update.
    """
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    if profile_update.initial is not None:
        teacher.initial = profile_update.initial
    if profile_update.name is not None:
        teacher.name = profile_update.name
    if profile_update.profile_picture is not None:
        teacher.profile_picture = profile_update.profile_picture
    if profile_update.published_papers is not None:
        teacher.published_papers = profile_update.published_papers
    if profile_update.research_interests is not None:
        teacher.research_interests = profile_update.research_interests
    if profile_update.projects is not None:
        teacher.projects = profile_update.projects
    if profile_update.contact_details is not None:
        teacher.contact_details = profile_update.contact_details
    if profile_update.faculty_type is not None:
        teacher.faculty_type = profile_update.faculty_type
    
    if profile_update.office_hours is not None:
        # Clear existing office hours
        db.query(OfficeHour).filter(OfficeHour.teacher_id == teacher.id).delete()
        
        # Add new office hours
        for oh_data in profile_update.office_hours:
            new_oh = OfficeHour(
                teacher_id=teacher.id,
                day=oh_data.day,
                start_time=oh_data.start_time,
                end_time=oh_data.end_time,
                course_id=oh_data.course_id
            )
            db.add(new_oh)

    if profile_update.timing_preferences is not None:
        # Clear existing timing preferences
        db.query(TeacherTimingPreference).filter(TeacherTimingPreference.teacher_id == teacher.id).delete()
        
        # Add new timing preferences
        for tp_data in profile_update.timing_preferences:
            days_to_add = []
            if tp_data.day == 'ST':
                days_to_add = ['Sunday', 'Tuesday']
            elif tp_data.day == 'MW':
                days_to_add = ['Monday', 'Wednesday']
            elif tp_data.day == 'RA':
                days_to_add = ['Thursday', 'Saturday']
            else:
                days_to_add = [tp_data.day]

            for day in days_to_add:
                new_tp = TeacherTimingPreference(
                    teacher_id=teacher.id,
                    day=day,
                    start_time=tp_data.start_time,
                    end_time=tp_data.end_time
                )
                db.add(new_tp)

    db.commit()
    db.refresh(teacher)
    
    # Trigger RAG Update
    data_text = construct_teacher_text(current_user, teacher, db)
    vector_id = f"{UserRole.TEACHER}_{current_user.id}"
    trigger_rag_update(background_tasks, vector_id, data_text, {"user_id": current_user.id, "role": UserRole.TEACHER})
    
    return teacher

@router.get("/public/teacher/{teacher_id}", response_model=TeacherSchema)
def get_public_teacher_profile(
    teacher_id: int,
    db: Session = Depends(get_db)
):
    """
    Get public Teacher profile by ID. No auth required.
    """
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher

@router.get("/me", response_model=UserProfile)
def read_user_me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Construct the response manually or use a helper to fetch name based on role
    full_name = None
    profile_picture = None
    
    if current_user.role == UserRole.ADMIN:
        admin_profile = db.query(Admin).filter(Admin.user_id == current_user.id).first()
        if admin_profile:
            full_name = admin_profile.name
            profile_picture = admin_profile.profile_picture
    elif current_user.role == UserRole.TEACHER:
        teacher_profile = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if teacher_profile:
            full_name = teacher_profile.name
            profile_picture = teacher_profile.profile_picture
    elif current_user.role == UserRole.STUDENT:
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student_profile:
            full_name = student_profile.name
            profile_picture = student_profile.profile_picture
    
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        full_name=full_name,
        profile_picture=profile_picture
    )

@router.put("/me", response_model=UserProfile)
def update_user_me(
    user_update: UserUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Update current user's basic profile (name, email).
    """
    # Update Name
    if user_update.full_name is not None:
        if current_user.role == UserRole.ADMIN:
            admin_profile = db.query(Admin).filter(Admin.user_id == current_user.id).first()
            if not admin_profile:
                admin_profile = Admin(user_id=current_user.id)
                db.add(admin_profile)
            admin_profile.name = user_update.full_name
        elif current_user.role == UserRole.TEACHER:
            teacher_profile = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
            if teacher_profile:
                teacher_profile.name = user_update.full_name
        elif current_user.role == UserRole.STUDENT:
            student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
            if not student_profile:
                student_profile = Student(user_id=current_user.id)
                db.add(student_profile)
            student_profile.name = user_update.full_name
    
    # Update Email
    if user_update.email is not None and user_update.email != current_user.email:
        # Check if email exists
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email

    db.commit()
    db.refresh(current_user)
    
    # Re-fetch to get updated name
    return read_user_me(current_user, db)

@router.post("/change-password")
def change_password(
    password_data: PasswordChange, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Change current user's password.
    """
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.post("/upload-picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create upload directory if not exists
    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user profile
    image_url = f"http://localhost:8000/static/uploads/{filename}"
    
    if current_user.role == UserRole.ADMIN:
        admin = db.query(Admin).filter(Admin.user_id == current_user.id).first()
        if admin:
            admin.profile_picture = image_url
            db.commit()
    elif current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if teacher:
            teacher.profile_picture = image_url
            db.commit()
    elif current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            student.profile_picture = image_url
            db.commit()
    
    return {"profile_picture": image_url}

@router.delete("/student")
def delete_student_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_student_user)
):
    """
    Delete the current student's account and all associated data.
    """
    # Fetch student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    
    if student:
        db.delete(student)
    
    # Delete the user account
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account deleted successfully"}

@router.get("/teacher/preferences", response_model=List[TeacherPreferenceSchema])
def get_teacher_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher.preferences

@router.post("/teacher/preferences", response_model=List[TeacherPreferenceSchema])
def update_teacher_preferences(
    preferences: List[TeacherPreferenceCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_teacher_user)
):
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    if not teacher.faculty_type:
        raise HTTPException(status_code=400, detail="Please set your Faculty Type (Permanent/Adjunct) in Settings first.")

    # Calculate total credits
    total_credits = 0
    for pref in preferences:
        course = db.query(Course).filter(Course.id == pref.course_id).first()
        if course:
            total_credits += course.credits * pref.section_count
    
    # Validate credits
    if teacher.faculty_type == "Permanent" and total_credits < 12:
        raise HTTPException(status_code=400, detail=f"Permanent faculty must choose at least 12 credits. You selected {total_credits}.")
    elif teacher.faculty_type == "Adjunct" and total_credits < 3:
        raise HTTPException(status_code=400, detail=f"Adjunct faculty must choose at least 3 credits. You selected {total_credits}.")

    # Delete ALL existing preferences to ensure the new list is definitive
    # This resets 'accepted' preferences to 'pending' if they are re-submitted,
    # or removes them if they are not in the new list.
    db.query(TeacherPreference).filter(TeacherPreference.teacher_id == teacher.id).delete()

    # Add new preferences as 'pending'
    new_prefs = []
    for pref in preferences:
        new_pref = TeacherPreference(
            teacher_id=teacher.id,
            course_id=pref.course_id,
            section_count=pref.section_count,
            status='pending'
        )
        db.add(new_pref)
        new_prefs.append(new_pref)

    db.commit()
    for p in new_prefs:
        db.refresh(p)

    return new_prefs
