@echo off
chcp 65001 >nul
echo ========================================
echo Evonet Direct API Demo 独立启动脚本
echo ========================================
echo.

cd /d "%~dp0"

echo 当前工作目录: %CD%
echo.

echo 检查端口3002是否被占用...
netstat -ano | findstr :3002 >nul
if %errorlevel% equ 0 (
    echo [警告] 端口3002已被占用，正在尝试释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo 正在检查依赖...
if not exist "node_modules" (
    echo [提示] 未找到node_modules，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 启动Direct API服务器...
echo 访问地址: http://localhost:3002
echo.

start "Evonet Direct API Server" cmd /k "node server.js"

echo.
echo 服务器已在独立窗口中启动
echo 请勿关闭此窗口，服务器将保持运行
echo.
pause
