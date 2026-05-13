export type PrincipalRole = 'admin' | 'asesor' | 'viewer' | 'service';
export type AuthSource = 'local' | 'api_key' | 'supabase' | 'test';

export interface AuthenticatedPrincipal {
  userId: string;
  email?: string;
  role: PrincipalRole;
  authSource: AuthSource;
}

const principalRoles: PrincipalRole[] = ['admin', 'asesor', 'viewer', 'service'];

export function normalizePrincipalRole(value: unknown, fallback: PrincipalRole): PrincipalRole {
  if (typeof value !== 'string') return fallback;
  return principalRoles.includes(value as PrincipalRole) ? (value as PrincipalRole) : fallback;
}
