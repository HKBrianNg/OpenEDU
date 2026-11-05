@echo off
chcp 65001 >nul
echo [Clean] Killing electron / app processes...
taskkill /f /im OpenEDU.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im electron-builder.exe >nul 2>&1


echo [Clean] Wait for locks release (3s)
timeout /t 3 /nobreak >nul

if exist release (
    echo [Clean] Removing release folder
    rmdir /s /q release
)

if exist release (
    echo [ERROR] release is still locked!
    echo Make sure VS Code and all terminals are closed.
    pause
    exit /b 1
)

echo [Clean] Success
