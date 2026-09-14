from pathlib import Path
import subprocess
import time

APP_DIR = Path("/content/drive/MyDrive/crop-disease-progression/app")
BACKEND_DIR = APP_DIR / "backend"
FRONTEND_DIR = APP_DIR / "frontend"

backend = subprocess.Popen(
    [
        "uvicorn",
        "main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8001"
    ],
    cwd=BACKEND_DIR
)

time.sleep(5)

frontend = subprocess.Popen(
    [
        "npm",
        "run",
        "dev",
        "--",
        "--host",
        "0.0.0.0",
        "--port",
        "5173"
    ],
    cwd=FRONTEND_DIR
)

print("FastAPI PID:", backend.pid)
print("React PID:", frontend.pid)
print("Application servers started")
