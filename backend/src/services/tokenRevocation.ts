/**
 * In-memory JWT revocation blocklist.
 *
 * Limitations:
 * - Single process only. In multi-replica deployments each instance keeps its
 *   own set; a revoked token can still be used against another replica until
 *   it expires naturally.
 * - For production multi-instance setups this must be replaced by a shared
 *   store (Redis SET, Postgres table, etc.). Not implemented in this round.
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const revoked = new Set<string>();
const expiry = new Map<string, number>();

export function revokeJti(jti: string, ttlMs: number = DEFAULT_TTL_MS): void {
  if (!jti) return;
  revoked.add(jti);
  expiry.set(jti, Date.now() + ttlMs);
}

export function isRevoked(jti: string | undefined | null): boolean {
  if (!jti) return false;
  const exp = expiry.get(jti);
  if (exp !== undefined && exp < Date.now()) {
    revoked.delete(jti);
    expiry.delete(jti);
    return false;
  }
  return revoked.has(jti);
}

export function clearAllRevocations(): void {
  revoked.clear();
  expiry.clear();
}

export function revokedCount(): number {
  return revoked.size;
}
