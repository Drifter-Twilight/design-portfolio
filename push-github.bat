@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ==========================================
echo   逐批推送作品集到 GitHub（自动重试）
echo ==========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-remaining.ps1"
