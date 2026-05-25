import type { Application } from 'express';

export type TrustProxySetting = boolean | number | string;

export interface TrustProxyConfigInput {
  isProduction: boolean;
  trustProxyEnv?: string;
  renderEnv?: string;
}

export function parseTrustProxySetting(value: string | undefined): TrustProxySetting | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const lower = normalized.toLowerCase();
  if (['true', 'yes', 'on'].includes(lower)) return true;
  if (['false', 'no', 'off', '0'].includes(lower)) return false;

  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;

  return normalized;
}

export function resolveTrustProxySetting(input: TrustProxyConfigInput): TrustProxySetting {
  const explicit = parseTrustProxySetting(input.trustProxyEnv);
  if (explicit !== undefined) return explicit;

  const renderEnabled = input.renderEnv?.trim().toLowerCase() === 'true';
  if (input.isProduction && renderEnabled) return 1;

  return false;
}

export function configureTrustProxy(app: Application, input: TrustProxyConfigInput): TrustProxySetting {
  const setting = resolveTrustProxySetting(input);
  app.set('trust proxy', setting);
  return setting;
}
