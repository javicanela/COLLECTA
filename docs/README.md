# Collecta docs

Indice operativo de documentacion vigente.

## Base

- [Plan definitivo](PLAN_DEFINITIVO_COLLECTA.md): direccion principal del
  producto.
- [Runbooks](runbooks/README.md): instalacion, pruebas, QA browser, seguridad de
  secretos, plataformas gratis y handoff.
- [n8n](../n8n/README.md): workflows, autenticacion y smoke tests.

## Runbooks principales

- [Environment setup](runbooks/ENVIRONMENT_SETUP.md)
- [QA browser script](runbooks/QA_BROWSER_SCRIPT.md)
- [Secrets and env safety](runbooks/SECRETS_AND_ENV_SAFETY.md)
- [Free platform options](runbooks/FREE_PLATFORM_OPTIONS.md)
- [Operator handoff](runbooks/OPERATOR_HANDOFF.md)

## Reportes

- [Plan 08 handoff](reports/AGENT_HANDOFF_PLAN_08_INSTALLATION_OPERATIONS_READINESS.md)
- [Plan 08 QA results](reports/INSTALLATION_OPERATIONS_QA_RESULTS.md)

Los reportes historicos en `docs/reports/` son referencia de fase. Antes de
cambiar comportamiento productivo, validar contra `AGENTS.md`, specs vigentes y
el codigo actual.
