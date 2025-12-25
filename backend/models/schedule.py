from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from core.database import Base

class Section(Base):
    """
    SQLAlchemy model for the Section table.
    Represents a specific offering of a Course by a Teacher.
    """
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    section_number = Column(Integer, nullable=False)

    course = relationship("Course", back_populates="sections")
    teacher = relationship("Teacher")
    schedules = relationship("ClassSchedule", back_populates="section")

    __table_args__ = (
        UniqueConstraint('course_id', 'section_number', name='unique_course_section'),
    )

    def __repr__(self):
        return f"<Section(course_id={self.course_id}, section={self.section_number}, teacher_id={self.teacher_id})>"

class ClassSchedule(Base):
    """
    SQLAlchemy model for the ClassSchedule table.
    Represents the time and room allocation for a Section.
    
    Constraint Note:
    - Application logic must ensure that a LAB course (via Section -> Course) 
      is not assigned to a THEORY room (via Room).
    """
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    day = Column(String, nullable=False)
    time_slot_id = Column(Integer, nullable=False)
    is_friday_booking = Column(Boolean, default=False)
    availability = Column(Integer, nullable=True)  # Snapshot of room capacity

    section = relationship("Section", back_populates="schedules")
    room = relationship("Room")

    def __repr__(self):
        return f"<ClassSchedule(section_id={self.section_id}, room_id={self.room_id}, day='{self.day}', slot={self.time_slot_id})>"
