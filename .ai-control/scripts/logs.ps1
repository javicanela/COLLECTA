git pull | Out-Null

Write-Host ""
Write-Host "Últimos logs/reportes PC2:"
$files = Get-ChildItem ".ai-logs\pc2" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 10

$files | Select-Object Name, LastWriteTime

Write-Host ""
Write-Host "Para leer uno:"
Write-Host 'Get-Content .ai-logs\pc2\<nombre-del-archivo>'
