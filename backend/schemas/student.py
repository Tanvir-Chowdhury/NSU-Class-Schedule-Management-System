from pydantic import BaseModel
from typing import Optional

class StudentBase(BaseModel):
    name: Optional[str] = None
    nsu_id: Optional[str] = None
    cgpa: Optional[float] = None
    profile_picture: Optional[str] = None

class StudentUpdate(StudentBase):
    pass

class Student(StudentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
