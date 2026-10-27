@echo off
title VCV Play - Servidor Local de Pruebas
cd /d "%~dp0"

echo =======================================================
echo          VCV PLAY - ENTORNO LOCAL DE DESARROLLO
echo =======================================================
echo.
echo Iniciando servidor local en el puerto 8080...
echo.
echo Abre tu navegador en:
echo     http://localhost:8080/dev.html       (Versión desarrollo)
echo     http://localhost:8080/patros.html    (Demo patrocinadores)
echo     http://localhost:8080/index.html     (Versión oficial)
echo.
echo Para detener el servidor, cierra esta ventana o pulsa Ctrl + C.
echo =======================================================
echo.

python -m http.server 8080
pause

