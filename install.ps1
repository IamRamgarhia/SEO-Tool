# One-line installer for Windows. Run via:
#   iwr -useb https://raw.githubusercontent.com/IamRamgarhia/SEO-Tool/main/install.ps1 | iex
#
# What it does:
#   1. Downloads the repo as a ZIP (no git required)
#   2. Auto-detects a free local port (default 3000)
#   3. If Docker Desktop is running -> uses Docker (recommended, handles everything)
#   4. Otherwise -> falls back to native Node install
#   5. Waits for /api/v1/health to confirm the app is actually up
#   6. Opens the browser to http://localhost:<PORT>
#   7. Drops SEO-Tool-Welcome.txt on the user's Desktop
#
# Idempotent. Safe to re-run for upgrades.

# IMPORTANT: don't use "Stop" globally - native tools (git, docker, npm) write
# normal status output to stderr and PowerShell strict-mode treats it as an
# error. Use try/catch where actual errors matter.
$ErrorActionPreference = "Continue"
$ProgressPreference   = "SilentlyContinue"  # speeds up Invoke-WebRequest 5-10x

# ---- config ----------------------------------------------------------------
$repoOwner   = "IamRamgarhia"
$repoName    = "SEO-Tool"
$branch      = if ($env:SEO_BRANCH) { $env:SEO_BRANCH } else { "main" }
$zipUrl      = "https://codeload.github.com/$repoOwner/$repoName/zip/refs/heads/$branch"
$dir         = if ($env:SEO_INSTALL_DIR) { $env:SEO_INSTALL_DIR } else { Join-Path $HOME "seo" }
$defaultPort = if ($env:SEO_PORT) { [int]$env:SEO_PORT } else { 3000 }
$desktop     = Join-Path $HOME "Desktop"

