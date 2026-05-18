import type { Request } from 'express';

export const DEFAULT_ORGANIZATION_ID = 'default';

export function requireOrg(req: Request): string {
  return req.user?.organizationId || DEFAULT_ORGANIZATION_ID;
}

export function organizationScopedRfc(organizationId: string, rfc: string) {
  return {
    organizationId_rfc: {
      organizationId,
      rfc: rfc.toUpperCase(),
    },
  };
}

export function organizationScopedConfigKey(organizationId: string, key: string) {
  return {
    organizationId_key: {
      organizationId,
      key,
    },
  };
}
