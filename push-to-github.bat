@echo off
echo ===================================================
echo HTML Snippet Builder - GitHub Push Utility
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

:: Get current branch
for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD') do set current_branch=%%a
echo Current branch: %current_branch%

:: Ask for commit message
set /p commit_message=Enter commit message (or press Enter for default message): 

:: Use default message if none provided
if "%commit_message%"=="" (
    set commit_message=Update HTML Snippet Builder
)

echo.
echo Step 1: Adding all changes...
git add .

echo.
echo Step 2: Committing changes...
git commit -m "%commit_message%"

echo.
echo Step 3: Pulling latest changes from remote...
git pull origin %current_branch%

echo.
echo Step 4: Pushing changes to GitHub...
git push origin %current_branch%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Failed to push changes to GitHub.
    echo Make sure your repository is properly configured.
    echo.
    echo You might need to set up your repository with:
    echo git remote add origin https://github.com/yourusername/your-repo.git
    echo.
    
    set /p repo_url=Enter your GitHub repository URL (or press Enter to skip): 
    
    if not "%repo_url%"=="" (
        git remote remove origin
        git remote add origin %repo_url%
        echo Remote origin set to %repo_url%
        echo Trying to push again...
        git push -u origin %current_branch%
    )
) else (
    echo.
    echo ✅ Successfully pushed changes to GitHub!
)

echo.
pause 