param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173,
  [int]$ReadinessTimeoutSec = 30,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$logDir = Join-Path $env:TEMP "collecta-dev"
$pidFile = Join-Path $logDir "collecta-dev-pids.txt"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if ($Force -and (Test-Path $pidFile)) {
  Write-Host "[collecta-dev] -Force: stopping previous PIDs from $pidFile"
  Get-Content -LiteralPath $pidFile | ForEach-Object {
    if ($_ -match '^(.+)=(\d+)$') {
      $oldName = $Matches[1]
      $oldPid = [int]$Matches[2]
      try {
        Stop-Process -Id $oldPid -Force -ErrorAction Stop
        Write-Host "[collecta-dev] stopped previous $oldName (PID $oldPid)"
      } catch {
        Write-Host "[collecta-dev] previous $oldName (PID $oldPid) was already gone"
      }
    }
  }
}

if (Test-Path $pidFile) {
  Remove-Item -LiteralPath $pidFile -Force
}

function Invoke-Step {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  Write-Host "[collecta-dev] $Name"
  Push-Location $WorkingDirectory
  try {
    cmd.exe /c $Command
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Start-CollectaProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$OutFile,
    [string]$ErrFile
  )

  $process = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/c", $Command) `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $OutFile `
    -RedirectStandardError $ErrFile `
    -WindowStyle Hidden `
    -PassThru

  "$Name=$($process.Id)" | Add-Content -Path $pidFile
  Write-Host "[collecta-dev] $Name PID: $($process.Id)"
  Write-Host "[collecta-dev] $Name stdout: $OutFile"
  Write-Host "[collecta-dev] $Name stderr: $ErrFile"
  return $process
}

Write-Host "[collecta-dev] Repo: $repoRoot"
Write-Host "[collecta-dev] Logs: $logDir"

function Wait-HttpReady {
  param([string]$Url, [int]$TimeoutSec = 30)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
      if ($r.StatusCode -lt 500) { return $true }
    } catch { Start-Sleep -Milliseconds 500 }
  }
  return $false
}

Invoke-Step "Prepare safe test database" $backendDir "npm run test:prepare"

$backendOut = Join-Path $logDir "backend.out.log"
$backendErr = Join-Path $logDir "backend.err.log"
$frontendOut = Join-Path $logDir "frontend.out.log"
$frontendErr = Join-Path $logDir "frontend.err.log"

if (Test-Path (Join-Path $backendDir ".env.test")) {
  $backendCommand = 'node --env-file-if-exists=.env.test ./node_modules/nodemon/bin/nodemon.js --exec "node --max-old-space-size=4096 -r ts-node/register src/index.ts"'
} else {
  $backendCommand = "npm run dev"
}

$frontendCommand = "set VITE_API_URL=http://localhost:$BackendPort/api&& npm run dev -- --host 127.0.0.1 --port $FrontendPort"

Start-CollectaProcess "backend" $backendDir $backendCommand $backendOut $backendErr | Out-Null

Write-Host "[collecta-dev] Waiting for backend readiness on /api/health (timeout ${ReadinessTimeoutSec}s)..."
$healthUrl = "http://localhost:$BackendPort/api/health"
$ready = Wait-HttpReady -Url $healthUrl -TimeoutSec $ReadinessTimeoutSec
if ($ready) {
  Write-Host "[collecta-dev] Backend is reachable at $healthUrl"
} else {
  Write-Warning "[collecta-dev] Backend did not respond at $healthUrl within ${ReadinessTimeoutSec}s. Frontend will start anyway; check $backendErr for errors."
}

Start-CollectaProcess "frontend" $frontendDir $frontendCommand $frontendOut $frontendErr | Out-Null

Write-Host ""
Write-Host "[collecta-dev] Backend URL:  http://localhost:$BackendPort/api"
Write-Host "[collecta-dev] Frontend URL: http://localhost:$FrontendPort/"
Write-Host "[collecta-dev] PID file:     $pidFile"
Write-Host ""
Write-Host "[collecta-dev] Stop services started by this script with:"
Write-Host "  .\scripts\collecta-stop.ps1"
Write-Host "  # or manually: Get-Content '$pidFile' | ForEach-Object { if (`$_ -match '=(\d+)$') { Stop-Process -Id `$Matches[1] -ErrorAction SilentlyContinue } }"
