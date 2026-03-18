@echo off
TITLE Claude Workspace Server
cd /d "C:\Users\Admin\Documents\GitHub\claude-ws"

echo Checking for existing processes on port 8556...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8556') do (
    echo Killing process with PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)
if exist .next (
    echo Cleaning Next.js cache...
    rmdir /s /q .next
)

echo Starting Claude Workspace...
npm run dev
pause
