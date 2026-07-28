[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeFile = Join-Path $Root ".runtime\processes.json"

if (-not (Test-Path -LiteralPath $RuntimeFile)) {
    Write-Host "InfinityAtlas has no recorded local processes."
    exit 0
}

$record = Get-Content -Raw -LiteralPath $RuntimeFile | ConvertFrom-Json

function Stop-TrustedProcessTree {
    param(
        [int]$ProcessId,
        [switch]$TrustedDescendant
    )

    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue
    if (-not $processInfo) {
        return
    }
    if (-not $TrustedDescendant -and (-not $processInfo.CommandLine -or -not $processInfo.CommandLine.Contains($Root))) {
        throw "Refusing to stop process $ProcessId because it is not associated with this workspace."
    }
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-TrustedProcessTree -ProcessId $child.ProcessId -TrustedDescendant
    }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

Stop-TrustedProcessTree -ProcessId ([int]$record.frontend)
Stop-TrustedProcessTree -ProcessId ([int]$record.backend)
Remove-Item -LiteralPath $RuntimeFile -Force
Write-Host "InfinityAtlas local services stopped correctly."
