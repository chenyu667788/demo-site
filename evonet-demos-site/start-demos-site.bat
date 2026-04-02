@echo off
echo ========================================
echo   Evonet Demos Site
echo ========================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    echo.
)

echo 启动服务器...
echo 访问地址: http://localhost:8080
echo.
node server.js
