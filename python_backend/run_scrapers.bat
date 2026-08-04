@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem Önce venv'deki Python'ı dene, yoksa sistem Python'ı
set "VENV_PY=%~dp0venv\Scripts\python.exe"
if exist "%VENV_PY%" (
    "%VENV_PY%" run_scrapers.py %*
) else (
    python run_scrapers.py %*
)
pause
