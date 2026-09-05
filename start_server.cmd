@echo off
cd /d C:\Hazir-Sistem-Karsilastirici
set PORT=3000
set /a COUNT=0
:loop
node index.mjs >> C:\Hazir-Sistem-Karsilastirici\server.log 2>&1
set /a COUNT+=1
if %COUNT% GEQ 5 (
  echo [%date% %time%] 5 quick crashes - cooling down 60s >> C:\Hazir-Sistem-Karsilastirici\server.log
  ping -n 61 127.0.0.1 >nul
  set /a COUNT=0
)
echo [%date% %time%] Server stopped (code %errorlevel%) - restarting in 3s >> C:\Hazir-Sistem-Karsilastirici\server.log
ping -n 4 127.0.0.1 >nul
goto loop