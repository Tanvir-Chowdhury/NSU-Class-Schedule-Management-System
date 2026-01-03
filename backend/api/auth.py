from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime, timezone
import random
import string

from core.database import get_db
from core.security import create_access_token, get_password_hash, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from core.email import send_verification_email
from models.user import User, UserRole
from models.verification import VerificationCode
from schemas.user import UserCreate, User as UserSchema
from schemas.token import Token
from pydantic import BaseModel, EmailStr

router = APIRouter()

class EmailRequest(BaseModel):
    email: EmailStr

@router.post("/send-verification-code")
def send_code(request: EmailRequest, db: Session = Depends(get_db)):
    """
    Send a verification code to the provided email.
    """
    if not request.email.endswith("@northsouth.edu"):
        raise HTTPException(status_code=400, detail="Email must belong to northsouth.edu domain")
    
    # Check if user already exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate 6-digit code
    code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Upsert verification code
    db_code = db.query(VerificationCode).filter(VerificationCode.email == request.email).first()
    if db_code:
        db_code.code = code
        db_code.expires_at = expires_at
    else:
        db_code = VerificationCode(email=request.email, code=code, expires_at=expires_at)
        db.add(db_code)
    
    db.commit()

    # Send email
    if send_verification_email(request.email, code):
        return {"message": "Verification code sent"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")

@router.post("/register", response_model=UserSchema)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    """
    # Role restriction
    if user.role.value != "STUDENT":
         raise HTTPException(status_code=400, detail="Only students can register. Teachers must be added by Admin.")

    # Email verification for students
    if user.role.value == "STUDENT":
        if not user.verification_code:
            raise HTTPException(status_code=400, detail="Verification code is required")
        
        verify_entry = db.query(VerificationCode).filter(
            VerificationCode.email == user.email,
            VerificationCode.code == user.verification_code
        ).first()

        if not verify_entry:
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        if verify_entry.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification code expired")
        
        # Delete used code
        db.delete(verify_entry)

    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        is_active=user.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
