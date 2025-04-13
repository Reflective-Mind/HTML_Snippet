@echo off
echo ===================================================
echo HTML Snippet Builder - GitHub Setup Utility
echo ===================================================

:: Check if git is installed
WHERE git >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo.
echo This script will help you initialize a Git repository
echo and configure it for pushing to GitHub.
echo.

:: Check if .git directory exists
if exist .git (
    echo A Git repository already exists in this directory.
    echo Skipping initialization.
) else (
    echo Step 1: Initializing a new Git repository...
    git init
    echo.
)

:: Ask for GitHub username
set /p github_username=Enter your GitHub username: 

:: Ask for repository name
set /p repo_name=Enter the repository name (e.g., html-snippet-builder): 

:: Create .gitignore if it doesn't exist
if not exist .gitignore (
    echo Step 2: Creating .gitignore file...
    echo # Node.js dependencies > .gitignore
    echo node_modules/ >> .gitignore
    echo .env >> .gitignore
    echo .env.local >> .gitignore
    echo .DS_Store >> .gitignore
    echo npm-debug.log* >> .gitignore
    echo yarn-debug.log* >> .gitignore
    echo yarn-error.log* >> .gitignore
    echo Thumbs.db >> .gitignore
    echo.
) else (
    echo Step 2: .gitignore file already exists. Skipping creation.
    echo.
)

:: Configure Git remote
echo Step 3: Configuring GitHub remote...
set github_url=https://github.com/%github_username%/%repo_name%.git

:: Remove origin if it exists, then add the new one
git remote remove origin 2>nul
git remote add origin %github_url%
echo Remote origin set to: %github_url%
echo.

:: Initial commit
echo Step 4: Preparing initial commit...
git add .
git commit -m "Initial commit for HTML Snippet Builder"
echo.

echo ===================================================
echo Setup complete! Your repository is now configured for GitHub.
echo.
echo To push your code to GitHub:
echo 1. Create a new repository on GitHub named: %repo_name%
echo 2. Then run the command: git push -u origin master
echo.
echo Or simply use the push-to-github.bat script.
echo ===================================================
echo.

:: Ask if user wants to push now
set /p push_now=Do you want to push to GitHub now? (y/n): 

if /i "%push_now%"=="y" (
    echo.
    echo Pushing to GitHub...
    git push -u origin master
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ Successfully pushed to GitHub!
    ) else (
        echo.
        echo Failed to push to GitHub. Please make sure:
        echo 1. You have created the repository on GitHub
        echo 2. You have the correct permissions
        echo 3. You have entered the correct username and repository name
    )
)

echo.
pause 