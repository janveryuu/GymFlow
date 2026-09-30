@echo off
title GymFlow Launcher
echo ===================================================
echo   Launching GymFlow Backend and Mobile App...
echo ===================================================
start "GymFlow Backend API" cmd /k "cd /d "%~dp0backend" && php artisan serve --host=0.0.0.0 --port=8000"
start "GymFlow Mobile App" cmd /k "cd /d "%~dp0mobile" && npm start"
echo Both servers have been launched in separate windows!
