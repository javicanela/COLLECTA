git pull | Out-Null

Write-Host ""
Write-Host "=== INBOX ==="
Get-ChildItem ".ai-tasks\inbox" -File |
Where-Object { $_.Name -ne ".gitkeep" } |
Sort-Object LastWriteTime -Descending |
Select-Object Name, LastWriteTime

Write-Host ""
Write-Host "=== WORKING ==="
Get-ChildItem ".ai-tasks\working" -File |
Where-Object { $_.Name -ne ".gitkeep" } |
Sort-Object LastWriteTime -Descending |
Select-Object Name, LastWriteTime

Write-Host ""
Write-Host "=== DONE ==="
Get-ChildItem ".ai-tasks\done" -File |
Where-Object { $_.Name -ne ".gitkeep" } |
Sort-Object LastWriteTime -Descending |
Select-Object -First 10 Name, LastWriteTime
