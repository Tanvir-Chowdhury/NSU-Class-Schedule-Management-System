from pydantic import BaseModel, computed_field
from typing import Optional, List
from datetime import datetime
from schemas.academic import Room, Course
from schemas.teacher import Teacher
from core.constants import TIME_SLOTS

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

    @computed_field
    def start_time(self) -> str:
        time_str = TIME_SLOTS.get(self.time_slot_id, "00:00 AM - 00:00 AM")
        start, _ = time_str.split(" - ")
        return self._convert_to_24h(start)

    @computed_field
    def end_time(self) -> str:
        time_str = TIME_SLOTS.get(self.time_slot_id, "00:00 AM - 00:00 AM")
        _, end = time_str.split(" - ")
        return self._convert_to_24h(end)

    def _convert_to_24h(self, time_str: str) -> str:
        try:
            return datetime.strptime(time_str, "%I:%M %p").strftime("%H:%M:%S")
        except ValueError:
            return "00:00:00"

    class Config:
        from_attributes = True

class ClassScheduleCreate(ClassScheduleBase):
    teacher_id: Optional[int] = None

class PaginatedSchedules(BaseModel):
    items: List[ClassSchedule]
    total: int
    page: int
    size: int
