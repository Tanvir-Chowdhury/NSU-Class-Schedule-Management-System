from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base

class Teacher(Base):
    """
    SQLAlchemy model for the Teacher table.
    """
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    initial = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)
    published_papers = Column(String, nullable=True)
    research_interests = Column(String, nullable=True)
    projects = Column(String, nullable=True)
    contact_details = Column(String, nullable=True)
    faculty_type = Column(String, nullable=True) # 'Permanent' or 'Adjunct'

    user = relationship("User", back_populates="teacher_profile")
    office_hours = relationship("OfficeHour", back_populates="teacher", cascade="all, delete-orphan")
    preferences = relationship("TeacherPreference", back_populates="teacher", cascade="all, delete-orphan")
    timing_preferences = relationship("TeacherTimingPreference", back_populates="teacher", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Teacher(initial='{self.initial}', name='{self.name}')>"

class TeacherPreference(Base):
    """
    SQLAlchemy model for Teacher Course Preferences.
    """
    __tablename__ = "teacher_preferences"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    section_count = Column(Integer, default=1)
    status = Column(String, default="pending")  # 'pending', 'accepted', 'rejected'

    teacher = relationship("Teacher", back_populates="preferences")
    course = relationship("Course")

    def __repr__(self):
        return f"<TeacherPreference(teacher_id={self.teacher_id}, course_id={self.course_id}, count={self.section_count})>"

class TeacherTimingPreference(Base):
    """
    SQLAlchemy model for Teacher Timing Preferences.
    """
    __tablename__ = "teacher_timing_preferences"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    day = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)

    teacher = relationship("Teacher", back_populates="timing_preferences")

class OfficeHour(Base):
    """
    SQLAlchemy model for Teacher Office Hours.
    """
    __tablename__ = "office_hours"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True) # Nullable for general office hours
    day = Column(String, nullable=False)
    start_time = Column(String, nullable=False) # Format "HH:MM AM/PM"
    end_time = Column(String, nullable=False)   # Format "HH:MM AM/PM"

    teacher = relationship("Teacher", back_populates="office_hours")
    course = relationship("Course")

    def __repr__(self):
        return f"<OfficeHour(day='{self.day}', time='{self.start_time}-{self.end_time}', course_id={self.course_id})>"
