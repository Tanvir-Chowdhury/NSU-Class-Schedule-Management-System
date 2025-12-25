from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base

class Admin(Base):
    """
    SQLAlchemy model for the Admin table.
    """
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)

    user = relationship("User", back_populates="admin_profile")

    def __repr__(self):
        return f"<Admin(name='{self.name}')>"
