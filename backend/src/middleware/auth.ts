import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { verifyProviderToken } from '../services/authProvider';
import {
  AuthenticatedPrincipal,
  normalizePrincipalRole,
} from '../services/authTypes';

export type { AuthenticatedPrincipal } from '../services/authTypes';

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function localPrincipalFromJwt(decoded: { userId?: string; email?: string; role?: string }): AuthenticatedPrincipal | null {
  if (!decoded.userId) return null;

  return {
    userId: decoded.userId,
    email: decoded.email,
    role: normalizePrincipalRole(decoded.role, 'viewer'),
    authSource: 'local',
  };
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

  if (JWT_SECRET && JWT_SECRET.length >= 32) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email?: string;
        role?: string;
      };
      const principal = localPrincipalFromJwt(decoded);
      if (principal) {
        (req as any).user = principal;
        next();
        return;
      }
    } catch {
      // Continue with service/provider auth checks.
    }
  }

  if (API_KEY && timingSafeEqual(token, API_KEY)) {
    (req as any).user = {
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
    (req as any).user = providerPrincipal;
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
  const confirmHeader = req.headers['x-admin-confirm'];
  if (confirmHeader !== 'yes-delete-all') {
    res.status(403).json({ error: 'Se requiere X-Admin-Confirm: yes-delete-all para esta operación' });
    return;
  }
  next();
}
