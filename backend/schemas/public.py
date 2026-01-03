from pydantic import BaseModel
from typing import Optional

class TeacherPublicResponse(BaseModel):
    id: int
    name: str
    initial: str
    email: str
    profile_picture: Optional[str] = None
    department: Optional[str] = None
    faculty_type: Optional[str] = None
    contact_details: Optional[str] = None
    research_interests: Optional[str] = None
    projects: Optional[str] = None
    
    class Config:
        from_attributes = True