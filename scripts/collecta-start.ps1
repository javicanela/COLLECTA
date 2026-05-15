param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendUrl = "http://localhost:$FrontendPort/"

Write-Host "[collecta-start] Repo: $repoRoot"
Write-Host "[collecta-start] Running doctor..."

& (Join-Path $PSScriptRoot "collecta-doctor.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "collecta-doctor found issues. Run .\scripts\collecta-setup.ps1 or fix the messages above."
}

Write-Host ""
Write-Host "[collecta-start] Starting Collecta..."
& (Join-Path $PSScriptRoot "collecta-dev.ps1") -BackendPort $BackendPort -FrontendPort $FrontendPort -Force:$Force
if ($LASTEXITCODE -ne 0) {
  throw "collecta-dev failed."
}

Write-Host "[collecta-start] Opening $frontendUrl"
Start-Process $frontendUrl
