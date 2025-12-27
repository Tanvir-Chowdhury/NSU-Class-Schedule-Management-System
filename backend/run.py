import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure the backend directory is in the python path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))

    print("Starting Class Schedule Management System Backend...")
    
    # Run Uvicorn programmatically
    # reload=True enables auto-reload on code changes
    # workers=1 is standard for dev
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            timeout_keep_alive=30, # Increase timeout
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
    except Exception as e:
        print(f"Server error: {e}")