# ---- LOGGING -----------------------------------------------------------------
# Log everything to BOTH the console AND a file the user can send for support.
# Start the transcript at a temp location since $dir may not exist yet; we
# copy it to $dir\install.log at the end (and to the Desktop as a fallback).
$logPath     = Join-Path $env:TEMP "seo-tool-install.log"
$desktopLog  = Join-Path $desktop "SEO-Tool-install.log"
try { Stop-Transcript | Out-Null } catch {}
try {
    Start-Transcript -Path $logPath -Force | Out-Null
} catch {
    Write-Host "Could not start install transcript: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ---- ALWAYS PAUSE BEFORE EXIT ------------------------------------------------
# If this script runs from a double-click or `iex` and hits Die / throws,
# the window normally vanishes - user sees nothing. This handler keeps it
# open and tells them where the log is.
function Save-LogAndExit([bool]$failed) {
    try { Stop-Transcript | Out-Null } catch {}
    # Copy log into the install dir (if it exists) AND onto the Desktop
    # so the user can find it without knowing the install path.
    try {
        if (Test-Path $dir) { Copy-Item $logPath (Join-Path $dir "install.log") -Force -ErrorAction SilentlyContinue }
        if (Test-Path $desktop) { Copy-Item $logPath $desktopLog -Force -ErrorAction SilentlyContinue }
    } catch {}
    Write-Host ""
    if ($failed) {
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host "  INSTALL FAILED" -ForegroundColor Red
        Write-Host "============================================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Log saved to:"
        Write-Host "    $logPath"
        if (Test-Path $desktop) {
            Write-Host "    $desktopLog  (copy on your Desktop)"
        }
        Write-Host ""
        Write-Host "  To get help, email this log to: Contact@dicecodes.com"
        Write-Host "  Or open an issue with the log attached:"
        Write-Host "    https://github.com/IamRamgarhia/SEO-Tool/issues"
    } else {
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  INSTALL FINISHED" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Log saved to:  $logPath"
        Write-Host "  Also copied to: $desktopLog"
    }
    Write-Host ""
    # Only pause if running interactively (skip in CI / piped contexts)
    if ([Environment]::UserInteractive -and $Host.UI.RawUI) {
        try { Read-Host "Press Enter to close this window" } catch {}
    }
}

function Say($m)  { Write-Host "-> $m" -ForegroundColor Green }
function Info($m) { Write-Host "i  $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "!  $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "X  $m" -ForegroundColor Red; Save-LogAndExit $true; exit 1 }

# Trap for unhandled errors - keeps the window open even when something
# crashes unexpectedly (PowerShell parse errors, .NET exceptions, etc.)
trap {
    Write-Host ""
    Write-Host "X  Unhandled error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   At: $($_.InvocationInfo.PositionMessage)" -ForegroundColor Red
    Save-LogAndExit $true
    exit 1
}

Say "SEO Tool installer"
Info "Install location: $dir"
Info "Install log: $logPath"

# ---- 1. download / refresh repo via ZIP (no git required) -------------------
$tmpZip = Join-Path $env:TEMP "seo-tool-$(Get-Random).zip"
$tmpExtract = Join-Path $env:TEMP "seo-tool-extract-$(Get-Random)"

try {
    Say "Downloading the latest code (no git required)"
    Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing -ErrorAction Stop
} catch {
    Die "Couldn't download the code. Check your internet connection. ($($_.Exception.Message))"
}

try {
    Say "Extracting"
    if (Test-Path $tmpExtract) { Remove-Item -Recurse -Force $tmpExtract }
    Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force -ErrorAction Stop
} catch {
    Die "Couldn't extract the ZIP. ($($_.Exception.Message))"
}

# GitHub ZIPs extract as <repo>-<branch>/. Move into final location, preserving
# any existing data.db etc. that the user already has.
$extracted = Get-ChildItem -Path $tmpExtract -Directory | Select-Object -First 1
if (-not $extracted) { Die "ZIP didn't contain expected folder." }

if (Test-Path $dir) {
    Say "Existing install found at $dir - refreshing in place (your data is preserved)"
    # Copy files over, overwriting but NOT deleting things the ZIP doesn't have
    # (so user data like data.db stays).
    robocopy $extracted.FullName $dir /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
} else {
    Say "Installing fresh into $dir"
    Move-Item -Path $extracted.FullName -Destination $dir -Force
}

# Cleanup temp files
Remove-Item -Path $tmpZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue

Set-Location $dir

# ---- 2. find a free port ----------------------------------------------------
function Test-PortInUse($p) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $conn)
    } catch { return $false }
}

$port = $defaultPort
if (Test-PortInUse $port) {
    Warn "Port $port is occupied - finding a free one"
    foreach ($try in @(3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 8080, 8081, 4000, 5000)) {
        if (-not (Test-PortInUse $try)) {
            $port = $try
            break
        }
    }
}
Say "Using port $port"

# ---- 3. detect Docker -------------------------------------------------------
$hasDocker = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker info 2>$null 1>$null
    if ($LASTEXITCODE -eq 0) { $hasDocker = $true }
}

# ---- 4. install path: Docker or native -------------------------------------
$up = $false

