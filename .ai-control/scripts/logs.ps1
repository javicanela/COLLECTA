git pull | Out-Null

Write-Host ""
Write-Host "Últimos logs/reportes PC2:"
Get-ChildItem ".ai-logs\pc2" -File |
Where-Object { $_.Name -ne ".gitkeep" } |
Sort-Object LastWriteTime -Descending |
Select-Object -First 10 Name, LastWriteTime

Write-Host ""
Write-Host "Para leer uno:"
Write-Host 'Get-Content .ai-logs\pc2\<nombre-del-archivo>'
