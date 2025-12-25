from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Body, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, case
from typing import List
from pydantic import BaseModel, EmailStr

from core.database import get_db
from core.security import get_admin_user, get_password_hash
from models.academic import Room, Course
from models.user import User, UserRole
from models.teacher import Teacher
from models.schedule import ClassSchedule, Section
from schemas.academic import RoomCreate, Room as RoomSchema, CourseCreate, Course as CourseSchema, PaginatedCourses, PaginatedRooms
from schemas.teacher import TeacherCreate, Teacher as TeacherSchema, TeacherUpdate, PaginatedTeachers
from schemas.user import User as UserSchema
from schemas.schedule import ClassSchedule as ClassScheduleSchema, PaginatedSchedules
from services.csv_service import parse_course_csv, parse_teacher_csv, parse_room_csv
from services.scheduler import ScheduleMatrix, schedule_extended_labs, schedule_standard_courses
from services.rag_service import trigger_rag_update, trigger_rag_delete, trigger_rag_bulk_delete
from core.constants import TIME_SLOTS

class BulkDeleteRequest(BaseModel):
    ids: List[int]

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(get_admin_user)]
)

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
    rag_text = f"Room {new_room.room_number} is a {new_room.type} room with capacity {new_room.capacity}."
    trigger_rag_update(background_tasks, f"room_{new_room.id}", rag_text, {"type": "room", "room_number": new_room.room_number})

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
    rag_text = f"Room {db_room.room_number} is a {db_room.type} room with capacity {db_room.capacity}."
    trigger_rag_update(background_tasks, f"room_{db_room.id}", rag_text, {"type": "room", "room_number": db_room.room_number})

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
            rag_text = f"Room {room.room_number} is a {room.type} room with capacity {room.capacity}."
            trigger_rag_update(background_tasks, f"room_{room.id}", rag_text, {"type": "room", "room_number": room.room_number})
            
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
    rag_text = f"Course {new_course.code}: {new_course.title} ({new_course.credits} credits). Type: {new_course.type}."
    trigger_rag_update(background_tasks, f"course_{new_course.id}", rag_text, {"type": "course", "code": new_course.code, "title": new_course.title})
        
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
    rag_text = f"Course {db_course.code}: {db_course.title} ({db_course.credits} credits). Type: {db_course.type}."
    trigger_rag_update(background_tasks, f"course_{db_course.id}", rag_text, {"type": "course", "code": db_course.code, "title": db_course.title})

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
        rag_text = f"Course {course.code}: {course.title} ({course.credits} credits). Type: {course.type}."
        trigger_rag_update(background_tasks, f"course_{course.id}", rag_text, {"type": "course", "code": course.code, "title": course.title})

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
    rag_text = f"Teacher {new_teacher.name} ({new_teacher.initial}). Email: {new_user.email}."
    trigger_rag_update(background_tasks, f"teacher_{new_teacher.id}", rag_text, {"type": "teacher", "initial": new_teacher.initial, "name": new_teacher.name})
    
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
    rag_text = f"Teacher {db_teacher.name} ({db_teacher.initial}). Email: {db_user.email if db_user else 'N/A'}."
    trigger_rag_update(background_tasks, f"teacher_{db_teacher.id}", rag_text, {"type": "teacher", "initial": db_teacher.initial, "name": db_teacher.name})

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
        rag_text = f"Teacher {teacher.name} ({teacher.initial}). Email: {db_user.email if db_user else 'N/A'}."
        trigger_rag_update(background_tasks, f"teacher_{teacher.id}", rag_text, {"type": "teacher", "initial": teacher.initial, "name": teacher.name})

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
    
    return new_admin

# --- Scheduler ---

@router.post("/schedule/auto")
def run_auto_scheduler(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Runs the auto-scheduler algorithm.
    1. Checks if Rooms, Teachers, and Courses exist.
    2. Clears existing auto-generated schedules (optional, but good for idempotency).
    3. Runs Pass 1: Extended Labs.
    4. Runs Pass 2: Standard Courses.
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

    # Initialize Matrix
    matrix = ScheduleMatrix(db)
    
    # Run Pass 1
    labs_scheduled = schedule_extended_labs(db, matrix)
    
    # Run Pass 2
    standard_scheduled = schedule_standard_courses(db, matrix)

    # RAG Update: Re-index all schedules
    schedules = db.query(ClassSchedule).join(Section).join(Course).join(Room).join(Teacher, Section.teacher_id == Teacher.id).all()
    
    for schedule in schedules:
        time_str = TIME_SLOTS.get(schedule.time_slot_id, "Unknown Time")
        rag_text = f"Class: {schedule.section.course.code} - {schedule.section.course.title} (Section {schedule.section.section_number}). " \
                   f"Teacher: {schedule.section.teacher.initial}. " \
                   f"Room: {schedule.room.room_number}. " \
                   f"Time: {schedule.day} {time_str}."
        
        trigger_rag_update(
            background_tasks, 
            f"schedule_{schedule.id}", 
            rag_text, 
            {
                "type": "schedule", 
                "course_code": schedule.section.course.code,
                "teacher_initial": schedule.section.teacher.initial,
                "room_number": schedule.room.room_number,
                "day": schedule.day
            }
        )
    
    return {
        "message": "Auto-scheduling completed",
        "extended_labs_scheduled": labs_scheduled,
        "standard_courses_scheduled": standard_scheduled,
        "total_scheduled": labs_scheduled + standard_scheduled
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
    query = db.query(ClassSchedule).join(Section).join(Course).join(Room).join(Teacher, Section.teacher_id == Teacher.id)
    
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
    if sort_by == 'course':
        column = Course.code
    elif sort_by == 'section':
        column = Section.section_number
    elif sort_by == 'faculty':
        column = Teacher.initial
    elif sort_by == 'room':
        column = Room.room_number
    elif sort_by == 'availability':
        column = ClassSchedule.availability
    elif sort_by == 'day':
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
    else:
        column = ClassSchedule.id

    if sort_order == 'desc':
        query = query.order_by(desc(column), ClassSchedule.time_slot_id.asc(), ClassSchedule.id.asc())
    else:
        query = query.order_by(asc(column), ClassSchedule.time_slot_id.asc(), ClassSchedule.id.asc())

    schedules = query.offset(skip).limit(limit).all()
    return {"items": schedules, "total": total, "page": page, "size": limit}

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
    db.query(ClassSchedule).filter(ClassSchedule.id.in_(request.ids)).delete(synchronize_session=False)
    db.commit()
    trigger_rag_bulk_delete(background_tasks, [f"schedule_{id}" for id in request.ids])
    return {"message": "Schedules deleted successfully"}

@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
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
    
    db.query(ClassSchedule).delete()
    db.commit()
    
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
    classes_per_day_dict = {day: count for day, count in classes_per_day}
    
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
        "total_schedules": total_schedules,
        "classes_per_day": classes_per_day_dict,
        "room_usage": room_usage_list
    }

