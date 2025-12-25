from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base

class Student(Base):
    """
    SQLAlchemy model for the Student table.
    """
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=True)
    nsu_id = Column(String, unique=True, index=True, nullable=True)
    cgpa = Column(Float, nullable=True)
    profile_picture = Column(String, nullable=True)

    user = relationship("User", back_populates="student_profile")

    def __repr__(self):
        return f"<Student(nsu_id='{self.nsu_id}', cgpa={self.cgpa})>"
