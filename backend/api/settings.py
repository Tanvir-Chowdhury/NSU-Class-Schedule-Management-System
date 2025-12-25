from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from models.settings import SystemSetting
from schemas.settings import Setting, SettingCreate, SettingUpdate
from core.security import get_current_active_user
from models.user import User, UserRole

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/{key}", response_model=Setting)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        # Return a default if not found, or 404. 
        # For "current_semester", let's return a default if it doesn't exist yet.
        if key == "current_semester":
            return Setting(key="current_semester", value="Fall 2025", id=0)
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.put("/{key}", response_model=Setting)
def update_setting(
    key: str, 
    setting_update: SettingUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        # Create if not exists
        setting = SystemSetting(key=key, value=setting_update.value)
        db.add(setting)
    else:
        setting.value = setting_update.value
    
    db.commit()
    db.refresh(setting)
    return setting
