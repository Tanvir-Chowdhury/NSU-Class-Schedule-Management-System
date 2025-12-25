from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.security import get_current_active_user
from models.academic import Course
from schemas.academic import PaginatedCourses, Course as CourseSchema

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("", response_model=PaginatedCourses)
def read_courses(
    page: int = 1,
    limit: int = 1000,
    search: str = "",
    sort_by: str = "code",
    sort_order: str = "asc",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    skip = (page - 1) * limit
    query = db.query(Course)
    if search:
        search_term = f"%{search}%"
        query = query.filter((Course.code.ilike(search_term)) | (Course.title.ilike(search_term)))
    total = query.count()
    if sort_by == "code":
        if sort_order == "asc":
            query = query.order_by(Course.code.asc())
        else:
            query = query.order_by(Course.code.desc())
    items = query.offset(skip).limit(limit).all()
    return PaginatedCourses(items=items, total=total, page=page, size=limit)
