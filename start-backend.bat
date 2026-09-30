@echo off
title GymFlow Backend API
echo ===================================================
echo   GymFlow Backend API (Laravel)
echo   Local URL: http://127.0.0.1:8000
echo ===================================================
cd /d "%~dp0backend"
php artisan serve --host=0.0.0.0 --port=8000
pause
