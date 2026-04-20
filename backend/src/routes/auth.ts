import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const TOKEN_EXPIRY = '24h';

console.log('[AUTH] JWT_SECRET:', JWT_SECRET ? 'SET' : 'UNSET');
console.log('[AUTH] ADMIN_USER:', ADMIN_USER);
console.log('[AUTH] ADMIN_PASS:', ADMIN_PASS);

function isValidSecret(): boolean {
  return !!(JWT_SECRET && JWT_SECRET.length >= 32);
}

function isValidAdminCredentials(email: string, password: string): boolean {
  if (!ADMIN_USER || !ADMIN_PASS) {
    return false;
  }
  const emailMatch = email.toLowerCase() === ADMIN_USER.toLowerCase() ||
                     email.toLowerCase() === `${ADMIN_USER}@collecta.local`.toLowerCase();
  return emailMatch && password === ADMIN_PASS;
}

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' });
    return;
  }

  if (!isValidAdminCredentials(email, password)) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  if (!isValidSecret()) {
    res.status(500).json({ error: 'JWT_SECRET no configurado o es demasiado corto (mínimo 32 caracteres)' });
    return;
  }

  const payload = {
    userId: 'admin-001',
    email: ADMIN_USER,
    role: 'admin',
  };

  try {
    console.log('[LOGIN] Attempting to sign JWT with payload:', payload);
    const token = jwt.sign(payload, JWT_SECRET as string, { expiresIn: TOKEN_EXPIRY });
    console.log('[LOGIN] JWT signed successfully');

    res.json({
      token,
      user: {
        id: payload.userId,
        name: 'Administrador',
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (err) {
    console.log('[LOGIN] Error generating token:', err);
    res.status(500).json({ error: 'Error generando token' });
  }
});

router.post('/verify', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const token = authHeader.slice(7);

  if (!isValidSecret()) {
    res.status(500).json({ error: 'JWT_SECRET no configurado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as {
      userId: string;
      email: string;
      role: string;
    };

    res.json({
      valid: true,
      user: {
        id: decoded.userId,
        name: 'Administrador',
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;
