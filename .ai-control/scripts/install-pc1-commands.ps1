$CommandDir = "$env:USERPROFILE\AICommands"
New-Item -ItemType Directory -Force -Path $CommandDir | Out-Null

$Repo = "C:\Users\LENOVO\Desktop\COLLECTA"

Set-Content "$CommandDir\status.ps1" "cd `"$Repo`"; powershell -ExecutionPolicy Bypass -File .ai-control\scripts\status.ps1"
Set-Content "$CommandDir\queue.ps1" "cd `"$Repo`"; powershell -ExecutionPolicy Bypass -File .ai-control\scripts\queue.ps1"
Set-Content "$CommandDir\logs.ps1" "cd `"$Repo`"; powershell -ExecutionPolicy Bypass -File .ai-control\scripts\logs.ps1"

Set-Content "$CommandDir\task.ps1" @"
param(
  [Parameter(Mandatory=`$true)]
  [string]`$Name,

  [Parameter(Mandatory=`$true)]
  [string]`$Objective
)

cd "$Repo"
powershell -ExecutionPolicy Bypass -File .ai-control\scripts\task.ps1 -Name `$Name -Objective `$Objective
"@

$UserPath = [Environment]::GetEnvironmentVariable("Path","User")
if ($UserPath -notlike "*$CommandDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$UserPath;$CommandDir", "User")
}

Write-Host "Comandos instalados en: $CommandDir"
Write-Host "Cierra y reabre Antigravity para usar:"
Write-Host "status"
Write-Host "queue"
Write-Host "logs"
Write-Host 'task "nombre" "objetivo"'
