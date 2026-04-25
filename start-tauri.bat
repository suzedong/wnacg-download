@echo off
echo 🚀 正在启动 WNACG Downloader (Tauri)...
echo.

REM 刷新环境变量
setlocal enabledelayedexpansion
for /f "tokens=2,*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
for /f "tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYSTEM_PATH=%%b"
set "Path=!USER_PATH!;!SYSTEM_PATH!"

REM 启动 Tauri
npm run dev:tauri
