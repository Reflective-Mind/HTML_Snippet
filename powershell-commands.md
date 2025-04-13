# PowerShell Command Reference

This document provides PowerShell-compatible commands for common operations in this project. Use these commands to avoid issues with the `&&` operator that doesn't work the same way in PowerShell as it does in bash or cmd.

## Development Commands

### Start Development Server (with auto-reload)

```powershell
# Option 1 (Recommended): Use batch file
npm run dev-win

# Option 2: Run commands separately
cd HTML-Test1
node kill-port.js
nodemon server.js
```

### Clean Start (kill all processes and start fresh)

```powershell
# Option 1 (Recommended): Use batch file
npm run start-win

# Option 2: Run commands separately
cd HTML-Test1
node kill-port.js
node server.js
```

### Kill Processes on Port 5000

```powershell
cd HTML-Test1
node kill-port.js
```

## GitHub Commands

### Setup GitHub Repository

```powershell
cd HTML-Test1
npm run setup-github
```

### Push Changes to GitHub

```powershell
cd HTML-Test1
npm run push-github
```

### Manual Git Commands

```powershell
# Add all files
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin master
```

## Deployment Commands

### Deploy to Render

```powershell
cd HTML-Test1
npm run deploy:render
```

### Deploy to Vercel

```powershell
cd HTML-Test1
npm run deploy:vercel
```

## Troubleshooting Commands

If you're still having issues with processes hanging on port 5000, try these commands in PowerShell:

```powershell
# Find processes using port 5000
netstat -ano | findstr :5000

# Kill a specific process by PID (replace <PID> with the actual process ID)
taskkill /F /PID <PID>
```

Remember to always run commands from the correct directory. If you're in the root of the repository, make sure to `cd HTML-Test1` first. 