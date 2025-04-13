@echo off
echo ===================================================
echo HTML Snippet Builder - Complete Setup Script
echo ===================================================

:: Set the title of the command window
title HTML Snippet Builder Setup

echo This script will set up your HTML Snippet Builder environment.
echo It will:
echo  1. Install dependencies
echo  2. Kill any processes on port 5000
echo  3. Set up your environment file
echo  4. Configure Git repository (optional)
echo.
echo Press any key to begin...
pause > nul

:: Step 1: Install dependencies
echo.
echo Step 1: Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies!
    echo Please make sure Node.js is installed and try again.
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

:: Step 2: Kill processes on port 5000
echo Step 2: Ensuring port 5000 is free...
node kill-port.js
echo.

:: Step 3: Create .env file if it doesn't exist
if not exist .env (
    echo Step 3: Creating .env file from example...
    copy .env.example .env
    echo Created .env file from example!
) else (
    echo Step 3: .env file already exists. Using existing configuration.
)
echo.

:: Step 4: Ask if user wants to set up GitHub repository
set /p setup_github=Would you like to set up a GitHub repository? (y/n): 

if /i "%setup_github%"=="y" (
    echo.
    echo Step 4: Setting up GitHub repository...
    call setup-github.bat
) else (
    echo.
    echo Skipping GitHub setup.
)

echo.
echo ===================================================
echo Setup complete! You can now start the application with:
echo    npm run start-win    (Production mode)
echo    npm run dev-win      (Development mode with auto-reload)
echo ===================================================
echo.
pause 