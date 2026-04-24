@echo off
setlocal enabledelayedexpansion

title Sofia Launcher (auto-respawn)

set ROOT=%~dp0
set DASHBOARD_DIR=%ROOT%dashboard
set ENV_FILE=%ROOT%.env
set PORT=4000

echo ============================================
echo   Sofia Voice Agent - Launcher Robusto
echo ============================================
echo.

REM ─── 1. Verificar Node ──────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js no esta instalado.
    echo     Descargalo de https://nodejs.org
    pause
    exit /b 1
)

REM ─── 2. Verificar .env ──────────────────────────────────────
if not exist "%ENV_FILE%" (
    echo [X] .env no encontrado: %ENV_FILE%
    pause
    exit /b 1
)

REM ─── 3. Matar cualquier proceso zombie en el puerto ─────────
echo [.] Liberando puerto %PORT% si esta ocupado...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    echo     Matando PID %%a
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM ─── 4. Instalar deps si faltan ─────────────────────────────
if not exist "%DASHBOARD_DIR%\node_modules" (
    echo [!] Primera vez: npm install...
    cd /d "%DASHBOARD_DIR%"
    call npm install
    if errorlevel 1 (
        echo [X] npm install fallo.
        pause
        exit /b 1
    )
)

REM ─── 5. Leer MODAL_BASE_URL para health check ────────────────
set MODAL_URL=
for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if /i "%%A"=="MODAL_BASE_URL" set MODAL_URL=%%B
)
if defined MODAL_URL (
    echo [.] Verificando Modal...
    curl -s -o nul -w "HTTP %%{http_code}" --max-time 8 "!MODAL_URL!/health" >"%TEMP%\sofia_health.txt" 2>nul
    set /p HEALTH=<"%TEMP%\sofia_health.txt"
    del "%TEMP%\sofia_health.txt" 2>nul
    echo     Modal: !HEALTH!
)

REM ─── 6. Iniciar Next.js con watchdog que lo respawnea ────────
echo [+] Arrancando Next.js con auto-respawn en ventana separada...
start "Sofia Dashboard (Ctrl+C dos veces para apagar TODO)" cmd /k "cd /d %DASHBOARD_DIR% && (echo ========================================== ^&^& echo   Sofia Next.js Server [auto-respawn] ^&^& echo   Puerto: %PORT% ^&^& echo   Ctrl+C 2 veces para apagar ^&^& echo ========================================== ^&^& echo. ^&^& :loop ^&^& echo [%%TIME%%] Iniciando Next.js... ^&^& npm run dev ^&^& echo. ^&^& echo [%%TIME%%] Next.js murio. Reiniciando en 3s... ^&^& timeout /t 3 /nobreak >nul ^&^& goto loop)"

REM ─── 7. Esperar a que el puerto responda ────────────────────
echo [.] Esperando a que responda el dashboard...
set COUNT=0
:wait_loop
set /a COUNT+=1
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul
if not errorlevel 1 goto ready
if !COUNT! geq 30 goto timeout_err
<nul set /p =.
goto wait_loop

:ready
echo.
echo [+] Dashboard escuchando en puerto %PORT%
timeout /t 2 /nobreak >nul

REM ─── 8. Abrir navegador ─────────────────────────────────────
echo [+] Abriendo http://localhost:%PORT% ...
start "" "http://localhost:%PORT%"

echo.
echo ============================================
echo   [OK] Sofia corriendo (auto-respawn activo)
echo ============================================
echo.
echo   Atajos:
echo     Home:     http://localhost:%PORT%
echo     Login:    http://localhost:%PORT%/login
echo     Registro: http://localhost:%PORT%/registro
echo     Dashboard:http://localhost:%PORT%/dashboard
echo     Logs:     http://localhost:%PORT%/logs
echo.
echo   El server se re-inicia solo si crashea.
echo   Para apagar: cierra la ventana "Sofia Dashboard".
echo.
timeout /t 6 /nobreak >nul
endlocal
exit /b 0

:timeout_err
echo.
echo [X] El puerto %PORT% no respondio en 60 segundos.
echo     Revisa la ventana "Sofia Dashboard" por errores.
pause
endlocal
exit /b 1
