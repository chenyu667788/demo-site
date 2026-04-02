@echo off
echo ========================================
echo   Evonet Demo Services - Start All
echo ========================================
echo.

echo Starting LinkPay OneOff Demo (Port 3000)...
start "LinkPay-OneOff" cmd /k "cd /d e:\payment-demo\evonet-linkpay-demo && node server.js"
timeout /t 1 /nobreak >nul

echo Starting Drop-in OneOff Demo (Port 3001)...
start "DropIn-OneOff" cmd /k "cd /d e:\evonet-dropin-demo && node server.js"
timeout /t 1 /nobreak >nul

echo Starting Direct API OneOff Demo (Port 3002)...
start "DirectAPI-OneOff" cmd /k "cd /d e:\evonet-direct-api-demo && node server.js"
timeout /t 1 /nobreak >nul

echo Starting Drop-in Subscription Demo (Port 3003)...
start "DropIn-Subscription" cmd /k "cd /d e:\drop-in-subscription-demo && node server.js"
timeout /t 1 /nobreak >nul

echo Starting Direct API Subscription Demo (Port 3004)...
start "DirectAPI-Subscription" cmd /k "cd /d "e:\direct API-subscription-demo" && node server.js"
timeout /t 1 /nobreak >nul

echo Starting LinkPay Subscription Demo (Port 3005)...
start "LinkPay-Subscription" cmd /k "cd /d e:\linkpay-subscription-demo && node server.js"
timeout /t 1 /nobreak >nul

echo Starting Demos Site (Port 8080)...
start "Demos-Site" cmd /k "cd /d e:\evonet-demos-site && node server.js"

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo Service List:
echo   - LinkPay OneOff:        http://localhost:3000
echo   - Drop-in OneOff:        http://localhost:3001
echo   - Direct API OneOff:     http://localhost:3002
echo   - Drop-in Subscription:  http://localhost:3003
echo   - Direct API Subscription: http://localhost:3004
echo   - LinkPay Subscription:  http://localhost:3005
echo   - Demos Site:            http://localhost:8080
echo.
echo Press any key to exit...
pause >nul
