git pull | Out-Null

Write-Host ""
Write-Host "=== INBOX ==="
Get-ChildItem ".ai-tasks\inbox" -File | Sort-Object LastWriteTime -Descending | Select-Object Name, LastWriteTime

Write-Host ""
Write-Host "=== WORKING ==="
Get-ChildItem ".ai-tasks\working" -File | Sort-Object LastWriteTime -Descending | Select-Object Name, LastWriteTime

Write-Host ""
Write-Host "=== DONE ==="
Get-ChildItem ".ai-tasks\done" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 10 Name, LastWriteTime
