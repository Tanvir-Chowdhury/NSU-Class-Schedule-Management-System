from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, defer
from sqlalchemy import or_
from typing import List, Optional, Dict
from core.database import get_db
from models.teacher import Teacher
from models.user import User
from schemas.public import TeacherPublicResponse

router = APIRouter(prefix="/public", tags=["Public Data"])

@router.get("/filters")
def get_teacher_filters(db: Session = Depends(get_db)):
    """
    Fetch distinct departments and faculty types present in the database
    to populate frontend dropdowns dynamically.
    """
    # Fetch distinct departments (exclude nulls)
    depts = db.query(Teacher.department).distinct().filter(Teacher.department != None).all()
    # Fetch distinct faculty types (exclude nulls)
    types = db.query(Teacher.faculty_type).distinct().filter(Teacher.faculty_type != None).all()
    
    return {
        "departments": sorted([d[0] for d in depts if d[0]]),
        "faculty_types": sorted([t[0] for t in types if t[0]])
    }

@router.get("/teachers", response_model=List[TeacherPublicResponse])
def get_public_teachers(
    search: Optional[str] = None,
    department: Optional[str] = None,
    faculty_type: Optional[str] = None,
    sort_by: Optional[str] = "name",
    db: Session = Depends(get_db)
):
    # Join Teacher with User to access email
    query = db.query(Teacher, User).join(User, Teacher.user_id == User.id).filter(User.is_active == True)

    # 1. Search Logic
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Teacher.name.ilike(search_term),
                Teacher.initial.ilike(search_term)
            )
        )

    # 2. Filter Logic
    if department and department != "All":
        query = query.filter(Teacher.department == department)
    
    if faculty_type and faculty_type != "All":
        query = query.filter(Teacher.faculty_type == faculty_type)

    # 3. Sorting Logic
    if sort_by == "initial":
        query = query.order_by(Teacher.initial.asc())
    elif sort_by == "department":
        query = query.order_by(Teacher.department.asc())
    else:
        # Default to name
        query = query.order_by(Teacher.name.asc())

    results = query.all()

    # Map the SQLAlchemy result tuple (Teacher, User) to the Pydantic schema
    response_data = []
    for teacher, user in results:
        response_data.append({
            "id": teacher.id,
            "name": teacher.name,
            "initial": teacher.initial,
            "email": user.email,
            "profile_picture": teacher.profile_picture, 
            "department": teacher.department, 
            "faculty_type": teacher.faculty_type,
            "contact_details": teacher.contact_details,
            "research_interests": teacher.research_interests,
            "projects": teacher.projects,
            "published_papers": teacher.published_papers # Ensure this is passed
        })
    
    return response_data