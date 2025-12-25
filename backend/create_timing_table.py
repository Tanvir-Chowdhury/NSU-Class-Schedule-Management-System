from core.database import engine, Base
from models.teacher import TeacherTimingPreference

print("Creating teacher_timing_preferences table...")
TeacherTimingPreference.__table__.create(bind=engine)
print("Done.")
