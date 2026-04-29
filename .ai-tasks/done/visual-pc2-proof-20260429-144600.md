Objetivo:
Crear una prueba visual clara de que PC2 recibió esta tarea, la ejecutó con OpenCode y devolvió resultados a PC1.

Reglas:
- No modifiques código de producción.
- No borres archivos.
- No modifiques .env ni secretos.
- Usa comandos compatibles con PowerShell.

Tarea:
1. Crea el archivo .ai-logs/pc2/VISUAL-PC2-WORKED.md
2. El archivo debe comenzar exactamente con:
# ? PC2 TRABAJÓ CORRECTAMENTE
3. Incluye:
   - Fecha y hora aproximada
   - Nombre del worker: PC2
   - Repo analizado: COLLECTA
   - Un resumen breve de lo que hiciste
   - Una lista de 5 archivos/carpetas importantes detectados en el repo
4. Crea también el archivo .ai-status/pc2/last-visual-proof.json con este contenido aproximado:
{
  "worker": "pc2",
  "status": "completed_visual_test",
  "proof_file": ".ai-logs/pc2/VISUAL-PC2-WORKED.md",
  "task": "visual-pc2-proof"
}

Criterio de éxito:
- Existe .ai-logs/pc2/VISUAL-PC2-WORKED.md
- Existe .ai-status/pc2/last-visual-proof.json
- La tarea se mueve a .ai-tasks/done
- PC2 hace commit y push
