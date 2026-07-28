[CmdletBinding()]
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runtime = Join-Path $Root ".runtime"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$Vite = Join-Path $Frontend "node_modules\vite\bin\vite.js"
$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$BundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Node = if ($NodeCommand) { $NodeCommand.Source } elseif (Test-Path -LiteralPath $BundledNode) { $BundledNode } else { $null }

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Backend virtual environment not found. Follow README installation once."
}
if (-not (Test-Path -LiteralPath $Vite)) {
    throw "Frontend dependencies not found. Run pnpm install --frozen-lockfile once."
}
if (-not $Node) {
    throw "Node.js was not found. Install Node.js 22 or run InfinityAtlas from the Codex workspace."
}
if (-not (Test-Path -LiteralPath (Join-Path $Backend ".env"))) {
    throw "backend/.env is required. Create it from .env.example without publishing its values."
}

foreach ($port in @($BackendPort, $FrontendPort)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($listener) {
        throw "Port $port is already in use. Run .\stop-local.ps1 or choose another port."
    }
}

New-Item -ItemType Directory -Path $Runtime -Force | Out-Null

Push-Location $Backend
try {
    $jwtReady = & $Python -c "from app.core.config import settings; print('ready' if settings.jwt_is_configured else 'missing')" 2>$null
    if ($jwtReady -ne "ready") {
        throw "JWT_SECRET_KEY is missing or still a placeholder in backend/.env."
    }
    & $Python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        throw "Database migration failed."
    }
} finally {
    Pop-Location
}

$backendProcess = Start-Process `
    -FilePath $Python `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", $BackendPort) `
    -WorkingDirectory $Backend `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $Runtime "backend.log") `
    -RedirectStandardError (Join-Path $Runtime "backend-error.log") `
    -PassThru

$frontendProcess = Start-Process `
    -FilePath $Node `
    -ArgumentList @($Vite, "--host", "127.0.0.1", "--port", $FrontendPort) `
    -WorkingDirectory $Frontend `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $Runtime "frontend.log") `
    -RedirectStandardError (Join-Path $Runtime "frontend-error.log") `
    -PassThru

@{
    root = $Root
    backend = $backendProcess.Id
    frontend = $frontendProcess.Id
    started_at = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Runtime "processes.json") -Encoding UTF8

$healthy = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($backendProcess.HasExited) {
        break
    }
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 2
        if ($health.status -eq "ok") {
            $healthy = $true
            break
        }
    } catch {
        # The service may still be starting.
    }
}

if (-not $healthy) {
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    throw "Backend health check did not become ready. Review .runtime/backend-error.log."
}

Write-Host "InfinityAtlas is running."
Write-Host "Application: http://127.0.0.1:$FrontendPort"
Write-Host "API health:  http://127.0.0.1:$BackendPort/health"
Write-Host "API docs:    http://127.0.0.1:$BackendPort/docs"
