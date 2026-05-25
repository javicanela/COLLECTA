import * as jwt from 'jsonwebtoken';
import { AuthenticatedPrincipal, normalizePrincipalRole } from './authTypes';

export interface AuthProviderStatus {
  id: 'supabase';
  name: string;
  configured: boolean;
  available: boolean;
  reason: string;
  requiredEnv: string[];
}

interface SupabaseJwtPayload extends jwt.JwtPayload {
  email?: string;
  role?: string;
  app_metadata?: {
    role?: string;
    collecta_role?: string;
    organizationId?: string;
    organization_id?: string;
    collecta_organization_id?: string;
  };
}

function envValue(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getAuthProviderStatus(): AuthProviderStatus[] {
  const hasUrl = !!envValue('SUPABASE_URL');
  const hasJwtVerification = !!envValue('SUPABASE_JWT_SECRET') || !!envValue('SUPABASE_JWKS_URL');
  const configured = hasUrl && hasJwtVerification;

  return [
    {
      id: 'supabase',
      name: 'Supabase Auth',
      configured,
      available: configured,
      reason: configured
        ? 'Supabase Auth esta listo para verificar tokens de proveedor.'
        : 'Configura SUPABASE_URL y SUPABASE_JWT_SECRET o SUPABASE_JWKS_URL para habilitar el proveedor.',
      requiredEnv: ['SUPABASE_URL', 'SUPABASE_JWT_SECRET o SUPABASE_JWKS_URL'],
    },
  ];
}

function providerRoleFromPayload(payload: SupabaseJwtPayload) {
  const rawRole =
    payload.app_metadata?.collecta_role ||
    payload.app_metadata?.role ||
    payload.role;

  const role = normalizePrincipalRole(rawRole, 'asesor');
  return role === 'admin' || role === 'service' ? 'asesor' : role;
}

function organizationIdFromPayload(payload: SupabaseJwtPayload): string | undefined {
  const raw =
    payload.app_metadata?.collecta_organization_id ||
    payload.app_metadata?.organizationId ||
    payload.app_metadata?.organization_id;
  const organizationId = raw?.trim();
  if (!organizationId) return undefined;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(organizationId)) return undefined;
  return organizationId;
}

export async function verifyProviderToken(token: string): Promise<AuthenticatedPrincipal | null> {
  const secret = envValue('SUPABASE_JWT_SECRET');
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as SupabaseJwtPayload;
    if (!decoded.sub) return null;
    const organizationId = organizationIdFromPayload(decoded);
    if (!organizationId) return null;

    return {
      userId: decoded.sub,
      email: decoded.email,
      role: providerRoleFromPayload(decoded),
      authSource: 'supabase',
      organizationId,
    };
  } catch {
    return null;
  }
}