if ($hasDocker) {
    Say "Docker detected - using Docker install (handles everything: Node, Chromium, deps)"

    docker compose version 2>$null 1>$null
    if ($LASTEXITCODE -ne 0) {
        Die "Docker is installed but 'docker compose' v2 is missing. Update Docker Desktop from https://www.docker.com/products/docker-desktop/"
    }

    $env:SEO_HOST_PORT = "$port"
    Say "Building image (first run: 3-5 min. Re-runs: seconds.)"
    docker compose up -d --build

    if ($LASTEXITCODE -ne 0) {
        Die "Docker build failed. Check: cd '$dir'; docker compose logs"
    }

    Say "Waiting for the app to come up..."
    for ($i = 0; $i -lt 60; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$port/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $up = $true; break }
        } catch {}
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
    }
    Write-Host ""

    if (-not $up) {
        Warn "App didn't respond after 2 minutes. Check: cd '$dir'; docker compose logs -f"
    } else {
        Say "App is up at http://localhost:$port"
    }
}
else {
    Warn "Docker not detected. Native install path."
    Write-Host ""
    Info "TIP: install Docker Desktop and re-run for a true one-command setup:"
    Info "     https://www.docker.com/products/docker-desktop/"
    Write-Host ""

    # Check Node
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Die @"
Node.js is required for the native install.

Quickest install:
  1. Open: https://nodejs.org/  (download LTS)
  2. Run the installer (default options)
  3. Re-run this command in a NEW PowerShell window

Or, if you have winget (Windows 10+):
  winget install OpenJS.NodeJS.LTS
"@
    }

    $nodeMajor = [int](node -p "process.versions.node.split('.')[0]" 2>$null)
    if ($nodeMajor -lt 20) {
        Die "Node $nodeMajor detected. Need Node 20+. Upgrade at https://nodejs.org/"
    }
    Say "Node $(node -v) ok"

    # Pick package manager - enable corepack so pnpm/yarn work without separate install
    $pm = $null
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        $pm = "pnpm"
    } else {
        # Try corepack - ships with Node 16.10+, gives us pnpm without npm install -g
        if (Get-Command corepack -ErrorAction SilentlyContinue) {
            Say "Enabling pnpm via corepack"
            corepack enable 2>$null 1>$null
            corepack prepare pnpm@latest --activate 2>$null 1>$null
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                $pm = "pnpm"
            }
        }
        if (-not $pm) {
            Warn "pnpm not available; falling back to npm (slower)"
            $pm = "npm"
        }
    }
    Say "Using $pm"

    # Belt-and-suspenders env vars for pnpm 11's build-script policy.
    # Mirrors the .npmrc settings but in case pnpm reads env vars first.
    $env:NPM_CONFIG_IGNORED_BUILDS_CHECK = "false"
    $env:NPM_CONFIG_IGNORED_BUILDS_FAIL_INSTALL = "false"
    $env:NPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS = "true"
    $env:NPM_CONFIG_AUTO_APPROVE_BUILDS = "true"

    Say "Installing dependencies (1-3 minutes the first time)"
    & $pm install
    $installOk = ($LASTEXITCODE -eq 0)

    if (-not $installOk) {
        # Strategy 1: try again with --ignore-scripts (bypass pnpm 11's
        # build-script safety entirely), then rebuild manually below.
        Warn "pnpm install failed. Retrying with --ignore-scripts..."
        & $pm install --ignore-scripts
        $installOk = ($LASTEXITCODE -eq 0)
    }

    if (-not $installOk) {
        # Strategy 2: nuclear option - wipe node_modules AND pnpm-lock.yaml
        # so pnpm fully re-resolves from package.json (where our allowlist
        # in pnpm.onlyBuiltDependencies lives). Preserves data.db /
        # .env.local / .seo-encryption-key which live in the install dir
        # root, not in node_modules.
        Warn "Still failed. Wiping node_modules + pnpm-lock.yaml for a fresh install..."
        if (Test-Path "node_modules")  { Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue }
        if (Test-Path "pnpm-lock.yaml") { Remove-Item -Force "pnpm-lock.yaml" -ErrorAction SilentlyContinue }
        & $pm install --ignore-scripts
        $installOk = ($LASTEXITCODE -eq 0)
    }

    if (-not $installOk) {
        # Strategy 3: fall back to npm. Slower and produces a different
        # lockfile, but doesn't have pnpm's build-script restriction.
        # This is a true last-resort - shouldn't be reached in practice
        # after the package.json + .npmrc fixes.
        if (Get-Command npm -ErrorAction SilentlyContinue) {
            Warn "pnpm install failed three times. Falling back to npm..."
            if (Test-Path "node_modules")  { Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue }
            if (Test-Path "pnpm-lock.yaml") { Remove-Item -Force "pnpm-lock.yaml" -ErrorAction SilentlyContinue }
            & npm install --no-audit --no-fund
            $installOk = ($LASTEXITCODE -eq 0)
        }
    }

    if (-not $installOk) {
        Die "Dependency install failed after multiple recovery attempts. See log for details."
    }

    # ALWAYS run rebuild to force native builds for allowlisted packages
    # (better-sqlite3, sharp, esbuild, tesseract.js, unrs-resolver, msw).
    # Non-fatal - if rebuild has issues, the modules may still work.
    Say "Rebuilding native modules (better-sqlite3, sharp, esbuild, etc)"
    & $pm rebuild 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Warn "pnpm rebuild reported issues - some native modules may need a manual rebuild later."
    }

    Say "Downloading Playwright Chromium (~170 MB, one-time)"
    & $pm exec playwright install chromium
    if ($LASTEXITCODE -ne 0) { Warn "Playwright install failed; rank-checking tools may not work" }

    Say "Applying database migrations"
    node scripts/migrate.cjs
    if ($LASTEXITCODE -ne 0) { Die "Migrations failed." }

    if (-not (Test-Path ".env.local")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env.local"
        }
    }

    # Build once now so daily startup runs in production mode - ~10x
    # faster page loads and roughly half the RAM of `next dev`.
    Say "Building production bundle (one-time, ~1-2 min). Skips JIT compile every navigation."
    & $pm run build
    if ($LASTEXITCODE -ne 0) {
        Warn "Production build failed - falling back to dev mode for daily startup."
        Warn "You can retry later with: $pm run build"
        $script:buildOk = $false
    } else {
        $script:buildOk = $true
    }

    Say "Starting server on port $port (background)"
    $logFile = Join-Path $dir "dev-server.log"
    $errFile = Join-Path $dir "dev-server.err.log"
    $pidFile = Join-Path $dir ".dev-server.pid"
    $batFile = Join-Path $dir ".dev-server.cmd"

    # Kill any prior server we started (from a previous install run)
    if (Test-Path $pidFile) {
        $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($oldPid) {
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
        }
    }
    # Also clear anything still bound to the port (e.g. lingering pnpm child)
    try {
        $bound = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($bound) {
            foreach ($c in $bound) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 1
        }
    } catch {}

    # Write a small .cmd file and launch THAT. pnpm/npm on Windows are .cmd
    # shims, so Start-Process -FilePath "pnpm" hits "%1 is not a valid Win32
    # application". A real .cmd file works around it cleanly and avoids all
    # the quote-escaping problems of `cmd /c "long command"`.
    $runScript = if ($script:buildOk) { "start:daily" } else { "dev" }
    @"
