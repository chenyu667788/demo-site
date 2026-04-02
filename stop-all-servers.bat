@echo off
chcp 65001 >nul
echo ========================================
echo 停止所有Evonet演示服务器
echo ========================================
echo.

echo 正在停止端口3001的服务...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo 正在停止进程 %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo 正在停止端口3002的服务...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo 正在停止进程 %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo 所有服务器已停止
pause
