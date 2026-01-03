from pydantic import BaseModel
from enum import Enum
from typing import Optional, List

class ClassType(str, Enum):
    THEORY = "THEORY"
    LAB = "LAB"

class DurationMode(str, Enum):
    STANDARD = "STANDARD"
    EXTENDED = "EXTENDED"

# Room Schemas
class RoomBase(BaseModel):
    room_number: str
    capacity: int
    type: ClassType

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: int

    class Config:
        from_attributes = True

# Course Schemas
class CourseBase(BaseModel):
    code: str
    title: str
    credits: int
    type: ClassType
    duration_mode: DurationMode = DurationMode.STANDARD
    sections_count: Optional[int] = 0

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    sections_count: Optional[int] = 0

    class Config:
        from_attributes = True

class PaginatedCourses(BaseModel):
    items: List[Course]
    total: int
    page: int
    size: int

class PaginatedRooms(BaseModel):
    items: List[Room]
    total: int
    page: int
    size: int

