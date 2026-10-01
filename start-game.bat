@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20+ and run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
echo Starting Mitzvah Land...
call npm run dev
pause
