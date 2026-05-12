@echo off
REM SEO Tool launcher (Windows). Starts the server on a chosen port and
REM opens the browser when it's reachable.
REM
REM Mode selection:
REM   - If .next\BUILD_ID exists → production mode (next start). Fast
REM     startup (~2s), low RAM, instant page loads. This is the default.
REM   - Otherwise → dev mode (next dev). Slower first paint, hot reload.
REM     Run `pnpm build` once to switch to production mode.
REM
REM Env vars:
REM   PORT          target port (default 3000)
REM   SEO_RESTART   when 1, skips opening a fresh browser tab
REM   SEO_FORCE_DEV when 1, forces dev mode even if a build exists

setlocal
cd /d "%~dp0"

REM ---- 1. Resolve PORT (caller env > .seo-port file > 3000)
if "%PORT%"=="" (
  if exist ".seo-port" (
    set /p PORT=<.seo-port
  )
)
if "%PORT%"=="" set "PORT=3000"

REM ---- 2. Find pnpm or npm
where pnpm >nul 2>&1
if %errorlevel%==0 (
  set "PM=pnpm"
) else (
  where npm >nul 2>&1
  if %errorlevel%==0 (
    set "PM=npm"
  ) else (
    echo Node / npm not found. Install Node 20+ from https://nodejs.org
    pause
    exit /b 1
  )
)

REM ---- 3. Already running on this port?
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:%PORT%/api/v1/health -TimeoutSec 1).StatusCode | Out-Null; exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
  if not "%SEO_RESTART%"=="1" start "" "http://localhost:%PORT%"
  exit /b 0
)

REM On restart, give the old server a moment to free the port.
if "%SEO_RESTART%"=="1" timeout /t 2 /nobreak >nul

REM ---- 4. Pick mode. Production if a build exists, dev otherwise.
set "RUN_CMD=dev"
if exist ".next\BUILD_ID" if not "%SEO_FORCE_DEV%"=="1" set "RUN_CMD=start:daily"

REM ---- 5. Write a small batch shim and launch THAT under PowerShell's
REM Start-Process. Avoids quote-escaping pitfalls with paths that
REM contain spaces (e.g. C:\Users\John Doe\seo). The shim sets PORT
REM and HOSTNAME (= 127.0.0.1 = localhost-only) before invoking the
REM package manager. Override with SEO_BIND_HOST=0.0.0.0 for LAN access.
if "%SEO_BIND_HOST%"=="" set "SEO_BIND_HOST=127.0.0.1"

> ".dev-server.cmd" (
  echo @echo off
  echo set PORT=%PORT%
  echo set HOSTNAME=%SEO_BIND_HOST%
  echo %PM% run %RUN_CMD%
)
type nul > dev-server.log
powershell -NoProfile -Command "Start-Process -FilePath '.dev-server.cmd' -WindowStyle Hidden -WorkingDirectory \"%CD%\" -RedirectStandardOutput 'dev-server.log' -RedirectStandardError 'dev-server.err.log'"

REM ---- 7. Wait for /api/v1/health. Production: usually <3s. Dev: 30-60s
REM on first run while Next compiles. We poll /api/v1/health (cheap JSON
REM endpoint) instead of / so dev-mode compilation isn't triggered just
REM by the health check.
powershell -NoProfile -Command "for ($i=0; $i -lt 60; $i++) { try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:%PORT%/api/v1/health -TimeoutSec 1).StatusCode | Out-Null; break } catch { Start-Sleep -Seconds 1 } }"
if not "%SEO_RESTART%"=="1" start "" "http://localhost:%PORT%"
endlocal
