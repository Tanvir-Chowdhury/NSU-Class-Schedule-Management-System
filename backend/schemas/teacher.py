from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from schemas.academic import Course

class OfficeHourBase(BaseModel):
    day: str
    start_time: str
    end_time: str
    course_id: Optional[int] = None

class OfficeHourCreate(OfficeHourBase):
    pass

class OfficeHour(OfficeHourBase):
    id: int
    teacher_id: int

    class Config:
        from_attributes = True

class TeacherTimingPreferenceBase(BaseModel):
    day: str
    start_time: str
    end_time: str

class TeacherTimingPreferenceCreate(TeacherTimingPreferenceBase):
    pass

class TeacherTimingPreference(TeacherTimingPreferenceBase):
    id: int
    teacher_id: int

    class Config:
        from_attributes = True

class TeacherPreferenceBase(BaseModel):
    course_id: int
    section_count: int

class TeacherPreferenceCreate(TeacherPreferenceBase):
    pass

class TeacherBase(BaseModel):
    initial: str
    name: str
    profile_picture: Optional[str] = None
    published_papers: Optional[str] = None
    research_interests: Optional[str] = None
    projects: Optional[str] = None
    contact_details: Optional[str] = None
    faculty_type: Optional[str] = None

class TeacherUpdate(BaseModel):
    initial: Optional[str] = None
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    published_papers: Optional[str] = None
    research_interests: Optional[str] = None
    projects: Optional[str] = None
    contact_details: Optional[str] = None
    faculty_type: Optional[str] = None
    office_hours: Optional[List[OfficeHourCreate]] = None
    timing_preferences: Optional[List[TeacherTimingPreferenceCreate]] = None

class TeacherCreate(TeacherBase):
    email: EmailStr

    @field_validator('email')
    def validate_email_domain(cls, v):
        if not v.endswith('@northsouth.edu'):
            raise ValueError('Email must belong to the @northsouth.edu domain')
        return v

class Teacher(TeacherBase):
    id: int
    user_id: int
    office_hours: List[OfficeHour] = []
    timing_preferences: List[TeacherTimingPreference] = []

    class Config:
        from_attributes = True

class TeacherPreference(TeacherPreferenceBase):
    id: int
    teacher_id: int
    status: str
    teacher: Optional[Teacher] = None
    course: Optional[Course] = None
    
    class Config:
        from_attributes = True

class PaginatedTeachers(BaseModel):
    items: List[Teacher]
    total: int
    page: int
    size: int
