param(
  [int]$MinimumFreeGb = 5
)

$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot
$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Write-Check {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Detail = ""
  )

  $line = "[collecta-doctor] $Name`: $Status"
  if ($Detail) {
    $line = "$line - $Detail"
  }
  Write-Host $line
}

function Add-Issue {
  param([string]$Message)
  $issues.Add($Message) | Out-Null
}

function Add-Warning {
  param([string]$Message)
  $warnings.Add($Message) | Out-Null
}

function Get-CommandText {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  try {
    $output = & $Command @Arguments 2>$null
    if ($LASTEXITCODE -eq 0 -and $output) {
      return ($output | Select-Object -First 1).ToString().Trim()
    }
  } catch {
    return $null
  }
  return $null
}

function Test-PortAvailable {
  param([int]$Port)

  $listener = $null
  try {
    $address = [System.Net.IPAddress]::Parse("127.0.0.1")
    $listener = [System.Net.Sockets.TcpListener]::new($address, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

Write-Host "[collecta-doctor] Repo: $repoRoot"

$nodeVersion = Get-CommandText "node" @("--version")
if ($nodeVersion) {
  Write-Check "Node" "OK" $nodeVersion
} else {
  Write-Check "Node" "MISSING"
  Add-Issue "Node.js is required."
}

$npmVersion = Get-CommandText "npm" @("--version")
if ($npmVersion) {
  Write-Check "npm" "OK" $npmVersion
} else {
  Write-Check "npm" "MISSING"
  Add-Issue "npm is required."
}

function Test-TcpReachable {
  param([string]$HostName, [int]$Port, [int]$TimeoutMs = 1500)
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect($HostName, $Port, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      $client.EndConnect($iar)
      $client.Close()
      return $true
    }
    $client.Close()
    return $false
  } catch {
    return $false
  }
}

function Get-CommandWithTimeout {
  param([string]$Command, [string[]]$Arguments, [int]$TimeoutSec = 5)
  $job = Start-Job -ScriptBlock { param($c, $a) & $c @$a 2>$null } -ArgumentList $Command, $Arguments
  $job | Wait-Job -Timeout $TimeoutSec | Out-Null
  if ($job.State -eq 'Running') {
    $job | Stop-Job | Out-Null
    Remove-Job $job -Force
    return $null
  }
  $output = $job | Receive-Job
  Remove-Job $job -Force
  if (-not $output) { return $null }
  return ($output | Select-Object -First 1).ToString().Trim()
}

$dockerVersion = Get-CommandText "docker" @("--version")
if ($dockerVersion) {
  Write-Check "Docker CLI" "OK" $dockerVersion
  $dockerInfo = Get-CommandWithTimeout "docker" @("info", "--format", "{{.ServerVersion}}") 5
  if ($dockerInfo) {
    Write-Check "Docker daemon" "OK" "server $dockerInfo"
  } else {
    Write-Check "Docker daemon" "WARNING" "not reachable"
    Add-Warning "Docker daemon is not reachable. Open Docker Desktop or use an existing local PostgreSQL test database."
  }

  $container = Get-CommandWithTimeout "docker" @("ps", "-a", "--filter", "name=collecta-test-postgres", "--format", "{{.Status}}") 5
  if ($container) {
    Write-Check "collecta-test-postgres" "OK" $container
  } else {
    Write-Check "collecta-test-postgres" "WARNING" "container not found"
    Add-Warning "Test Postgres container is not present. backend npm run test:prepare can create it when Docker is running."
  }
} else {
  Write-Check "Docker CLI" "WARNING" "not found"
  Add-Warning "Docker is optional only if a safe local PostgreSQL test database is already available."
}

if (Test-TcpReachable "127.0.0.1" 5432) {
  Write-Check "Postgres TCP" "OK" "127.0.0.1:5432 alcanzable"
} else {
  Write-Check "Postgres TCP" "WARNING" "127.0.0.1:5432 no responde"
  Add-Warning "Postgres no responde en 5432. Inicia el contenedor o tu instancia local."
}

$rootDriveName = ([System.IO.Path]::GetPathRoot($repoRoot)).TrimEnd("\").TrimEnd(":")
$drive = Get-PSDrive -Name $rootDriveName -ErrorAction SilentlyContinue
if ($drive) {
  $freeGb = [math]::Round($drive.Free / 1GB, 2)
  if ($freeGb -ge $MinimumFreeGb) {
    Write-Check "Free disk" "OK" "$freeGb GB available on $($drive.Name):"
  } else {
    Write-Check "Free disk" "WARNING" "$freeGb GB available on $($drive.Name):"
    Add-Warning "Free disk is below $MinimumFreeGb GB. Keep logs and artifacts outside the repo."
  }
} else {
  Write-Check "Free disk" "WARNING" "could not inspect drive"
  Add-Warning "Could not inspect free disk space."
}

$envTest = Join-Path $repoRoot "backend\.env.test"
if (Test-Path $envTest) {
  Write-Check "backend/.env.test" "OK" "file present"
  $required = @('DATABASE_URL', 'JWT_SECRET', 'API_KEY', 'ADMIN_USER', 'ADMIN_PASS')
  $contentLines = Get-Content -LiteralPath $envTest
  foreach ($key in $required) {
    $found = $false
    foreach ($line in $contentLines) {
      if ($line -match "^\s*$([regex]::Escape($key))\s*=") {
        $found = $true
        break
      }
    }
    if ($found) {
      Write-Check "backend/.env.test [$key]" "OK" "present"
    } else {
      Write-Check "backend/.env.test [$key]" "WARNING" "missing"
      Add-Warning "backend/.env.test does not define $key. DB-backed tests that depend on this variable will fail."
    }
  }
} else {
  Write-Check "backend/.env.test" "MISSING" "file not found"
  Add-Warning "backend/.env.test is missing. Default backend npm test still runs unit tests; copy backend/.env.test.example before npm run test:full."
}

$backendNodeModules = Join-Path $repoRoot "backend\node_modules"
$frontendNodeModules = Join-Path $repoRoot "frontend\node_modules"
if (Test-Path $backendNodeModules) {
  Write-Check "Backend dependencies" "OK" "backend/node_modules exists"
} else {
  Write-Check "Backend dependencies" "MISSING" "run npm install in backend"
  Add-Issue "Backend dependencies are missing."
}

if (Test-Path $frontendNodeModules) {
  Write-Check "Frontend dependencies" "OK" "frontend/node_modules exists"
} else {
  Write-Check "Frontend dependencies" "MISSING" "run npm install in frontend"
  Add-Issue "Frontend dependencies are missing."
}

foreach ($port in @(3001, 5173)) {
  if (Test-PortAvailable $port) {
    Write-Check "Port $port" "OK" "available"
  } else {
    Write-Check "Port $port" "BUSY" "stop the process using this port before collecta-dev"
    Add-Issue "Port $port is not available."
  }
}

if ($warnings.Count -gt 0) {
  Write-Host ""
  Write-Host "[collecta-doctor] Warnings:"
  foreach ($warning in $warnings) {
    Write-Host " - $warning"
  }
}

if ($issues.Count -gt 0) {
  Write-Host ""
  Write-Host "[collecta-doctor] Issues:"
  foreach ($issue in $issues) {
    Write-Host " - $issue"
  }
  exit 1
}

Write-Host ""
Write-Host "[collecta-doctor] OK. Local prerequisites look ready."
