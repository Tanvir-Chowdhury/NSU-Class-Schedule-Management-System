from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.security import get_admin_user
from models.teacher import Teacher, TeacherPreference
from models.academic import Course
from schemas.teacher import TeacherPreference as TeacherPreferenceSchema
from schemas.teacher import Teacher as TeacherSchema

router = APIRouter(prefix="/admin/preferences", tags=["admin-preferences"])

@router.get("/requests", response_model=List[TeacherPreferenceSchema])
def get_all_preference_requests(db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    return db.query(TeacherPreference).filter(TeacherPreference.status == 'pending').all()

@router.post("/accept-all")
def accept_all_preferences(db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    prefs = db.query(TeacherPreference).filter(TeacherPreference.status == 'pending').all()
    for pref in prefs:
        pref.status = 'accepted'
    db.commit()
    return {"message": "All preferences accepted."}

@router.post("/reject-all")
def reject_all_preferences(db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    # Delete all pending preferences instead of marking them as rejected
    # This forces teachers to re-submit
    db.query(TeacherPreference).filter(TeacherPreference.status == 'pending').delete()
    db.commit()
    return {"message": "All preferences rejected and removed."}

@router.post("/accept/{pref_id}")
def accept_preference(pref_id: int, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    pref = db.query(TeacherPreference).filter(TeacherPreference.id == pref_id).first()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    pref.status = 'accepted'
    db.commit()
    return {"message": "Preference accepted."}

@router.post("/reject/{pref_id}")
def reject_preference(pref_id: int, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    # Delete the preference instead of marking as rejected
    pref = db.query(TeacherPreference).filter(TeacherPreference.id == pref_id).first()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    db.delete(pref)
    db.commit()
    return {"message": "Preference rejected and removed."}

@router.get("/all", response_model=List[TeacherPreferenceSchema])
def get_all_preferences(db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    return db.query(TeacherPreference).all()
