from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models.notification import NotificationType

class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType

class NotificationCreate(NotificationBase):
    recipient_ids: Optional[List[int]] = []

class Notification(NotificationBase):
    id: int
    created_at: datetime
    sender_email: Optional[str] = None
    recipient_count: Optional[int] = 0 # Helper for display
    is_read: bool = False

    class Config:
        from_attributes = True

class PaginatedNotifications(BaseModel):
    items: List[Notification]
    total: int
    page: int
    size: int
