from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Body, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, case
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import json

from core.database import get_db
from core.security import get_admin_user, get_password_hash
from models.academic import Room, Course, DurationMode, ClassType
from models.user import User, UserRole
from models.teacher import Teacher
from models.student import Student
from models.admin import Admin
from models.notification import Notification, NotificationRecipient, NotificationType
from models.schedule import ClassSchedule, Section
from schemas.academic import RoomCreate, Room as RoomSchema, CourseCreate, Course as CourseSchema, PaginatedCourses, PaginatedRooms
from schemas.teacher import TeacherCreate, Teacher as TeacherSchema, TeacherUpdate, PaginatedTeachers
from schemas.user import User as UserSchema
from schemas.schedule import ClassSchedule as ClassScheduleSchema, PaginatedSchedules, ClassScheduleCreate, Section as SectionSchema
from services.csv_service import parse_course_csv, parse_teacher_csv, parse_room_csv
from services.scheduler import AutoScheduler
from services.rag_service import trigger_rag_update, trigger_rag_delete, trigger_rag_bulk_delete, trigger_rag_bulk_update
from services.indexing_service import index_all_data, reindex_schedules_background
from core.constants import TIME_SLOTS

class BulkDeleteRequest(BaseModel):
    ids: List[int]

class TeacherAssignmentInfo(BaseModel):
    id: int
    initial: str
    name: str
    email: Optional[str] = None
    contact_details: Optional[str] = None
    assigned_sections: int
    status: str

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(get_admin_user)]
)

class UserSearchResponse(BaseModel):
    id: int
    name: Optional[str]
    email: str
    role: str

