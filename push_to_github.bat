@echo off
REM GST ERP - Git Setup and Push to GitHub
REM This script will commit and push your cleaned code to GitHub

echo.
echo ========================================
echo GST ERP - GitHub Push Setup
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo.
    echo Please install Git from: https://git-scm.com/download/win
    echo After installation, restart this script
    echo.
    pause
    exit /b 1
)

echo Git is installed. Proceeding with setup...
echo.

REM Configure git if not already configured
echo Checking git configuration...
git config --global user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo Enter your name for git commits:
    set /p gitname="Name: "
    git config --global user.name "%gitname%"
)

git config --global user.email >nul 2>&1
if %errorlevel% neq 0 (
    echo Enter your email for git commits:
    set /p gitemail="Email: "
    git config --global user.email "%gitemail%"
)

echo.
echo Initializing Git repository...
git init

echo.
echo Adding all files...
git add .

echo.
echo Committing changes...
git commit -m "GST ERP - Final production build ready for Render deployment"

echo.
echo Setting main branch...
git branch -M main

echo.
echo Adding remote origin...
git remote add origin https://github.com/Nihal-web/gst-erp.git

echo.
echo Pushing to GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Code pushed to GitHub
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Go to https://render.com
    echo 2. Create Web Service for backend
    echo 3. Create Static Site for frontend
    echo 4. Set environment variables per FINAL_DEPLOYMENT_GUIDE.md
    echo.
) else (
    echo.
    echo ERROR: Failed to push to GitHub
    echo Check your internet connection and GitHub credentials
    echo.
)

pause
