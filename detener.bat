@echo off
title GelatoLab - Detener
echo  Deteniendo GelatoLab...

:: Matar cualquier proceso node en el puerto 5173 (Vite)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo  Hecho.
timeout /t 2 /nobreak >nul
exit
