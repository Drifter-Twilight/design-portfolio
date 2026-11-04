@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem 本机 git 放到 PATH 最前，旧窗口不会刷新系统 PATH
if exist "D:\Tools\Git\cmd\git.exe" set "PATH=D:\Tools\Git\cmd;%PATH%"

echo.
echo ============================================
echo   作品集录入工具
echo ============================================
echo.
echo   浏览器会自动打开 http://127.0.0.1:5180
echo   关闭本窗口即停止服务
echo.

start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:5180"
call npm run admin
pause
