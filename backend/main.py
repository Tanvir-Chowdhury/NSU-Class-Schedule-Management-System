from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from api import auth, admin, booking, calendar, profile, chat, settings, academic, admin_preferences, dashboard, student, notification
from core.database import engine, Base, SessionLocal

# --- Import 'public' here ---
from api import auth, admin, booking, calendar, profile, chat, settings, academic, admin_preferences, dashboard, public, notification

# Import all models to ensure relationships are registered
from models.user import User, UserRole
from models.teacher import Teacher
from models.student import Student
from models.admin import Admin
from models.settings import SystemSetting
from models.verification import VerificationCode
from models.chat import ChatMessage
from models.notification import Notification, NotificationRecipient
from core.security import get_password_hash

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Class Schedule Management System")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # Add frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        admin_email = "tanvir.chowdhury.us@gmail.com"
        print(f"Startup: Checking for admin user {admin_email}...")
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            print(f"Startup: Admin user not found. Creating...")
            try:
                admin_user = User(
                    email=admin_email,
                    password_hash=get_password_hash("Tanvir@11744"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)
                
                # Create Admin Profile
                admin_profile = Admin(user_id=admin_user.id, name="System Admin")
                db.add(admin_profile)
                db.commit()
                
                print(f"Startup: Admin user {admin_email} created successfully.")
            except Exception as e:
                print(f"Startup: Error creating admin user: {e}")
                db.rollback()
        else:
            print(f"Startup: Admin user {admin_email} already exists.")
    except Exception as e:
        print(f"Startup Error: {e}")
    finally:
        db.close()
        role=UserRole.ADMIN,
        is_active=True
        
    
app.include_router(auth.router, tags=["Authentication"])
app.include_router(admin.router)
app.include_router(booking.router)
app.include_router(calendar.router)
app.include_router(profile.router)
app.include_router(chat.router)
app.include_router(settings.router)
app.include_router(academic.router)
app.include_router(admin_preferences.router)
app.include_router(dashboard.router)
app.include_router(student.router)
app.include_router(public.router) 
app.include_router(notification.router)

@app.get("/")
def read_root():
    """
    Root endpoint to verify the backend is running.
    """
    return {"message": "Welcome to the Class Schedule Management System Backend"}
