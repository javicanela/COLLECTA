# Secrets and env safety

Collecta no debe guardar secretos reales en Git, docs, screenshots, logs ni
fixtures. Los runbooks pueden mostrar nombres de variables y placeholders, pero
no credenciales operativas.

## No commitear

- `.env`
- `.env.test`
- `.env.local`
- `.env.production`
- API keys de IA, Evolution API, n8n, Railway, Vercel, Neon, Supabase o Firebase.
- Tokens JWT, `API_KEY`, `JWT_SECRET`, passwords de admin o connection strings
  reales.
- Datos reales de clientes, comprobantes, estados de cuenta o archivos
  contables privados.

## Permitido

- Archivos `*.example` con placeholders.
- URLs locales como `http://localhost:3001/api`.
- Credenciales de test obvias como `collecta:collecta` en
  `docker-compose.test.yml`.
- Datos de prueba artificiales sin relacion con clientes reales.

## Politica de `.env`

Los ejemplos viven en:

- `backend\.env.example`
- `backend\.env.test.example`
- `frontend\.env.example`

Los archivos reales se crean localmente por el operador y no se suben. Si una
plataforma externa requiere variables, el operador debe iniciar sesion y cargar
los valores manualmente en el dashboard correspondiente.

## Datos externos

Antes de subir o procesar datos fuera de la maquina local:

1. Confirmar que el archivo no contiene informacion real de clientes sin permiso.
2. Confirmar que el proveedor externo y la cuenta son los esperados.
3. Confirmar que el usuario autorizo la transmision.

Smart Import debe funcionar primero con analisis local/deterministico y solo
escalar a proveedores externos si hay configuracion y autorizacion.

## Rotacion si ocurre exposicion

Si un secreto real entra al repo o a un log compartido:

1. Detener el uso del secreto.
2. Revocarlo en el proveedor.
3. Crear uno nuevo.
4. Revisar historial Git y artefactos publicados.
5. Documentar el incidente sin repetir el valor secreto.
