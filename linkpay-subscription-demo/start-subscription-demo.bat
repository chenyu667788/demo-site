@echo off
echo ========================================
echo LinkPay Subscription Demo
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo.
echo Starting LinkPay Subscription Demo server...
echo Server will run on port 3005
echo.
echo Pages:
echo   - Subscription Plans: http://localhost:3005/index.html
echo   - Subscription Management: http://localhost:3005/subscription-management.html
echo.

node server.js

pause
