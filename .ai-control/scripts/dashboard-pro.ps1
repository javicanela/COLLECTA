git pull | Out-Null

Clear-Host
Write-Host "======================================="
Write-Host "      COLLECTA CONTROL CENTER PRO"
Write-Host "======================================="
Write-Host ""

$workers = Get-ChildItem ".ai-status" -Directory

foreach($w in $workers){

$file = "$($w.FullName)\heartbeat.json"

if(Test-Path $file){

$j = Get-Content $file -Raw | ConvertFrom-Json

Write-Host "Worker:       $($j.worker)"
Write-Host "Status:       $($j.status)"
Write-Host "Task:         $($j.task)"
Write-Host "Updated At:   $($j.updated_at)"
Write-Host "Last Result:  $($j.last_result)"
Write-Host "Notes:        $($j.notes)"
Write-Host "---------------------------------------"
}
}

Write-Host ""
Write-Host "Recent Completed Tasks:"
Get-ChildItem ".ai-tasks\done" -File |
Sort LastWriteTime -Descending |
Select -First 10 Name,LastWriteTime
