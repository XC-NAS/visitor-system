@echo off
echo ==========================================
echo Visitor System - Debug Mode
echo ==========================================
echo.
echo Current directory: %~dp0
cd /d "%~dp0"
echo.
echo Checking files...
echo.

if not exist "server\server.js" (
    echo ERROR: server.js not found!
    pause
    exit /b 1
)

echo Found server.js
echo.

node -v
if errorlevel 1 (
    echo ERROR: Node.js not installed!
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
cd server
npm install express cors
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo Starting server...
node server.js

echo.
echo Server stopped!
pause
