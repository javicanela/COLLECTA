# Checklist Implementacion Despacho Final

## Setup

- [ ] Ejecutar `.\scripts\collecta-setup.ps1`.
- [ ] Confirmar que `backend\.env.test` existe y no contiene secretos productivos.
- [ ] Confirmar `collecta-doctor` sin issues bloqueantes.
- [ ] Ejecutar `.\scripts\collecta-start.ps1 -Force`.
- [ ] Abrir `http://localhost:5173/`.

## PWA

- [ ] Confirmar que el navegador detecta Collecta como instalable.
- [ ] Instalar la app.
- [ ] Abrir Collecta desde el acceso instalado.
- [ ] Recargar online sin errores visuales.
- [ ] Simular offline y confirmar que el shell no queda roto.

## Smart Import

- [ ] Entrar a `Registros`.
- [ ] Cargar CSV de ejemplo.
- [ ] Cargar Excel multihoja de ejemplo.
- [ ] Llegar a preview canonico editable.
- [ ] Revisar challenge y mapeos de baja confianza.
- [ ] Ajustar al menos una columna.
- [ ] Simular offline y confirmar mensaje: `Listo para sincronizar cuando Collecta este conectado`.
- [ ] Confirmar que el boton de importacion queda pendiente/deshabilitado offline.
- [ ] Volver online y confirmar carga.

## Cobranza

- [ ] Ver operaciones creadas en cartera.
- [ ] Abrir detalle de una operacion vencida.
- [ ] Usar contacto WhatsApp manual cuando aplique.
- [ ] Marcar pago o avanzar estado segun flujo del despacho.
- [ ] Revisar que dashboard/cartera reflejen cambios.

## Exportacion

- [ ] Entrar a `Exportar`.
- [ ] Generar reporte esperado.
- [ ] Validar que el reporte contiene cartera actualizada.

## Verificacion tecnica

- [ ] `frontend npm test`.
- [ ] `frontend npm run build`.
- [ ] `backend npm test`.
- [ ] `backend npm run build`.
- [ ] `.\scripts\collecta-setup.ps1` en maquina limpia o entorno equivalente.
- [ ] `.\scripts\collecta-start.ps1` abre la app local y deja procesos vivos.

## No-go / fuera de alcance

- [ ] No se agrego DB local completa offline.
- [ ] No se agrego desktop nativo Tauri/Electron.
- [ ] No se modificaron secretos ni `.env` productivos.
- [ ] No se cambio `backend/prisma/schema.prisma`.
