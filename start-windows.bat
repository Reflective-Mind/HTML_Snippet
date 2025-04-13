@echo off
echo Starting HTML Snippet Builder on Windows...

:: Kill any process on port 5000
echo Killing any processes on port 5000...
node kill-port.js

:: Wait for a moment
timeout /t 2 /nobreak > nul

:: Start the server
echo Starting the server...
node server.js

:: If we get here, the server failed to start
echo Server stopped or failed to start.
pause 