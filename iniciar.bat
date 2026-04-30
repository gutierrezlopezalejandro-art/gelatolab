@echo off
title GelatoLab - Dev Server
echo.
echo  ===========================================
echo   GelatoLab - Iniciando servidor de desarrollo
echo  ===========================================
echo.

cd /d "%~dp0"

:: Instalar dependencias si node_modules no existe
if not exist "node_modules" (
    echo  Instalando dependencias por primera vez...
    call npm install
)

:: Iniciar Vite en ventana separada
start "GelatoLab - Vite" cmd /k "npm run dev"

:: Esperar a que Vite arranque y abrir navegador
timeout /t 4 /nobreak >nul
echo  Abriendo navegador en http://localhost:5173 ...
start http://localhost:5173

echo.
echo  GelatoLab iniciado.
echo  Para detener: cierra la ventana "GelatoLab - Vite" (o presiona Ctrl+C en ella).
echo.
timeout /t 3 /nobreak >nul
exit
