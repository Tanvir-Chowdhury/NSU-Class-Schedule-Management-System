import sys
import os
import logging

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Import all models to ensure they are registered with SQLAlchemy
from models import academic, admin, booking, schedule, settings, student, teacher, user, verification

from core.database import SessionLocal
from services.cp_sat_scheduler import CpSatAutoScheduler

# Configure logging to show scheduler output
logging.basicConfig(level=logging.INFO)

def test_scheduler():
    db = SessionLocal()
    try:
        print("Initializing Scheduler...")
        scheduler = CpSatAutoScheduler(time_limit_seconds=30.0, seed=1)
        
        print("Running Scheduler...")
        result = scheduler.run(db, rebuild=True)
        
        print("\n" + "="*50)
        print("SCHEDULER RESULTS")
        print("="*50)
        print(f"Total Sections: {result.total_sections}")
        print(f"Total Scheduled: {result.total_scheduled}")
        print(f"Assigned to Teachers: {result.assigned_non_tba}")
        print(f"Assigned to TBA: {result.assigned_tba}")
        print(f"Unscheduled: {result.unscheduled}")
        print(f"Mean Quality Score: {result.quality.mean_score}")
        print("="*50)
        
        if result.assigned_tba > 0:
            print(f"\nWARNING: {result.assigned_tba} sections are still assigned to TBA.")
        else:
            print("\nSUCCESS: All sections assigned to teachers!")

    except Exception as e:
        print(f"Error running scheduler: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_scheduler()
