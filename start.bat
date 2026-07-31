@echo off
title Hazir Sistem Karsilastirici - Baslatici

echo ===================================================
echo   Hazir Sistem Karsilastirici Baslatiliyor...
echo ===================================================

echo.
echo [1/2] Python Backend (FastAPI) Baslatiliyor...
start "Python Backend" cmd /k "cd python_backend && .\venv\Scripts\python.exe main.py"

echo [2/2] React Frontend (Vite) Baslatiliyor...
start "React Frontend" cmd /k "cd client && npm run dev"

echo.
echo Tum servisler baslatildi! Acmak icin:
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000
echo ===================================================
pause
