from sqlalchemy import text
from core.database import engine

def check_preferences():
    with engine.connect() as connection:
        try:
            result = connection.execute(text("SELECT * FROM teacher_preferences"))
            rows = result.fetchall()
            if rows:
                print(f"Found {len(rows)} preferences:")
                for row in rows:
                    print(row)
            else:
                print("No preferences found in the database.")
        except Exception as e:
            print(f"Error querying preferences: {e}")

if __name__ == "__main__":
    check_preferences()
