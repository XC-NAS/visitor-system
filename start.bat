@echo off
echo ==========================================
echo    Visitor System - Start Script
echo ==========================================
echo.

REM Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [Error] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node -v
echo.

REM Get current directory
set "BASEDIR=%~dp0"
cd /d "%BASEDIR%"

REM Enter server directory
cd server

REM Clean failed install if exists
if exist "node_modules" (
    echo Cleaning previous installation...
    rmdir /s /q "node_modules" 2>nul
)
if exist "package-lock.json" (
    del package-lock.json 2>nul
)

REM Install dependencies
echo Installing dependencies...
npm install express cors
if errorlevel 1 (
    echo Install failed, please check network
    pause
    exit /b 1
)
echo Dependencies installed.

echo.
echo ==========================================
echo    Server starting...
echo    Please visit: http://localhost:3000
echo ==========================================
echo.

node server.js

pause
