@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem 把本机 git 放到 PATH 最前：系统 PATH 改过之后，已经打开的窗口不会立即生效
if exist "D:\Tools\Git\cmd\git.exe" set "PATH=D:\Tools\Git\cmd;%PATH%"
echo.
echo ==========================================
echo   逐批推送作品集到 GitHub（自动重试）
echo ==========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-remaining.ps1"
