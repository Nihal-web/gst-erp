@echo off
REM Quick Git push script for Render deployment

cd /d "%~dp0"

echo.
echo ====================================
echo Push to GitHub for Render Deployment
echo ====================================
echo.

git status

echo.
echo Adding files...
git add .

echo.
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update code - auto deploy to Render

git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ====================================
echo Push complete!
echo Render will auto-deploy in 1-2 minutes
echo Check https://render.com dashboard
echo ====================================
echo.
pause
