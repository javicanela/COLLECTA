import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { verifyProviderToken } from '../services/authProvider';
import { isRevoked } from '../services/tokenRevocation';
import {
  AuthenticatedPrincipal,
  normalizePrincipalRole,
} from '../services/authTypes';

export type { AuthenticatedPrincipal } from '../services/authTypes';

const MIN_JWT_SECRET_LENGTH = 32;

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function localPrincipalFromJwt(decoded: {
  userId?: string;
  email?: string;
  role?: string;
  organizationId?: string;
}): AuthenticatedPrincipal | null {
  if (!decoded.userId) return null;

  return {
    userId: decoded.userId,
    email: decoded.email,
    role: normalizePrincipalRole(decoded.role, 'viewer'),
    authSource: 'local',
    organizationId: decoded.organizationId,
  };
}

interface DecodedLocalJwt {
  userId?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  jti?: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const API_KEY = process.env.API_KEY;
  const JWT_SECRET = process.env.JWT_SECRET;
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header requerido' });
    return;
  }

  const token = authHeader.slice(7);

  if (JWT_SECRET) {
    if (JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
      // Bug 9: fail loud instead of silently falling back to API_KEY.
      // Never echo the secret value back in the response.
      res.status(500).json({
        error: `JWT_SECRET configurado pero invalido (min ${MIN_JWT_SECRET_LENGTH} chars)`,
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedLocalJwt;

      // Bug 10: respect token revocation blocklist for issued JWTs.
      if (decoded.jti && isRevoked(decoded.jti)) {
        res.status(401).json({ error: 'Token revocado' });
        return;
      }

      const principal = localPrincipalFromJwt(decoded);
      if (principal) {
        req.user = principal;
        next();
        return;
      }
    } catch {
      // Continue with service/provider auth checks.
    }
  }

  if (API_KEY && timingSafeEqual(token, API_KEY)) {
    req.user = {
      userId: 'api-key',
      email: 'automation@collecta.local',
      role: 'service',
      authSource: 'api_key',
    } satisfies AuthenticatedPrincipal;
    next();
    return;
  }

  const providerPrincipal = await verifyProviderToken(token);
  if (providerPrincipal) {
    req.user = providerPrincipal;
    next();
    return;
  }

  if (!API_KEY) {
    res.status(401).json({ error: 'API_KEY no configurada - acceso bloqueado' });
    return;
  }

  res.status(401).json({ error: 'Token inválido' });
}

export function requireAdminConfirm(req: Request, res: Response, next: NextFunction) {
  // Bug 11: gate role first so a non-admin principal with the right header
  // cannot perform destructive operations.
  const principal = req.user;
  if (!principal || principal.role !== 'admin') {
    res.status(403).json({ error: 'Se requiere rol admin para esta operación' });
    return;
  }

  const confirmHeader = req.headers['x-admin-confirm'];
  if (confirmHeader !== 'yes-delete-all') {
    res.status(403).json({ error: 'Se requiere X-Admin-Confirm: yes-delete-all para esta operación' });
    return;
  }
  next();
}
