@echo off
echo.
echo  +======================================+
echo  ^|       ZenPod - Starting Up           ^|
echo  +======================================+
echo.

:: Start backend
echo [1/2] Starting backend server...
cd /d D:\aimonk\backend
if not exist venv (
    echo First run - creating virtual environment...
    python -m venv venv
)
start "ZenPod Backend" cmd /k "venv\Scripts\activate && pip install -r requirements.txt -q && python main.py"

:: Wait for backend
timeout /t 4 /nobreak >nul

:: Start frontend
echo [2/2] Starting frontend...
cd /d D:\aimonk\frontend
start "ZenPod Frontend" cmd /k "npm install && npm run dev"

echo.
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API Docs: http://localhost:8000/docs
echo.
pause