@echo off
set PORT=$port
$pm run $runScript
"@ | Out-File -FilePath $batFile -Encoding ASCII

    $proc = Start-Process -FilePath $batFile `
        -WorkingDirectory $dir `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errFile `
        -PassThru -WindowStyle Hidden -ErrorAction Stop
    $proc.Id | Out-File -FilePath $pidFile -Encoding ascii

    $waitLabel = if ($script:buildOk) { "(production start, ~2-5s)" } else { "(30-90s for first dev build)" }
    Say "Waiting for the app to come up... $waitLabel"
    for ($i = 0; $i -lt 90; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$port/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $up = $true; break }
        } catch {}
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
    }
    Write-Host ""
    if (-not $up) {
        Warn "App didn't respond on health check."
        $shown = $false
        foreach ($f in @($logFile, $errFile)) {
            if ((Test-Path $f) -and ((Get-Item $f).Length -gt 0)) {
                Write-Host ""
                Write-Host "Last lines of $f`:" -ForegroundColor Yellow
                Get-Content $f -Tail 30 | ForEach-Object { Write-Host "  $_" }
                Write-Host ""
                $shown = $true
            }
        }
        if (-not $shown) {
            Warn "Log files are empty - the server process didn't even start."
            Warn "Run manually to see what's happening:"
            Warn "  cd '$dir'"
            Warn "  $pm run dev"
        }
    } else {
        Say "App is up at http://localhost:$port"
    }
}

