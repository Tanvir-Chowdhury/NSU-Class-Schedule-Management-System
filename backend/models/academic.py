import enum
from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from core.database import Base

class ClassType(str, enum.Enum):
    """
    Enumeration for Class Types (Theory or Lab).
    """
    THEORY = "THEORY"
    LAB = "LAB"

class DurationMode(str, enum.Enum):
    """
    Enumeration for Course Duration Modes.
    
    STANDARD: Represents a standard class duration (typically 1 hour 30 minutes).
              Occupies 1 time slot.
    EXTENDED: Represents an extended class duration (typically 3 hours 10 minutes).
              Occupies 2 consecutive time slots.
    """
    STANDARD = "STANDARD"
    EXTENDED = "EXTENDED"

class Room(Base):
    """
    SQLAlchemy model for the Room table.
    Represents a physical classroom or laboratory.
    """
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, unique=True, index=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    type = Column(Enum(ClassType), nullable=False)

    def __repr__(self):
        return f"<Room(room_number='{self.room_number}', type='{self.type}', capacity={self.capacity})>"

class Course(Base):
    """
    SQLAlchemy model for the Course table.
    Represents an academic course offered by the institution.
    """
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    credits = Column(Integer, nullable=False)
    type = Column(Enum(ClassType), nullable=False)
    duration_mode = Column(Enum(DurationMode), default=DurationMode.STANDARD, nullable=False)

    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan")

    @property
    def sections_count(self):
        return len(self.sections)

    def __repr__(self):
        return f"<Course(code='{self.code}', title='{self.title}', type='{self.type}')>"
