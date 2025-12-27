from pydantic import BaseModel
from typing import Optional, List
from schemas.academic import Room, Course
from schemas.teacher import Teacher

class SectionBase(BaseModel):
    course_id: int
    teacher_id: Optional[int] = None
    section_number: int

class Section(SectionBase):
    id: int
    course: Course
    teacher: Optional[Teacher] = None

    class Config:
        from_attributes = True

class ClassScheduleBase(BaseModel):
    section_id: int
    room_id: int
    day: str
    time_slot_id: int
    is_friday_booking: bool
    availability: Optional[int] = None

class ClassSchedule(ClassScheduleBase):
    id: int
    section: Section
    room: Room

    class Config:
        from_attributes = True

class ClassScheduleCreate(ClassScheduleBase):
    teacher_id: Optional[int] = None

class PaginatedSchedules(BaseModel):
    items: List[ClassSchedule]
    total: int
    page: int
    size: int
