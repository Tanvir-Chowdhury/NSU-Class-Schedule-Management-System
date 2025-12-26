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
    enrollments = relationship("Enrollment", back_populates="student")

    def __repr__(self):
        return f"<Student(nsu_id='{self.nsu_id}', cgpa={self.cgpa})>"

class Enrollment(Base):
    """
    SQLAlchemy model for Student Enrollments in Sections.
    """
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    
    student = relationship("Student", back_populates="enrollments")
    section = relationship("Section", back_populates="enrollments")

