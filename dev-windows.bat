@echo off
echo ===================================================
echo HTML Snippet Builder - Windows Development Server
echo ===================================================

:: Set the title of the command window
title HTML Snippet Builder Dev Server

:: Kill any process on port 5000
echo.
echo Step 1: Killing any processes on port 5000...
node kill-port.js

:: Wait for a moment
echo.
echo Step 2: Waiting for port to clear...
timeout /t 3 /nobreak > nul

:: Check if .env file exists
if not exist .env (
    echo.
    echo Step 3: Creating .env file from example...
    copy .env.example .env
    echo Created .env file from example!
) else (
    echo.
    echo Step 3: .env file already exists. Using existing configuration.
)

:: Check if nodemon is installed
echo.
echo Step 4: Checking if nodemon is installed...
WHERE nodemon >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Nodemon not found, installing globally...
    npm install -g nodemon
    
    :: Double check if installation succeeded
    WHERE nodemon >nul 2>nul
    IF %ERRORLEVEL% NEQ 0 (
        echo Failed to install nodemon. Starting server without it...
        goto StartWithoutNodemon
    )
)

echo Nodemon is installed. Starting development server...
echo.
echo Server will restart automatically when files change.
echo Press Ctrl+C to stop the server.
echo ===================================================
echo.

:: Start the server with nodemon
nodemon server.js
goto End

:StartWithoutNodemon
echo.
echo Starting server without auto-reload...
echo ===================================================
echo.
node server.js

:End
echo.
echo Server stopped.
echo.
pause 