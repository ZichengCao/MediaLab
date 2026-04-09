@echo off
chcp 65001 >nul
echo ====================================
echo     MediaLab 本地服务器
echo ====================================
echo.
echo 正在启动服务器...
echo 端口: 8080
echo 访问地址: http://localhost:8080
echo.
echo 按 Ctrl+C 可停止服务器
echo ====================================
echo.

python -m http.server 8080

pause
