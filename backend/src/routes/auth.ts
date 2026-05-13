import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { getAuthProviderStatus, verifyProviderToken } from '../services/authProvider';
import { AuthenticatedPrincipal, normalizePrincipalRole } from '../services/authTypes';

const router = Router();

const TOKEN_EXPIRY = '24h';

function jwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
}

function adminUser(): string | undefined {
  return process.env.ADMIN_USER;
}

function adminPass(): string | undefined {
  return process.env.ADMIN_PASS;
}

function isValidSecret(): boolean {
  const secret = jwtSecret();
  return !!(secret && secret.length >= 32);
}

function isValidAdminCredentials(email: string, password: string): boolean {
  const configuredUser = adminUser();
  const configuredPass = adminPass();
  if (!configuredUser || !configuredPass) {
    return false;
  }
  const normalizedEmail = email.toLowerCase();
  const emailMatch =
    normalizedEmail === configuredUser.toLowerCase() ||
    normalizedEmail === `${configuredUser}@collecta.local`.toLowerCase();
  return emailMatch && password === configuredPass;
}

function publicUser(principal: AuthenticatedPrincipal) {
  return {
    id: principal.userId,
    name: principal.role === 'admin' ? 'Administrador' : principal.email || 'Usuario Collecta',
    email: principal.email,
    role: principal.role,
    authSource: principal.authSource,
  };
}

router.get('/providers', (_req: Request, res: Response) => {
  res.json({ providers: getAuthProviderStatus() });
});

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

  const principal: AuthenticatedPrincipal = {
    userId: 'admin-001',
    email: adminUser(),
    role: 'admin',
    authSource: 'local',
  };

  try {
    const token = jwt.sign(principal, jwtSecret() as string, { expiresIn: TOKEN_EXPIRY });

    res.json({
      token,
      user: publicUser(principal),
    });
  } catch {
    res.status(500).json({ error: 'Error generando token' });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
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
    const decoded = jwt.verify(token, jwtSecret() as string) as {
      userId: string;
      email?: string;
      role?: string;
      authSource?: string;
    };

    const principal: AuthenticatedPrincipal = {
      userId: decoded.userId,
      email: decoded.email,
      role: normalizePrincipalRole(decoded.role, 'viewer'),
      authSource: decoded.authSource === 'local' ? 'local' : 'local',
    };

    res.json({
      valid: true,
      user: publicUser(principal),
    });
  } catch {
    const providerPrincipal = await verifyProviderToken(token);
    if (providerPrincipal) {
      res.json({
        valid: true,
        user: publicUser(providerPrincipal),
      });
      return;
    }

    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;