@router.get("/users/search", response_model=List[UserSearchResponse])
def search_users(
    q: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    results = []
    search_term = f"%{q}%"
    
    # Search Teachers
    teachers = db.query(Teacher).join(User).filter(
        (Teacher.name.ilike(search_term)) | (User.email.ilike(search_term)) | (Teacher.initial.ilike(search_term))
    ).limit(limit).all()
    
    for t in teachers:
        results.append({
            "id": t.user_id,
            "name": t.name,
            "email": t.user.email,
            "role": "TEACHER"
        })
        
    # Search Students
    students = db.query(Student).join(User).filter(
        (Student.name.ilike(search_term)) | (User.email.ilike(search_term)) | (Student.nsu_id.ilike(search_term))
    ).limit(limit).all()
    
    for s in students:
        results.append({
            "id": s.user_id,
            "name": s.name,
            "email": s.user.email,
            "role": "STUDENT"
        })
        
    # Sort by name and limit total
    results.sort(key=lambda x: (x['name'] or "").lower())
    return results[:limit]

# --- Room Management ---

@router.post("/rooms", response_model=RoomSchema)
def create_room(room: RoomCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_room = db.query(Room).filter(Room.room_number == room.room_number).first()
    if db_room:
        raise HTTPException(status_code=400, detail="Room already exists")
    new_room = Room(**room.model_dump())
    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    # RAG Update
    rag_data = {
        "type": "room",
        "room_number": new_room.room_number,
        "room_type": new_room.type,
        "capacity": new_room.capacity,
        "description": f"Room {new_room.room_number} is a {new_room.type} room with capacity {new_room.capacity}."
    }
    trigger_rag_update(background_tasks, f"room_{new_room.id}", json.dumps(rag_data), {"type": "room", "room_number": new_room.room_number})

    return new_room

@router.get("/rooms", response_model=PaginatedRooms)
def read_rooms(
    page: int = 1, 
    limit: int = 50, 
    search: str = "", 
    sort_by: str = "room_number", 
    sort_order: str = "asc", 
    db: Session = Depends(get_db)
):
    skip = (page - 1) * limit
    query = db.query(Room)
    
    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(Room.room_number.ilike(search_term))
    
    # Calculate total
    total = query.count()

    # Sort
    if hasattr(Room, sort_by):
        column = getattr(Room, sort_by)
        if sort_order == 'desc':
            query = query.order_by(desc(column), Room.id.asc())
        else:
            query = query.order_by(asc(column), Room.id.asc())
    else:
        query = query.order_by(asc(Room.room_number), Room.id.asc())

    rooms = query.offset(skip).limit(limit).all()
    return {"items": rooms, "total": total, "page": page, "size": limit}

@router.put("/rooms/{room_id}", response_model=RoomSchema)
def update_room(room_id: int, room: RoomCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_room = db.query(Room).filter(Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    for key, value in room.model_dump().items():
        setattr(db_room, key, value)
    
    db.commit()
    db.refresh(db_room)

    # RAG Update
    rag_data = {
        "type": "room",
        "room_number": db_room.room_number,
        "room_type": db_room.type,
        "capacity": db_room.capacity,
        "description": f"Room {db_room.room_number} is a {db_room.type} room with capacity {db_room.capacity}."
    }
    trigger_rag_update(background_tasks, f"room_{db_room.id}", json.dumps(rag_data), {"type": "room", "room_number": db_room.room_number})

    return db_room

@router.delete("/rooms/{room_id}")
def delete_room(room_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_room = db.query(Room).filter(Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(db_room)
    db.commit()

    # RAG Delete
    trigger_rag_delete(background_tasks, f"room_{room_id}")

    return {"message": "Room deleted successfully"}

@router.post("/upload-rooms", response_model=List[RoomSchema])
async def upload_rooms(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    rooms_data = await parse_room_csv(file)
    
    # Get all room numbers from the uploaded data
    room_numbers = [r.room_number for r in rooms_data]
    
    # Find existing rooms
    existing_rooms = db.query(Room.room_number).filter(Room.room_number.in_(room_numbers)).all()
    existing_room_numbers = {r[0] for r in existing_rooms}
    
    new_rooms = []
    for room_data in rooms_data:
        if room_data.room_number not in existing_room_numbers:
            new_rooms.append(Room(**room_data.model_dump()))
            existing_room_numbers.add(room_data.room_number) # Prevent duplicates within the file itself
            
    if new_rooms:
        db.add_all(new_rooms)
        db.commit()
        for room in new_rooms:
            db.refresh(room)
            # RAG Update
            rag_data = {
                "type": "room",
                "room_number": room.room_number,
                "room_type": room.type,
                "capacity": room.capacity,
                "description": f"Room {room.room_number} is a {room.type} room with capacity {room.capacity}."
            }
            trigger_rag_update(background_tasks, f"room_{room.id}", json.dumps(rag_data), {"type": "room", "room_number": room.room_number})
            
    return new_rooms

# --- Course Management ---

@router.post("/courses", response_model=CourseSchema)
def create_course(course: CourseCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_course = db.query(Course).filter(Course.code == course.code).first()
    if db_course:
        raise HTTPException(status_code=400, detail="Course already exists")
    
    course_dict = course.model_dump()
    sections_count = course_dict.pop('sections_count', 0)
    
    new_course = Course(**course_dict)
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    # Create sections if requested
    if sections_count and sections_count > 0:
        for i in range(sections_count):
            new_section = Section(
                course_id=new_course.id,
                section_number=i + 1,
                teacher_id=None
            )
            db.add(new_section)
        db.commit()
        db.refresh(new_course)
    
    # RAG Update
    rag_data = {
        "type": "course",
        "code": new_course.code,
        "title": new_course.title,
        "credits": new_course.credits,
        "description": f"Course {new_course.code}: {new_course.title} ({new_course.credits} credits). Type: {new_course.type}."
    }
    trigger_rag_update(background_tasks, f"course_{new_course.id}", json.dumps(rag_data), {"type": "course", "code": new_course.code, "title": new_course.title})
        
    return new_course

@router.get("/courses", response_model=PaginatedCourses)
def read_courses(
    page: int = 1, 
    limit: int = 50, 
    search: str = "", 
    sort_by: str = "code", 
    sort_order: str = "asc", 
    db: Session = Depends(get_db)
):
    skip = (page - 1) * limit
    query = db.query(Course)
    
    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Course.code.ilike(search_term)) | 
            (Course.title.ilike(search_term))
        )
    
    # Calculate total before grouping (for accurate pagination count)
    total = query.count()

    # Sort
    print(f"Sorting by: {sort_by}, Order: {sort_order}") # Debug log
    if sort_by == 'sections_count':
        query = query.outerjoin(Section).group_by(Course.id)
        if sort_order == 'desc':
            query = query.order_by(func.count(Section.id).desc(), Course.id.asc())
        else:
            query = query.order_by(func.count(Section.id).asc(), Course.id.asc())
    else:
        # Default columns
        if hasattr(Course, sort_by):
            column = getattr(Course, sort_by)
            if sort_order == 'desc':
                query = query.order_by(desc(column), Course.id.asc())
            else:
                query = query.order_by(asc(column), Course.id.asc())
        else:
            # Fallback to code if invalid sort column
            query = query.order_by(asc(Course.code), Course.id.asc())
    
    # Debug log the query
    # print(str(query.statement.compile(compile_kwargs={"literal_binds": True})))

    courses = query.offset(skip).limit(limit).all()
    return {"items": courses, "total": total, "page": page, "size": limit}

@router.put("/courses/{course_id}", response_model=CourseSchema)
def update_course(course_id: int, course: CourseCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Handle sections update
    if course.sections_count is not None:
        current_sections = db.query(Section).filter(Section.course_id == course_id).order_by(Section.section_number).all()
        current_count = len(current_sections)
        
        if course.sections_count > current_count:
            # Add sections
            to_add = course.sections_count - current_count
            last_section_num = current_sections[-1].section_number if current_sections else 0
            for i in range(to_add):
                new_section = Section(
                    course_id=course_id,
                    section_number=last_section_num + i + 1,
                    teacher_id=None # Requires nullable=True in DB
                )
                db.add(new_section)
        elif course.sections_count < current_count:
            # Remove sections (from the end)
            to_remove = current_count - course.sections_count
            sections_to_delete = current_sections[-to_remove:]
            for s in sections_to_delete:
                db.delete(s)

    for key, value in course.model_dump().items():
        if key != 'sections_count': # Skip sections_count as it's not a column
            setattr(db_course, key, value)
    
    db.commit()
    db.refresh(db_course)
    # Explicitly expire the sections relationship to ensure the count is updated in the response
    db.expire(db_course, ['sections'])

    # RAG Update
    rag_data = {
        "type": "course",
        "code": db_course.code,
        "title": db_course.title,
        "credits": db_course.credits,
        "description": f"Course {db_course.code}: {db_course.title} ({db_course.credits} credits). Type: {db_course.type}."
    }
    trigger_rag_update(background_tasks, f"course_{db_course.id}", json.dumps(rag_data), {"type": "course", "code": db_course.code, "title": db_course.title})

    return db_course

@router.delete("/courses/{course_id}")
def delete_course(course_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(db_course)
    db.commit()

    # RAG Delete
    trigger_rag_delete(background_tasks, f"course_{course_id}")

    return {"message": "Course deleted successfully"}

@router.post("/upload-courses", response_model=List[CourseSchema])
async def upload_courses(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    courses_data = await parse_course_csv(file)
    
    codes = [c.code for c in courses_data]
    existing_courses = db.query(Course.code).filter(Course.code.in_(codes)).all()
    existing_codes = {c[0] for c in existing_courses}
    
    new_courses = []
    for course_data in courses_data:
        if course_data.code not in existing_codes:
            course_dict = course_data.model_dump()
            sections_count = course_dict.pop('sections_count', 0)
            
            new_course = Course(**course_dict)
            db.add(new_course)
            db.flush() # Generate ID
            
            # Create sections if count > 0
            if sections_count and sections_count > 0:
                sections = [
                    Section(
                        course_id=new_course.id,
                        section_number=i + 1,
                        teacher_id=None
                    ) for i in range(sections_count)
                ]
                db.add_all(sections)
            
            new_courses.append(new_course)
            existing_codes.add(course_data.code)
            
    db.commit()
    for course in new_courses:
        db.refresh(course)
        # RAG Update
        rag_data = {
            "type": "course",
            "code": course.code,
            "title": course.title,
            "credits": course.credits,
            "description": f"Course {course.code}: {course.title} ({course.credits} credits). Type: {course.type}."
        }
        trigger_rag_update(background_tasks, f"course_{course.id}", json.dumps(rag_data), {"type": "course", "code": course.code, "title": course.title})

    return new_courses

# --- Teacher Management ---

@router.post("/teachers", response_model=TeacherSchema)
def create_teacher(teacher: TeacherCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == teacher.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Check if teacher profile exists (by initial)
    db_teacher = db.query(Teacher).filter(Teacher.initial == teacher.initial).first()
    if db_teacher:
        raise HTTPException(status_code=400, detail="Teacher with this initial already exists")

    # Generate Password: {initial}@{email_prefix}
    email_prefix = teacher.email.split('@')[0]
    password = f"{teacher.initial}@{email_prefix}"
    hashed_password = get_password_hash(password)

    # Create User
    new_user = User(
        email=teacher.email,
        password_hash=hashed_password,
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Teacher Profile
    new_teacher = Teacher(
        user_id=new_user.id,
        initial=teacher.initial,
        name=teacher.name,
        faculty_type=teacher.faculty_type,
        department=teacher.department
    )
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)

    # RAG Update
    rag_data = {
        "type": "teacher",
        "name": new_teacher.name,
        "initial": new_teacher.initial,
        "email": new_user.email,
        "department": new_teacher.department,
        "description": f"Teacher {new_teacher.name} ({new_teacher.initial}). Email: {new_user.email}."
    }
    trigger_rag_update(background_tasks, f"teacher_{new_teacher.id}", json.dumps(rag_data), {"type": "teacher", "initial": new_teacher.initial, "name": new_teacher.name})
    
    return new_teacher

@router.get("/teachers", response_model=PaginatedTeachers)
def read_teachers(
    page: int = 1, 
    limit: int = 50, 
    search: str = "", 
    sort_by: str = "initial", 
    sort_order: str = "asc", 
    db: Session = Depends(get_db)
):
    skip = (page - 1) * limit
    query = db.query(Teacher)
    
    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Teacher.name.ilike(search_term)) | 
            (Teacher.initial.ilike(search_term))
        )
    
    # Calculate total
    total = query.count()

    # Sort
    if hasattr(Teacher, sort_by):
        column = getattr(Teacher, sort_by)
        if sort_order == 'desc':
            query = query.order_by(desc(column), Teacher.id.asc())
        else:
            query = query.order_by(asc(column), Teacher.id.asc())
    else:
        query = query.order_by(asc(Teacher.initial), Teacher.id.asc())

    teachers = query.offset(skip).limit(limit).all()
    return {"items": teachers, "total": total, "page": page, "size": limit}

@router.put("/teachers/{teacher_id}", response_model=TeacherSchema)
def update_teacher(teacher_id: int, teacher_update: TeacherUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not db_teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    if teacher_update.initial:
        # Check uniqueness if changing initial
        if teacher_update.initial != db_teacher.initial:
            existing = db.query(Teacher).filter(Teacher.initial == teacher_update.initial).first()
            if existing:
                raise HTTPException(status_code=400, detail="Initial already taken")
        db_teacher.initial = teacher_update.initial
        
    if teacher_update.name:
        db_teacher.name = teacher_update.name
    
    if teacher_update.faculty_type:
        db_teacher.faculty_type = teacher_update.faculty_type
        
    if teacher_update.department:
        db_teacher.department = teacher_update.department
    
    db.commit()
    db.refresh(db_teacher)

    # RAG Update
    db_user = db.query(User).filter(User.id == db_teacher.user_id).first()
    
    # Fetch Office Hours
    office_hours_list = []
    office_hours_text = []
    for oh in db_teacher.office_hours:
        oh_str = f"{oh.day} {oh.start_time} - {oh.end_time}"
        if oh.course:
            oh_str += f" (for {oh.course.code})"
        office_hours_list.append({
            "day": oh.day,
            "start_time": oh.start_time,
            "end_time": oh.end_time,
            "course": oh.course.code if oh.course else "General"
        })
        office_hours_text.append(oh_str)
    
    office_hours_description = "; ".join(office_hours_text) if office_hours_text else "No office hours listed."

    rag_data = {
        "type": "teacher",
        "name": db_teacher.name,
        "initial": db_teacher.initial,
        "email": db_user.email if db_user else 'N/A',
        "department": db_teacher.department,
        "faculty_type": db_teacher.faculty_type,
        "research_interests": db_teacher.research_interests,
        "published_papers": db_teacher.published_papers,
        "projects": db_teacher.projects,
        "contact_details": db_teacher.contact_details,
        "profile_picture": db_teacher.profile_picture,
        "office_hours": office_hours_list,
        "description": f"Teacher {db_teacher.name} ({db_teacher.initial}) is a {db_teacher.faculty_type} faculty from the {db_teacher.department} department. Email: {db_user.email if db_user else 'N/A'}. Research interests: {db_teacher.research_interests}. Contact: {db_teacher.contact_details}. Office Hours: {office_hours_description}."
    }
    trigger_rag_update(background_tasks, f"teacher_{db_teacher.id}", json.dumps(rag_data), {"type": "teacher", "initial": db_teacher.initial, "name": db_teacher.name})

    return db_teacher

@router.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not db_teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Also delete the associated user
    db_user = db.query(User).filter(User.id == db_teacher.user_id).first()
    
    db.delete(db_teacher)
    if db_user:
        db.delete(db_user)
        
    db.commit()

    # RAG Delete
    trigger_rag_delete(background_tasks, f"teacher_{teacher_id}")

    return {"message": "Teacher and associated user account deleted successfully"}

@router.post("/upload-teachers", response_model=List[TeacherSchema])
async def upload_teachers(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    teachers_data = await parse_teacher_csv(file)
    
    emails = [t.email for t in teachers_data]
    initials = [t.initial for t in teachers_data]
    
    existing_users = db.query(User.email).filter(User.email.in_(emails)).all()
    existing_emails = {u[0] for u in existing_users}
    
    existing_teachers = db.query(Teacher.initial).filter(Teacher.initial.in_(initials)).all()
    existing_initials = {t[0] for t in existing_teachers}
    
    created_teachers = []
    
    for teacher_data in teachers_data:
        if teacher_data.email in existing_emails or teacher_data.initial in existing_initials:
            continue

        # Generate Password
        email_prefix = teacher_data.email.split('@')[0]
        password = f"{teacher_data.initial}@{email_prefix}"
        hashed_password = get_password_hash(password)

        # Create User
        new_user = User(
            email=teacher_data.email,
            password_hash=hashed_password,
            role=UserRole.TEACHER,
            is_active=True
        )
        db.add(new_user)
        db.flush() # Get ID

        # Create Teacher Profile
        new_teacher = Teacher(
            user_id=new_user.id,
            initial=teacher_data.initial,
            name=teacher_data.name
        )
        db.add(new_teacher)
        created_teachers.append(new_teacher)
        
        existing_emails.add(teacher_data.email)
        existing_initials.add(teacher_data.initial)
        
    db.commit()
    for teacher in created_teachers:
        db.refresh(teacher)
        # RAG Update
        db_user = db.query(User).filter(User.id == teacher.user_id).first()
        rag_data = {
            "type": "teacher",
            "name": teacher.name,
            "initial": teacher.initial,
            "email": db_user.email if db_user else 'N/A',
            "department": teacher.department,
            "description": f"Teacher {teacher.name} ({teacher.initial}). Email: {db_user.email if db_user else 'N/A'}."
        }
        trigger_rag_update(background_tasks, f"teacher_{teacher.id}", json.dumps(rag_data), {"type": "teacher", "initial": teacher.initial, "name": teacher.name})

    return created_teachers

# --- Admin Management ---

class AdminCreate(BaseModel):
    email: EmailStr

from models.admin import Admin
import secrets
import string
from services.email_service import send_email

@router.post("/create-admin", response_model=UserSchema)
def create_admin(admin_data: AdminCreate, db: Session = Depends(get_db)):
    """
    Create a new Admin user.
    Generates a random password and sends it via email.
    """
    db_user = db.query(User).filter(User.email == admin_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate random password
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for i in range(12))
    
    hashed_password = get_password_hash(password)
    new_admin = User(
        email=admin_data.email,
        password_hash=hashed_password,
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    # Create Admin Profile
    new_admin_profile = Admin(user_id=new_admin.id, name="Admin")
    db.add(new_admin_profile)
    db.commit()
    
    # Send email
    subject = "Welcome to CSE327 Admin Portal"
    body = f"Hello,\n\nYou have been added as an administrator.\n\nYour login credentials are:\nEmail: {admin_data.email}\nPassword: {password}\n\nPlease change your password after logging in."
    send_email(admin_data.email, subject, body)
    
    return new_admin

@router.get("/admins", response_model=List[UserSchema])
def read_admins(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.ADMIN).all()

@router.delete("/admins/{admin_id}")
def delete_admin(admin_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    if current_user.id == admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    admin_to_delete = db.query(User).filter(User.id == admin_id, User.role == UserRole.ADMIN).first()
    if not admin_to_delete:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Manually delete the Admin profile first to avoid foreign key constraint violation
    # (Since cascade might not be configured on the relationship)
    admin_profile = db.query(Admin).filter(Admin.user_id == admin_id).first()
    if admin_profile:
        db.delete(admin_profile)
        
    db.delete(admin_to_delete)
    db.commit()
    return {"message": "Admin deleted successfully"}

# --- Scheduler ---

@router.post("/schedule/auto")
def run_auto_scheduler(
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Runs the auto-scheduler algorithm.
    1. Checks if Rooms, Teachers, and Courses exist.
    2. Clears existing auto-generated schedules (optional, but good for idempotency).
    3. Runs Pass 1: Extended Labs.
    4. Runs Pass 2: Standard Courses.
    5. Notifies teachers about their new schedules.
    """
    # Check for prerequisites
    room_count = db.query(Room).count()
    teacher_count = db.query(Teacher).count()
    course_count = db.query(Course).count()

    if room_count == 0 or teacher_count == 0 or course_count == 0:
        missing = []
        if room_count == 0: missing.append("Rooms")
        if teacher_count == 0: missing.append("Teachers")
        if course_count == 0: missing.append("Courses")
        
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot run auto-scheduler. Missing data: {', '.join(missing)}. Please upload them first."
        )

    # Run Auto Scheduler
    scheduler = AutoScheduler(db)
    total_scheduled = scheduler.run()

    # Notify Teachers
    # Fetch all teachers with assigned sections
    teachers_with_sections = db.query(Teacher).join(Section).distinct().all()
    
    notifications_to_create = []
    recipients_to_create = []
    
    for teacher in teachers_with_sections:
        # Get all sections for this teacher
        sections = db.query(Section).filter(Section.teacher_id == teacher.id).all()
        
        if not sections:
            continue
            
        message_lines = ["You have been assigned the following courses for the upcoming semester:"]
        
        for section in sections:
            course = section.course
            schedules = db.query(ClassSchedule).filter(ClassSchedule.section_id == section.id).all()
            
            schedule_details = []
            for sched in schedules:
                time_str = TIME_SLOTS.get(sched.time_slot_id, "Unknown Time")
                schedule_details.append(f"{sched.day} {time_str} (Room {sched.room.room_number})")
            
            schedule_str = ", ".join(schedule_details)
            message_lines.append(f"- {course.code} {course.title} (Section {section.section_number}): {schedule_str}")
            
        message = "\n".join(message_lines)
        
        # Create Notification
        new_notification = Notification(
            title="New Course Schedule Assigned",
            message=message,
            type=NotificationType.SPECIFIC,
            sender_id=current_user.id
        )
        db.add(new_notification)
        db.flush() # Get ID
        
        # Create Recipient
        recipients_to_create.append(NotificationRecipient(
            notification_id=new_notification.id,
            user_id=teacher.user_id
        ))
        
    if recipients_to_create:
        db.add_all(recipients_to_create)
        db.commit()

    # RAG Update: Re-index all schedules in background
    # We offload the entire process (fetching + embedding + upserting) to a background task
    # to prevent blocking the main thread and causing timeouts/logouts.
    background_tasks.add_task(reindex_schedules_background)
    
    return {
        "message": "Auto-scheduling completed",
        "total_scheduled": total_scheduled
    }

@router.get("/schedules", response_model=PaginatedSchedules)
def read_schedules(
    page: int = 1, 
    limit: int = 50, 
    search: str = "", 
    sort_by: str = "day", 
    sort_order: str = "asc", 
    db: Session = Depends(get_db)
):
    """
    Returns all class schedules with pagination, search, and sorting.
    """
    skip = (page - 1) * limit
    query = db.query(ClassSchedule).join(Section).join(Course).join(Room).outerjoin(Teacher, Section.teacher_id == Teacher.id)
    
    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Course.code.ilike(search_term)) | 
            (Course.title.ilike(search_term)) |
            (Room.room_number.ilike(search_term)) |
            (Teacher.initial.ilike(search_term))
        )
    
    # Calculate total
    total = query.count()

    # Sort
    sort_keys = [k.strip() for k in sort_by.split(',')]
    sort_orders = [o.strip() for o in sort_order.split(',')]
    
    order_criteria = []
    
    for i, key in enumerate(sort_keys):
        direction = sort_orders[i] if i < len(sort_orders) else 'asc'
        
        column = None
        if key == 'course':
            column = Course.code
        elif key == 'section':
            column = Section.section_number
        elif key == 'faculty':
            column = Teacher.initial
        elif key == 'room':
            column = Room.room_number
        elif key == 'availability':
            column = ClassSchedule.availability
        elif key == 'day':
            column = case(
                (ClassSchedule.day == 'ST', 0),
                (ClassSchedule.day == 'Sunday', 0),
                (ClassSchedule.day == 'MW', 1),
                (ClassSchedule.day == 'Monday', 1),
                (ClassSchedule.day == 'Tuesday', 2),
                (ClassSchedule.day == 'Wednesday', 3),
                (ClassSchedule.day == 'RA', 4),
                (ClassSchedule.day == 'Thursday', 4),
                (ClassSchedule.day == 'Friday', 5),
                (ClassSchedule.day == 'Saturday', 6),
                else_=7
            )
        elif key == 'time':
            column = ClassSchedule.time_slot_id
        
        if column is not None:
            if direction == 'desc':
                order_criteria.append(desc(column))
            else:
                order_criteria.append(asc(column))

    # Always add tie-breakers
    order_criteria.extend([ClassSchedule.time_slot_id.asc(), ClassSchedule.id.asc()])
    
    query = query.order_by(*order_criteria)

    schedules = query.offset(skip).limit(limit).all()
    return {"items": schedules, "total": total, "page": page, "size": limit}

@router.get("/sections", response_model=List[SectionSchema])
def read_all_sections(db: Session = Depends(get_db)):
    return db.query(Section).all()

@router.post("/schedules", response_model=ClassScheduleSchema)
def create_schedule(schedule: ClassScheduleCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if section exists
    section = db.query(Section).filter(Section.id == schedule.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    # Check if room exists
    room = db.query(Room).filter(Room.id == schedule.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Validate Room Type
    if section.course.type != room.type:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot schedule {section.course.type.value} course in {room.type.value} room"
        )

    # Validate Lab Time Slots
    if section.course.duration_mode == DurationMode.EXTENDED:
        if schedule.time_slot_id not in [1, 3, 5]:
             raise HTTPException(status_code=400, detail="Lab classes must start at slot 1, 3, or 5")

    # Validate Day based on Course Type
    if section.course.type == ClassType.THEORY:
        if schedule.day not in ['ST', 'MW', 'RA']:
             raise HTTPException(status_code=400, detail="Theory courses must be scheduled on ST, MW, or RA days")
    elif section.course.type == ClassType.LAB:
        if schedule.day in ['ST', 'MW', 'RA']:
             raise HTTPException(status_code=400, detail="Lab courses must be scheduled on specific days (Sunday-Saturday)")

    # Update teacher if provided
    current_teacher_id = section.teacher_id
    if schedule.teacher_id is not None:
        # Verify teacher exists
        teacher = db.query(Teacher).filter(Teacher.id == schedule.teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        current_teacher_id = schedule.teacher_id

    # Determine required slots
    required_slots = [schedule.time_slot_id]
    if section.course.duration_mode == DurationMode.EXTENDED:
        if schedule.time_slot_id >= 7: # Assuming 7 is the last slot
             raise HTTPException(status_code=400, detail="Cannot schedule extended class in the last time slot")
        required_slots.append(schedule.time_slot_id + 1)

    created_schedules = []

    for slot_id in required_slots:
        # 1. Room Conflict
        room_conflict = db.query(ClassSchedule).filter(
            ClassSchedule.room_id == schedule.room_id,
            ClassSchedule.day == schedule.day,
            ClassSchedule.time_slot_id == slot_id
        ).first()
        if room_conflict:
             raise HTTPException(status_code=400, detail=f"Room is already booked for time slot {slot_id}")

        # 2. Section Conflict (Same section cannot be in two places)
        section_conflict = db.query(ClassSchedule).filter(
            ClassSchedule.section_id == schedule.section_id,
            ClassSchedule.day == schedule.day,
            ClassSchedule.time_slot_id == slot_id
        ).first()
        if section_conflict:
             raise HTTPException(status_code=400, detail=f"Section is already scheduled for time slot {slot_id}")

        # 3. Teacher Conflict
        if current_teacher_id:
            # Find all sections taught by this teacher
            teacher_section_ids = db.query(Section.id).filter(Section.teacher_id == current_teacher_id).all()
            teacher_section_ids = [s[0] for s in teacher_section_ids]
            
            if teacher_section_ids:
                teacher_conflict = db.query(ClassSchedule).filter(
                    ClassSchedule.section_id.in_(teacher_section_ids),
                    ClassSchedule.day == schedule.day,
                    ClassSchedule.time_slot_id == slot_id
                ).first()
                if teacher_conflict:
                    raise HTTPException(status_code=400, detail=f"Teacher is already teaching another class at time slot {slot_id}")

    # If all checks pass, update section teacher if needed
    if schedule.teacher_id is not None and section.teacher_id != schedule.teacher_id:
        section.teacher_id = schedule.teacher_id
        db.add(section)
        db.commit()
        db.refresh(section)

    # If all checks pass, create schedules
    for slot_id in required_slots:
        new_schedule = ClassSchedule(
            section_id=schedule.section_id,
            room_id=schedule.room_id,
            day=schedule.day,
            time_slot_id=slot_id,
            is_friday_booking=schedule.is_friday_booking
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)
        created_schedules.append(new_schedule)
        
        # RAG Update
        time_str = TIME_SLOTS.get(slot_id, "Unknown Time")
        rag_data = {
            "type": "schedule",
            "course_code": section.course.code,
            "course_title": section.course.title,
            "section_number": section.section_number,
            "teacher_initial": section.teacher.initial if section.teacher else 'TBA',
            "room_number": room.room_number,
            "day": schedule.day,
            "time": time_str,
            "description": f"Class: {section.course.code} - {section.course.title} (Section {section.section_number}). Teacher: {section.teacher.initial if section.teacher else 'TBA'}. Room: {room.room_number}. Time: {schedule.day} {time_str}."
        }
        
        trigger_rag_update(
            background_tasks, 
            f"schedule_{new_schedule.id}", 
            json.dumps(rag_data), 
            {
                "type": "schedule", 
                "course_code": section.course.code,
                "teacher_initial": section.teacher.initial if section.teacher else 'TBA',
                "room_number": room.room_number,
                "day": schedule.day
            }
        )

    return created_schedules[0]

@router.get("/teacher-assignments", response_model=List[TeacherAssignmentInfo])
def get_teacher_assignments(db: Session = Depends(get_db)):
    """
    Get assignment status for all teachers.
    """
    teachers = db.query(Teacher).filter(Teacher.initial != 'TBA').all()
    result = []
    for teacher in teachers:
        assigned_count = db.query(Section).filter(Section.teacher_id == teacher.id).count()
        status = "Assigned" if assigned_count > 0 else "Unassigned"
        
        result.append({
            "id": teacher.id,
            "initial": teacher.initial,
            "name": teacher.name,
            "email": teacher.email,
            "contact_details": teacher.contact_details,
            "assigned_sections": assigned_count,
            "status": status
        })
    return result

@router.post("/rooms/bulk-delete")
def delete_rooms_bulk(request: BulkDeleteRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db.query(Room).filter(Room.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    trigger_rag_bulk_delete(background_tasks, [f"room_{id}" for id in request.ids])
    return {"message": "Rooms deleted successfully"}

@router.post("/courses/bulk-delete")
def delete_courses_bulk(request: BulkDeleteRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db.query(Course).filter(Course.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    trigger_rag_bulk_delete(background_tasks, [f"course_{id}" for id in request.ids])
    return {"message": "Courses deleted successfully"}

@router.post("/teachers/bulk-delete")
def delete_teachers_bulk(request: BulkDeleteRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Get teachers to delete
    teachers = db.query(Teacher).filter(Teacher.id.in_(request.ids)).all()
    user_ids = [t.user_id for t in teachers]
    
    # Delete teachers
    db.query(Teacher).filter(Teacher.id.in_(request.ids)).delete(synchronize_session=False)
    
    # Delete associated users
    if user_ids:
        db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
        
    db.commit()
    trigger_rag_bulk_delete(background_tasks, [f"teacher_{id}" for id in request.ids])
    return {"message": "Teachers and associated user accounts deleted successfully"}

@router.post("/schedules/bulk-delete")
def delete_schedules_bulk(request: BulkDeleteRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Get section IDs associated with these schedules to reset teacher assignment
    schedules = db.query(ClassSchedule).filter(ClassSchedule.id.in_(request.ids)).all()
    section_ids = [s.section_id for s in schedules]
    
    if section_ids:
        db.query(Section).filter(Section.id.in_(section_ids)).update({Section.teacher_id: None}, synchronize_session=False)

    db.query(ClassSchedule).filter(ClassSchedule.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    trigger_rag_bulk_delete(background_tasks, [f"schedule_{id}" for id in request.ids])
    return {"message": "Schedules deleted successfully"}

@router.put("/schedules/{schedule_id}", response_model=ClassScheduleSchema)
def update_schedule(
    schedule_id: int, 
    schedule_update: ClassScheduleCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    # Fetch existing schedule to get the section
    db_schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    section_id = db_schedule.section_id
    section = db.query(Section).filter(Section.id == section_id).first()
    
    # Validate New Room
    room = db.query(Room).filter(Room.id == schedule_update.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if section.course.type != room.type:
        raise HTTPException(status_code=400, detail=f"Room type mismatch. Course is {section.course.type.value}, Room is {room.type.value}")

    # Determine slots to book
    slots_to_book = [schedule_update.time_slot_id]
    if section.course.duration_mode == DurationMode.EXTENDED:
        if schedule_update.time_slot_id not in [1, 3, 5]:
             raise HTTPException(status_code=400, detail="Lab classes must start at slot 1, 3, or 5")
        slots_to_book.append(schedule_update.time_slot_id + 1)

    # Validate Day based on Course Type
    if section.course.type == ClassType.THEORY:
        if schedule_update.day not in ['ST', 'MW', 'RA']:
             raise HTTPException(status_code=400, detail="Theory courses must be scheduled on ST, MW, or RA days")
    elif section.course.type == ClassType.LAB:
        if schedule_update.day in ['ST', 'MW', 'RA']:
             raise HTTPException(status_code=400, detail="Lab courses must be scheduled on specific days (Sunday-Saturday)")

    # Determine effective teacher ID
    current_teacher_id = section.teacher_id
    if schedule_update.teacher_id is not None:
        # Verify teacher exists
        teacher = db.query(Teacher).filter(Teacher.id == schedule_update.teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        current_teacher_id = schedule_update.teacher_id

    # Check Conflicts (excluding this section's current schedules)
    for slot_id in slots_to_book:
        # Room Conflict
        room_conflict = db.query(ClassSchedule).filter(
            ClassSchedule.room_id == schedule_update.room_id,
            ClassSchedule.day == schedule_update.day,
            ClassSchedule.time_slot_id == slot_id,
            ClassSchedule.section_id != section_id # Exclude self
        ).first()
        if room_conflict:
             raise HTTPException(status_code=400, detail=f"Room is already booked for time slot {slot_id}")

        # Teacher Conflict
        if current_teacher_id:
            teacher_section_ids = db.query(Section.id).filter(Section.teacher_id == current_teacher_id).all()
            teacher_section_ids = [s[0] for s in teacher_section_ids]
            
            if teacher_section_ids:
                teacher_conflict = db.query(ClassSchedule).filter(
                    ClassSchedule.section_id.in_(teacher_section_ids),
                    ClassSchedule.day == schedule_update.day,
                    ClassSchedule.time_slot_id == slot_id,
                    ClassSchedule.section_id != section_id # Exclude self
                ).first()
                if teacher_conflict:
                    raise HTTPException(status_code=400, detail=f"Teacher is already teaching another class at time slot {slot_id}")

    # Update teacher if changed
    if schedule_update.teacher_id is not None and section.teacher_id != schedule_update.teacher_id:
        section.teacher_id = schedule_update.teacher_id
        db.add(section)
        db.commit()
        db.refresh(section)

    # Delete OLD schedules for this section
    db.query(ClassSchedule).filter(ClassSchedule.section_id == section_id).delete()
    
    # Create NEW schedules
    new_schedules = []
    for slot_id in slots_to_book:
        new_sched = ClassSchedule(
            section_id=section_id,
            room_id=schedule_update.room_id,
            day=schedule_update.day,
            time_slot_id=slot_id,
            availability=room.capacity
        )
        db.add(new_sched)
        new_schedules.append(new_sched)
        
    db.commit()
    
    # RAG Update
    time_str = TIME_SLOTS.get(new_schedules[0].time_slot_id, "Unknown Time")
    teacher_initial = section.teacher.initial if section.teacher else "TBA"
    rag_data = {
        "type": "schedule",
        "course_code": section.course.code,
        "course_title": section.course.title,
        "section_number": section.section_number,
        "teacher_initial": teacher_initial,
        "room_number": room.room_number,
        "day": schedule_update.day,
        "time": time_str,
        "description": f"Class: {section.course.code} - {section.course.title} (Section {section.section_number}). Teacher: {teacher_initial}. Room: {room.room_number}. Time: {schedule_update.day} {time_str}."
    }
    
    # We use the ID of the first schedule created as the vector ID
    trigger_rag_update(
        background_tasks, 
        f"schedule_{new_schedules[0].id}", 
        json.dumps(rag_data), 
        {
            "type": "schedule", 
            "course_code": section.course.code,
            "teacher_initial": teacher_initial,
            "room_number": room.room_number,
            "day": schedule_update.day
        }
    )
    
    return new_schedules[0]

@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Reset teacher_id for the section
    db.query(Section).filter(Section.id == db_schedule.section_id).update({Section.teacher_id: None}, synchronize_session=False)
    
    db.delete(db_schedule)
    db.commit()
    trigger_rag_delete(background_tasks, f"schedule_{schedule_id}")
    return {"message": "Schedule deleted successfully"}

@router.delete("/schedules")
def delete_all_schedules(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Delete ALL class schedules.
    """
    # Get all IDs first to delete from RAG
    all_ids = [s.id for s in db.query(ClassSchedule.id).all()]
    
    try:
        # Reset teacher assignments in Sections
        db.query(Section).update({Section.teacher_id: None}, synchronize_session=False)
        
        # Delete all schedules
        db.query(ClassSchedule).delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete schedules: {str(e)}")
    
    if all_ids:
        trigger_rag_bulk_delete(background_tasks, [f"schedule_{id}" for id in all_ids])
        
    return {"message": "All schedules deleted successfully"}

@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_teachers = db.query(Teacher).count()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_courses = db.query(Course).count()
    total_rooms = db.query(Room).count()
    total_schedules = db.query(ClassSchedule).count()
    
    # Distribution of classes per day
    classes_per_day = db.query(ClassSchedule.day, func.count(ClassSchedule.id)).group_by(ClassSchedule.day).all()
    raw_counts = {day: count for day, count in classes_per_day}
    
    # Distribute combined patterns (ST, MW, RA) into single days
    final_counts = {
        'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 
        'Thursday': 0, 'Friday': 0, 'Saturday': 0
    }
    
    for day, count in raw_counts.items():
        if day == 'ST':
            final_counts['Sunday'] += count
            final_counts['Tuesday'] += count
        elif day == 'MW':
            final_counts['Monday'] += count
            final_counts['Wednesday'] += count
        elif day == 'RA':
            final_counts['Thursday'] += count
            final_counts['Saturday'] += count
        elif day in final_counts:
            final_counts[day] += count
            
    classes_per_day_dict = final_counts
    
    # Calculate total class sessions (sum of all daily counts)
    # This ensures the "Scheduled Classes" card matches the sum of the "Weekly Class Distribution" chart
    total_class_sessions = sum(final_counts.values())
    
    # Room usage (top 5 busiest rooms)
    room_usage = db.query(Room.room_number, func.count(ClassSchedule.id).label('count'))\
        .join(ClassSchedule, Room.id == ClassSchedule.room_id)\
        .group_by(Room.id)\
        .order_by(desc('count'))\
        .limit(5)\
        .all()
    
    room_usage_list = [{"name": r[0], "value": r[1]} for r in room_usage]

    return {
        "total_teachers": total_teachers,
        "total_students": total_students,
        "total_courses": total_courses,
        "total_rooms": total_rooms,
        "total_schedules": total_class_sessions,
        "classes_per_day": classes_per_day_dict,
        "room_usage": room_usage_list
    }

@router.post("/reindex-rag")
def reindex_rag_database(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Triggers a full re-indexing of the database into the RAG vector store.
    """
    background_tasks.add_task(index_all_data, db)
    return {"message": "RAG re-indexing started in the background."}


