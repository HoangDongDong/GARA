@echo off
title Garage Launcher
echo ========================================================
echo   KHOI DONG HE THONG GARAGE OTO
echo   - Backend:  http://localhost:4000
echo   - Frontend: http://localhost:5173
echo ========================================================
start "Garage Backend" cmd /c "%~dp0\start-backend.bat"
timeout /t 2 /nobreak >nul
start "Garage Frontend" cmd /c "%~dp0\start-frontend.bat"
