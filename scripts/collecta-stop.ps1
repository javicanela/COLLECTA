$ErrorActionPreference = "Continue"
$logDir = Join-Path $env:TEMP "collecta-dev"
$pidFile = Join-Path $logDir "collecta-dev-pids.txt"

if (-not (Test-Path $pidFile)) {
  Write-Host "[collecta-stop] No hay PID file en $pidFile. Nada que detener."
  exit 0
}

Get-Content $pidFile | ForEach-Object {
  if ($_ -match '^(.+)=(\d+)$') {
    $name = $Matches[1]; $procId = [int]$Matches[2]
    try {
      Stop-Process -Id $procId -ErrorAction Stop
      Write-Host "[collecta-stop] $name (PID $procId) detenido."
    } catch {
      Write-Host "[collecta-stop] $name (PID $procId) ya no estaba activo."
    }
  }
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "[collecta-stop] OK."
