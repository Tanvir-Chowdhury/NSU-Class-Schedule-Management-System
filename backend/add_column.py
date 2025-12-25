from sqlalchemy import create_engine, text
from core.database import SQLALCHEMY_DATABASE_URL

def add_column():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE class_schedules ADD COLUMN availability INTEGER"))
            conn.commit()
            print("Column 'availability' added successfully.")
        except Exception as e:
            print(f"Error (might already exist): {e}")

if __name__ == "__main__":
    add_column()
