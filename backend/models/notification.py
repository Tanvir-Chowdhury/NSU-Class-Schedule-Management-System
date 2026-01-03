import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class NotificationType(str, enum.Enum):
    ALL = "ALL"
    ALL_TEACHERS = "ALL_TEACHERS"
    ALL_STUDENTS = "ALL_STUDENTS"
    SPECIFIC = "SPECIFIC"

class Notification(Base):
    """
    SQLAlchemy model for Notifications.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    sender = relationship("User", foreign_keys=[sender_id])
    recipients = relationship("NotificationRecipient", back_populates="notification", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Notification(id={self.id}, title='{self.title}', type='{self.type}')>"

class NotificationRecipient(Base):
    """
    Link table for specific recipients of a notification.
    """
    __tablename__ = "notification_recipients"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_read = Column(Boolean, default=False)

    notification = relationship("Notification", back_populates="recipients")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<NotificationRecipient(notification_id={self.notification_id}, user_id={self.user_id})>"
