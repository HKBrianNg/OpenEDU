@echo off
chcp 65001 >nul
echo [BUILD] Invoking clean.bat
call clean.bat
if %errorlevel% neq 0 (
    echo [BUILD] Clean failed, abort build.
    pause
    exit /b 1
)

echo [BUILD] Running npm run build
call npm run build
if %errorlevel% neq 0 (
    echo [BUILD] npm build failed, stop.
    pause
    exit /b 1
)

echo.
set "LATEST="
for /f "delims=" %%d in ('dir /b /ad /o-n "release" 2^>nul') do (
    echo %%d | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
    if !errorlevel! equ 0 (
        set "LATEST=%%d"
        goto foundVer
    )
)
goto printHint

:foundVer
set "EXE=release\!LATEST!\win-unpacked\OpenEDU.exe"
if exist "%EXE%" (
    echo ✅ Latest executable:
    echo    %EXE%
    echo.
    echo Launch command:
    echo    .\run.bat
) else (
    echo ⚠️ Build done, but OpenEDU.exe missing!
)

:printHint
echo.
echo ✅ Build finished
echo Do not open release inside VS Code to avoid lock next time.
pause
