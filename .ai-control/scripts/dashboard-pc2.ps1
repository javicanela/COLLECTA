git pull | Out-Null

$statusPath = ".ai-status\pc2\status.json"

Write-Host ""
Write-Host "===================================="
Write-Host "      COLLECTA AI CONTROL CENTER"
Write-Host "===================================="
Write-Host ""

if (Test-Path $statusPath) {
    $status = Get-Content $statusPath -Raw | ConvertFrom-Json

    Write-Host "Worker:       " $status.worker
    Write-Host "Status:       " $status.status
    Write-Host "Current Task: " $status.current_task
    Write-Host "Last Task:    " $status.last_task
    Write-Host "Last Result:  " $status.last_result
    Write-Host "Updated At:   " $status.updated_at
    Write-Host "Notes:        " $status.notes
} else {
    Write-Host "No existe status.json de PC2 todavía."
}

Write-Host ""
Write-Host "Últimos reportes PC2:"
Get-ChildItem ".ai-logs\pc2" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, LastWriteTime

Write-Host ""
Write-Host "Últimas tareas completadas:"
Get-ChildItem ".ai-tasks\done" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, LastWriteTime

Write-Host ""
Write-Host "===================================="
