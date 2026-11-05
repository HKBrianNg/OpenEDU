@echo off
chcp 65001 >nul
setlocal

set "EXE=release\0.0.0\win-unpacked\OpenEDU.exe"

if not exist "%EXE%" (
    echo [ERROR] Cannot find: %EXE%
    echo Please re-run build.bat
    pause
    exit /b 1
)

echo [RUN] Launching OpenEDU.exe
start "" "%EXE%"
