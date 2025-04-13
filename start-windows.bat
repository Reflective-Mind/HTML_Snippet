@echo off
echo ===================================================
echo HTML Snippet Builder - Windows Startup Script
echo ===================================================

:: Set the title of the command window
title HTML Snippet Builder Server

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

:: Start the server
echo.
echo Step 4: Starting the server...
echo.
echo Server logs will appear below. Press Ctrl+C to stop the server.
echo ===================================================
echo.

node server.js

:: If we get here, the server failed to start
echo.
echo Server stopped or failed to start.
echo Check the logs above for any error messages.
echo.
pause 