# ---- 5. Desktop shortcuts so non-techies can start/stop with one click
if ((Test-Path $desktop) -and (-not $hasDocker)) {
    try {
        $wshShell = New-Object -ComObject WScript.Shell
        $iconCandidates = @(
            (Join-Path $dir "public\favicon.ico"),
            (Join-Path $dir "public\icon.ico")
        )
        $iconPath = $null
        foreach ($ic in $iconCandidates) {
            if (Test-Path $ic) { $iconPath = $ic; break }
        }

        $startPath = Join-Path $desktop "Start SEO Tool.lnk"
        $startSc = $wshShell.CreateShortcut($startPath)
        $startSc.TargetPath = Join-Path $dir "START.cmd"
        $startSc.WorkingDirectory = $dir
        $startSc.Description = "Start the SEO Tool (DiceCodes)"
        if ($iconPath) { $startSc.IconLocation = $iconPath }
        $startSc.Save()
        Say "Created shortcut: $startPath"

        $stopPath = Join-Path $desktop "Stop SEO Tool.lnk"
        $stopSc = $wshShell.CreateShortcut($stopPath)
        $stopSc.TargetPath = Join-Path $dir "STOP.cmd"
        $stopSc.WorkingDirectory = $dir
        $stopSc.Description = "Stop the SEO Tool"
        if ($iconPath) { $stopSc.IconLocation = $iconPath }
        $stopSc.Save()
        Say "Created shortcut: $stopPath"

        # Clean up the old "SEO Tool.lnk" from previous installs if present.
        # We now have separate Start + Stop shortcuts.
        $oldPath = Join-Path $desktop "SEO Tool.lnk"
        if (Test-Path $oldPath) {
            Remove-Item $oldPath -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Warn "Couldn't create desktop shortcuts: $($_.Exception.Message)"
    }
}

# ---- 6. write a comprehensive desktop welcome file -------------------------
$welcome = Join-Path $desktop "SEO-Tool-Welcome.txt"
if (Test-Path $desktop) {
    $controls = if ($hasDocker) {
@"
Start:    cd "$dir"; `$env:SEO_HOST_PORT='$port'; docker compose up -d
Stop:     cd "$dir"; docker compose down
Restart:  cd "$dir"; docker compose restart
Logs:     cd "$dir"; docker compose logs -f
Status:   cd "$dir"; docker compose ps
Update:   Re-run the installer command (one-liner from README)
Backup:   Settings -> Backup & restore -> Download backup
"@
    } else {
@"
Start:    Double-click "Start SEO Tool" shortcut on your Desktop
          (or run: $dir\START.cmd)
Stop:     Double-click "Stop SEO Tool" shortcut on your Desktop
          (or run: $dir\STOP.cmd)
          (or in app: profile menu -> System health -> Shutdown)
Restart:  In the app -> profile menu -> Restart server (top-right power icon)
Logs:     Get-Content "$dir\dev-server.log" -Wait -Tail 100
Update:   Re-run the installer command (one-liner from README)
Backup:   Settings -> Backup & restore -> Download backup
"@
    }

    $folderLayout = if ($hasDocker) {
@"
$dir\
  docker-compose.yml          <- service definition
  Dockerfile                  <- image build
  data.db                     <- (lives in /data inside the named volume "seo-data")
"@
    } else {
@"
$dir\
  START.cmd                   <- DOUBLE-CLICK to start the server (your daily-use file)
  STOP.cmd                    <- DOUBLE-CLICK to stop the server
  data.db                     <- your SQLite database (clients, keywords, audits, reports - back this up)
  .seo-encryption-key         <- AES key that decrypts your API keys (back this up too)
  .env.local                  <- env config (APP_PASSWORD, custom env vars)
  dev-server.log              <- runtime log (tail this for errors)
  .dev-server.pid             <- PID of the running server
  screenshots\                <- SERP screenshots from rank checks
  data\screenshots\           <- same, when run via Docker
  README.md                   <- full feature list + install + license
  TROUBLESHOOTING.md          <- 12-section support doc
  docs\HOSTING.md             <- production hosting guides (Hetzner, Railway, etc)
  ROADMAP.md                  <- what's coming next
  wordpress-plugin\           <- companion WordPress plugin (.zip and install)
"@
    }

    $content = @"
======================================================
   SEO TOOL - INSTALLED SUCCESSFULLY
   Built by DiceCodes (https://dicecodes.com)
======================================================

Open the app:        http://localhost:$port
Install location:    $dir

You can find this guide on your Desktop any time.

----------------------- FIRST 5 MIN ------------------
1. Open http://localhost:$port
2. Add a client at /clients/new (paste any domain - it'll
   auto-detect the tech stack and niche)
3. Pick an AI provider at /settings:
     - Local Ollama (free, private, fully offline)  OR
     - Gemini / Groq / OpenRouter / DeepSeek (free tiers, paste key)  OR
     - OpenAI / Anthropic (paid, BYO key)
4. Run your first audit
5. Tomorrow: the daily AI agent kicks in automatically and runs ~17
   automated jobs per client (rank checks, audit deltas, content
   decay, backlink scans, GBP monitoring, alerts).

----------------------- WHERE EVERYTHING LIVES -------
$folderLayout

----------------------- CONTROLS ---------------------
$controls

----------------------- TROUBLESHOOT -----------------
Blank page?       Server still building - wait 30-60s and refresh.
Port conflict?    The installer auto-tries 3001-3010, 8080-81, 4000, 5000.
                  If it picked a different port than 3000, this guide shows it
                  at the top. To force a port: `$env:SEO_PORT='4000' before
                  re-running the installer.
Want a password?  Set APP_PASSWORD=yourpassword in $dir\.env.local then restart.
LAN access?       Default binds to 127.0.0.1 only. To expose on your LAN,
                  set APP_PASSWORD (required) AND SEO_BIND_HOST=0.0.0.0
                  in $dir\.env.local, then restart.
Backup/Restore?   Settings -> Backup & restore in the app.
Forgot password?  Edit $dir\.env.local, remove the APP_PASSWORD line, restart.
Full guide:       $dir\TROUBLESHOOTING.md (12 sections, covers most issues)

----------------------- DAILY USE --------------------
The fastest way to launch every day:
   Double-click the "Start SEO Tool" shortcut on your desktop.
   When you're done, double-click "Stop SEO Tool" to shut it down.

The app auto-opens in your browser. If the port is already serving
(you opened it earlier), the launcher just opens a new tab.

Your data NEVER leaves this machine. No telemetry. No phone-home.
The only outbound network calls are:
   - Google's free APIs (GSC, GA4, PageSpeed) - only when you connect them
   - Your chosen AI provider (only when you run AI features)
   - SERP scraping via headless browser (only when you check rankings)

----------------------- HELP -------------------------
Repo + issues:    https://github.com/IamRamgarhia/SEO-Tool
Troubleshooting:  $dir\TROUBLESHOOTING.md
Hosting guides:   $dir\docs\HOSTING.md
README:           $dir\README.md
Email support:    Contact@dicecodes.com

----------------------- SUPPORT THIS PROJECT ---------
This tool is free and self-hosted. If it saves you the cost of
an Ahrefs or Semrush subscription:
   - Star the repo (huge impact, zero cost):
     https://github.com/IamRamgarhia/SEO-Tool
   - UPI (India): princeramgarhiaa-1@okaxis
     (Open the app -> click the Support button for QR + presets)
   - PayPal (international):
     https://www.paypal.com/donate/?business=princeramgarhiaa@gmail.com

======================================================
"@
    $content | Out-File -FilePath $welcome -Encoding utf8
    Say "Created Desktop guide: $welcome"
}

# ---- 7. auto-open browser ---------------------------------------------------
$url = "http://localhost:$port"
if ($up) {
    Say "Opening browser"
    Start-Process $url
}

Write-Host ""
Write-Host "SEO Tool ready." -ForegroundColor Green
Write-Host ""
Write-Host "Open:    $url"
if (Test-Path $welcome) { Write-Host "Guide:   $welcome" }
Write-Host ""

# Stop transcript + save log copies + pause so the window doesn't auto-close
Save-LogAndExit $false
