@echo off
setlocal
cd /d "%~dp0"
title NEXUS 3D LAB Launcher

echo.
echo ========================================================
echo   NEXUS 3D LAB - ONE CLICK WINDOWS LAUNCHER
echo ========================================================
echo.
echo Starting the built-in local server...
echo Keep this window open while using the website.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXUS.ps1"

if errorlevel 1 (
  echo.
  echo ========================================================
  echo   NEXUS could not start.
  echo ========================================================
  echo.
  echo Copy the error shown above and send it to me.
  echo.
  pause
)
