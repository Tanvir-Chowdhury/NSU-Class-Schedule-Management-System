from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from core.database import get_db
from core.security import get_admin_user, get_current_active_user
from models.notification import Notification, NotificationRecipient, NotificationType
from models.user import User, UserRole
from schemas.notification import NotificationCreate, Notification as NotificationSchema, PaginatedNotifications

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.post("/admin/send", response_model=NotificationSchema)
def send_notification(
    notification: NotificationCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_admin_user)
):
    """
    Send a notification (Admin only).
    """
    # Validate recipients if SPECIFIC
    if notification.type == NotificationType.SPECIFIC and not notification.recipient_ids:
        raise HTTPException(status_code=400, detail="Recipient IDs are required for SPECIFIC notifications")

    new_notification = Notification(
        title=notification.title,
        message=notification.message,
        type=notification.type,
        sender_id=current_user.id
    )
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    if notification.type == NotificationType.SPECIFIC:
        recipients = []
        for uid in notification.recipient_ids:
            # Verify user exists
            user = db.query(User).filter(User.id == uid).first()
            if user:
                recipients.append(NotificationRecipient(notification_id=new_notification.id, user_id=uid))
        
        if recipients:
            db.add_all(recipients)
            db.commit()

    # Return schema with sender email
    return NotificationSchema(
        id=new_notification.id,
        title=new_notification.title,
        message=new_notification.message,
        type=new_notification.type,
        created_at=new_notification.created_at,
        sender_email=current_user.email,
        recipient_count=len(notification.recipient_ids) if notification.type == NotificationType.SPECIFIC else 0
    )

@router.get("/admin/history", response_model=PaginatedNotifications)
def get_admin_notifications(
    page: int = 1, 
    limit: int = 50, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_admin_user)
):
    """
    Get notification history (Admin only).
    """
    skip = (page - 1) * limit
    query = db.query(Notification).order_by(desc(Notification.created_at))
    
    total = query.count()
    notifications = query.offset(skip).limit(limit).all()
    
    # Map to schema
    items = []
    for n in notifications:
        count = 0
        if n.type == NotificationType.SPECIFIC:
            count = db.query(NotificationRecipient).filter(NotificationRecipient.notification_id == n.id).count()
        
        items.append(NotificationSchema(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type,
            created_at=n.created_at,
            sender_email=n.sender.email if n.sender else "Unknown",
            recipient_count=count
        ))

    return {"items": items, "total": total, "page": page, "size": limit}

@router.get("/my", response_model=List[NotificationSchema])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get notifications for the current user.
    """
    # 1. Get Broadcasts
    broadcast_types = [NotificationType.ALL]
    if current_user.role == UserRole.TEACHER:
        broadcast_types.append(NotificationType.ALL_TEACHERS)
    elif current_user.role == UserRole.STUDENT:
        broadcast_types.append(NotificationType.ALL_STUDENTS)
        
    broadcasts = db.query(Notification).filter(Notification.type.in_(broadcast_types)).all()
    
    # 2. Get Specific (where user is explicitly a recipient)
    # Note: We need to be careful not to duplicate if we use NotificationRecipient for read status of broadcasts too.
    # But for now, SPECIFIC type notifications MUST have a recipient row.
    specifics = db.query(Notification).join(NotificationRecipient).filter(
        NotificationRecipient.user_id == current_user.id,
        Notification.type == NotificationType.SPECIFIC
    ).all()
    
    all_notifications = broadcasts + specifics
    # Remove duplicates if any (though types should be distinct)
    all_notifications = list({n.id: n for n in all_notifications}.values())
    
    # Sort by date desc
    all_notifications.sort(key=lambda x: x.created_at, reverse=True)
    
    # Fetch read statuses
    read_statuses = db.query(NotificationRecipient).filter(
        NotificationRecipient.user_id == current_user.id
    ).all()
    read_map = {r.notification_id: r.is_read for r in read_statuses}

    # Map
    items = []
    for n in all_notifications:
        is_read = read_map.get(n.id, False)
        items.append(NotificationSchema(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type,
            created_at=n.created_at,
            sender_email=n.sender.email if n.sender else "Unknown",
            is_read=is_read
        ))
        
    return items

@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if notification exists
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Check if user is allowed to see this notification
    # (Simplified: if it's specific, they must be recipient. If broadcast, they must match role)
    # For now, we assume if they are calling this, they saw it in their list.
    
    recipient = db.query(NotificationRecipient).filter(
        NotificationRecipient.notification_id == notification_id,
        NotificationRecipient.user_id == current_user.id
    ).first()

    if recipient:
        recipient.is_read = True
    else:
        # Create new recipient record to mark as read (for broadcasts)
        recipient = NotificationRecipient(
            notification_id=notification_id,
            user_id=current_user.id,
            is_read=True
        )
        db.add(recipient)
    
    db.commit()
    return {"message": "Marked as read"}

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 1. Get Broadcasts
    broadcast_types = [NotificationType.ALL]
    if current_user.role == UserRole.TEACHER:
        broadcast_types.append(NotificationType.ALL_TEACHERS)
    elif current_user.role == UserRole.STUDENT:
        broadcast_types.append(NotificationType.ALL_STUDENTS)
        
    broadcasts = db.query(Notification).filter(Notification.type.in_(broadcast_types)).all()
    
    # 2. Get Specific
    specifics = db.query(Notification).join(NotificationRecipient).filter(
        NotificationRecipient.user_id == current_user.id,
        Notification.type == NotificationType.SPECIFIC
    ).all()
    
    all_notifications = broadcasts + specifics
    all_notifications = list({n.id: n for n in all_notifications}.values())
    
    # Fetch read statuses
    read_statuses = db.query(NotificationRecipient).filter(
        NotificationRecipient.user_id == current_user.id
    ).all()
    read_map = {r.notification_id: r.is_read for r in read_statuses}
    
    unread_count = 0
    for n in all_notifications:
        if not read_map.get(n.id, False):
            unread_count += 1
            
    return {"count": unread_count}
