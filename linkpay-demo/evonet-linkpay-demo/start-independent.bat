@echo off
echo ========================================
echo Evonet LinkPay Demo - Independent Startup
echo ========================================
echo.

REM Check if port 3000 is available
echo Checking port 3000 availability...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo Port 3000 is in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
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
echo Starting Evonet LinkPay Demo Server...
echo Server will run on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js

pause
