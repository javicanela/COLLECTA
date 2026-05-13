param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$logDir = Join-Path $env:TEMP "collecta-dev"
$pidFile = Join-Path $logDir "collecta-dev-pids.txt"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
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
Start-CollectaProcess "frontend" $frontendDir $frontendCommand $frontendOut $frontendErr | Out-Null

Write-Host ""
Write-Host "[collecta-dev] Backend URL:  http://localhost:$BackendPort/api"
Write-Host "[collecta-dev] Frontend URL: http://localhost:$FrontendPort/"
Write-Host "[collecta-dev] PID file:     $pidFile"
Write-Host ""
Write-Host "[collecta-dev] Stop services started by this script with:"
Write-Host "Get-Content '$pidFile' | ForEach-Object { if (`$_ -match '=(\d+)$') { Stop-Process -Id `$Matches[1] -ErrorAction SilentlyContinue } }"
