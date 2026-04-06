import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
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
        email: string;
        role: string;
      };
      (req as any).user = decoded;
      next();
      return;
    } catch {
      // JWT verification failed — fall through to API_KEY check
    }
  }

  if (!API_KEY) {
    res.status(401).json({ error: 'API_KEY no configurada - acceso bloqueado' });
    return;
  }

  if (!timingSafeEqual(token, API_KEY)) {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }

  (req as any).user = { userId: 'api-key', email: 'automation@collecta.local', role: 'automation' };
  next();
}

export function requireAdminConfirm(req: Request, res: Response, next: NextFunction) {
  const confirmHeader = req.headers['x-admin-confirm'];
  if (confirmHeader !== 'yes-delete-all') {
    res.status(403).json({ error: 'Se requiere X-Admin-Confirm: yes-delete-all para esta operación' });
    return;
  }
  next();
}
