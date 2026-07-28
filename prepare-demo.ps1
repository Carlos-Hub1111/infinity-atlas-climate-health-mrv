[CmdletBinding()]
param(
    [switch]$ConfirmReset
)

$ErrorActionPreference = "Stop"
if (-not $ConfirmReset) {
    throw "This operation replaces local demo records. Run again with -ConfirmReset."
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$RuntimeFile = Join-Path $Root ".runtime\processes.json"

if (Test-Path -LiteralPath $RuntimeFile) {
    throw "Stop InfinityAtlas with .\stop-local.ps1 before preparing a clean demo."
}
if (-not (Test-Path -LiteralPath $Python)) {
    throw "Backend virtual environment not found."
}

$BackupDirectory = Join-Path $Backend "backups"
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$Database = Join-Path $Backend "local.db"
if (Test-Path -LiteralPath $Database) {
    $stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
    Copy-Item -LiteralPath $Database -Destination (Join-Path $BackupDirectory "local-before-demo-$stamp.db")
}

Push-Location $Backend
try {
    & $Python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw "Database migration failed." }
    & $Python -m app.bootstrap --clean-demo --confirm-clean-demo
    if ($LASTEXITCODE -ne 0) { throw "Clean demo bootstrap failed." }
    & $Python -m app.demo_users --reset-passwords
    if ($LASTEXITCODE -ne 0) { throw "Demo user preparation failed." }
} finally {
    Pop-Location
}

Write-Host "Clean local demonstration prepared."
Write-Host "Temporary passwords were shown only in this local console when not supplied by local environment variables."
