param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$WaspArgs
)

$ErrorActionPreference = 'Stop'

function Get-WslSafePath {
  param([string]$PathValue)

  return (($PathValue -split ';') | Where-Object {
    $entry = $_
    if ([string]::IsNullOrWhiteSpace($entry)) {
      return $false
    }
    if ($entry -match '^[A-Za-z]:\\') {
      return Test-Path -LiteralPath $entry
    }
    return $true
  }) -join ';'
}

function Invoke-Ubuntu {
  param([string[]]$Arguments)

  $originalPath = $env:Path
  try {
    $env:Path = Get-WslSafePath $originalPath
    $output = & wsl.exe -d Ubuntu @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $filtered = $output | Where-Object {
      "$_" -notmatch "^wsl: Failed to translate '"
    }

    if ($filtered) {
      $filtered
    }

    if ($exitCode -ne 0) {
      throw "WSL Ubuntu command failed with exit code $exitCode."
    }
  } finally {
    $env:Path = $originalPath
  }
}

$nodeDir = '/home/lenovo/.local/node-v24.14.1-linux-x64'
$currentPath = (Get-Location).Path
$wslPath = (Invoke-Ubuntu @('--', 'wslpath', '-a', $currentPath) | Select-Object -First 1).Trim()

if (-not $wslPath) {
  throw 'Could not translate the current Windows path to a WSL path.'
}

$linuxPath = "$nodeDir/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
$ubuntuArgs = @('--cd', $wslPath, '--', 'env', "PATH=$linuxPath", 'wasp') + $WaspArgs
Invoke-Ubuntu $ubuntuArgs
