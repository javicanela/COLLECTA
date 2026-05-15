param(
  [switch]$ForceInstall,
  [switch]$SkipDbPrepare
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$envTest = Join-Path $backendDir ".env.test"
$envTestExample = Join-Path $backendDir ".env.test.example"

function Invoke-Step {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  Write-Host ""
  Write-Host "[collecta-setup] START $Name"
  Push-Location $WorkingDirectory
  try {
    cmd.exe /c $Command
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }
    Write-Host "[collecta-setup] PASS $Name"
  } finally {
    Pop-Location
  }
}

function Ensure-Dependencies {
  param(
    [string]$Name,
    [string]$Directory
  )

  $nodeModules = Join-Path $Directory "node_modules"
  if ($ForceInstall -or -not (Test-Path $nodeModules)) {
    Invoke-Step "$Name npm install" $Directory "npm install"
  } else {
    Write-Host "[collecta-setup] $Name dependencies already present"
  }
}

Write-Host "[collecta-setup] Repo: $repoRoot"

if (-not (Test-Path $envTest)) {
  if (-not (Test-Path $envTestExample)) {
    throw "backend/.env.test.example was not found. Cannot create a safe local test environment."
  }

  Copy-Item -LiteralPath $envTestExample -Destination $envTest -ErrorAction Stop
  Write-Host "[collecta-setup] Created backend/.env.test from backend/.env.test.example"
} else {
  Write-Host "[collecta-setup] backend/.env.test already exists; leaving it unchanged"
}

Ensure-Dependencies "backend" $backendDir
Ensure-Dependencies "frontend" $frontendDir

if (-not $SkipDbPrepare) {
  Invoke-Step "safe local test database prepare" $backendDir "npm run test:prepare"
} else {
  Write-Host "[collecta-setup] Skipping DB prepare by request"
}

& (Join-Path $PSScriptRoot "collecta-doctor.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "collecta-doctor found issues. Fix the messages above and rerun collecta-setup."
}

Write-Host ""
Write-Host "[collecta-setup] OK. Collecta is ready for local start."
Write-Host "[collecta-setup] Next: .\scripts\collecta-start.ps1"
