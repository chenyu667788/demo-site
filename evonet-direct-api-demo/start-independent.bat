@echo off
echo ========================================
echo Evonet Direct API Demo - Independent Startup
echo ========================================
echo.

REM Check if port 3002 is available
echo Checking port 3002 availability...
netstat -ano | findstr ":3002" >nul
if %errorlevel% equ 0 (
    echo Port 3002 is in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

REM Navigate to project directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the server
echo.
echo Starting Evonet Direct API Demo Server...
echo Server will run on http://localhost:3002
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js

pause
