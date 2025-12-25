from sqlalchemy import text
from core.database import engine

def add_status_column():
    with engine.connect() as connection:
        try:
            connection.execute(text("ALTER TABLE teacher_preferences ADD COLUMN status VARCHAR DEFAULT 'pending'"))
            connection.commit()
            print("Added status column to teacher_preferences table.")
        except Exception as e:
            print(f"Error adding status column (might already exist): {e}")

if __name__ == "__main__":
    add_status_column()
