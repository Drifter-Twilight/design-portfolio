@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
rem 把本机 git 放到 PATH 最前：系统 PATH 改过之后，已经打开的窗口不会立即生效
if exist "D:\Tools\Git\cmd\git.exe" set "PATH=D:\Tools\Git\cmd;%PATH%"

echo.
echo ============================================
echo   发布作品集
echo ============================================
echo.

echo [1/4] 同步素材清单
call npm run sync:assets
if errorlevel 1 goto fail

echo.
echo [2/4] 压缩图片（只处理新增或改过的）
call npm run optimize:images -- --apply
if errorlevel 1 goto fail

echo.
echo [3/4] 本地构建检查
call npm run build
if errorlevel 1 goto fail

echo.
echo [4/4] 推送到 GitHub
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo   没有新改动，无需发布。
  goto done
)
git commit -m "deploy %date:~0,10%"
if errorlevel 1 goto fail
git push
if errorlevel 1 goto fail

echo.
echo ============================================
echo   已推送，GitHub 正在构建，约 1-2 分钟生效
echo ============================================
goto done

:done
echo.
pause
exit /b 0

:fail
echo.
echo !!! 出错了，把上面这段报错截图发我 !!!
echo.
pause
exit /b 1
