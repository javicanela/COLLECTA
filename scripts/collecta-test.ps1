param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$results = New-Object System.Collections.Generic.List[string]

function Invoke-TestStep {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  $startedAt = Get-Date
  Write-Host ""
  Write-Host "[collecta-test] START $Name"
  Push-Location $WorkingDirectory
  try {
    cmd.exe /c $Command
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }
    $elapsed = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
    $results.Add("PASS $Name ($elapsed s)") | Out-Null
    Write-Host "[collecta-test] PASS $Name"
  } catch {
    $elapsed = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
    $results.Add("FAIL $Name ($elapsed s)") | Out-Null
    Write-Host ""
    Write-Host "[collecta-test] Summary:"
    foreach ($result in $results) {
      Write-Host " - $result"
    }
    throw
  } finally {
    Pop-Location
  }
}

Write-Host "[collecta-test] Repo: $repoRoot"

Invoke-TestStep "backend test DB prepare" $backendDir "npm run test:prepare"
Invoke-TestStep "frontend build" $frontendDir "npm run build"
Invoke-TestStep "frontend tests" $frontendDir "npm test"
Invoke-TestStep "backend build" $backendDir "npm run build"
Invoke-TestStep "backend full tests" $backendDir "npm run test:full"

Write-Host ""
Write-Host "[collecta-test] Summary:"
foreach ($result in $results) {
  Write-Host " - $result"
}
Write-Host "[collecta-test] OK. Build and test suite passed."
