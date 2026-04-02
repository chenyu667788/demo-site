@echo off
echo ========================================
echo Evonet Drop-in Demo - Independent Start
echo ========================================
echo.
echo Starting server on port 3002...
echo This project is isolated from other projects
echo.
echo Access the application at: http://localhost:3002
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Kill any existing process on port 3002
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Killing existing process on port 3002: %%a
    taskkill /F /PID %%a 2>nul
)

REM Start the server
node server.js

pause
