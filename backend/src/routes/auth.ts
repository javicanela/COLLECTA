import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getAuthProviderStatus, verifyProviderToken } from '../services/authProvider';
import { AuthenticatedPrincipal, normalizePrincipalRole } from '../services/authTypes';
import { revokeJti } from '../services/tokenRevocation';
import { createRateLimiter } from '../middleware/rateLimit';
import { z } from 'zod';

const router = Router();

const TOKEN_EXPIRY = '24h';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_KEYLEN = 64;
const PASSWORD_SALT_BYTES = 16;

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 5),
  message: 'Demasiados intentos de login. Reintenta en 15 minutos.',
});

const verifyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Demasiadas verificaciones de token. Reintenta en 1 minuto.',
});

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

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `org-${crypto.randomUUID().slice(0, 8)}`;
}

function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, PASSWORD_KEYLEN, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, salt, hash] = storedHash.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, PASSWORD_KEYLEN, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      const expected = Buffer.from(hash, 'hex');
      if (expected.length !== derivedKey.length) {
        resolve(false);
        return;
      }
      resolve(crypto.timingSafeEqual(expected, derivedKey));
    });
  });
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

function publicUser(principal: AuthenticatedPrincipal, organizationName?: string) {
  return {
    id: principal.userId,
    name: principal.role === 'admin' ? 'Administrador' : principal.email || 'Usuario Collecta',
    email: principal.email,
    role: principal.role,
    authSource: principal.authSource,
    organizationId: principal.organizationId,
    organizationName,
  };
}

function signPrincipal(principal: AuthenticatedPrincipal): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { ...principal, jti },
    jwtSecret() as string,
    { expiresIn: TOKEN_EXPIRY },
  );
}

const signupSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(12).max(256),
});

router.get('/providers', (_req: Request, res: Response) => {
  res.json({ providers: getAuthProviderStatus() });
});

router.post('/signup', loginRateLimiter, async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  if (!isValidSecret()) {
    res.status(500).json({ error: 'JWT_SECRET no configurado o es demasiado corto (minimo 32 caracteres)' });
    return;
  }

  const { organizationName, name, email, password } = parsed.data;
  const slug = `${slugify(organizationName)}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const passwordHash = await hashPassword(password);
    const organization = await prisma.organization.create({
      data: { nombre: organizationName, slug },
    });
    const user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        name,
        email,
        role: 'admin',
        passwordHash,
      },
    });
    const principal: AuthenticatedPrincipal = {
      userId: user.id,
      email: user.email || email,
      role: 'admin',
      authSource: 'local',
      organizationId: organization.id,
    };

    res.status(201).json({
      token: signPrincipal(principal),
      user: {
        ...publicUser(principal, organization.nombre),
        name: user.name,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Email u organizacion ya registrados' });
      return;
    }
    res.status(500).json({ error: 'Error creando cuenta' });
  }
});

router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y password son requeridos' });
    return;
  }

  if (!isValidSecret()) {
    res.status(500).json({ error: 'JWT_SECRET no configurado o es demasiado corto (minimo 32 caracteres)' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const configuredAdmin = adminUser();
  const isConfiguredAdminEmail = !!configuredAdmin && (
    normalizedEmail === configuredAdmin.toLowerCase() ||
    normalizedEmail === `${configuredAdmin}@collecta.local`.toLowerCase()
  );
  let dbLoginFailed = false;

  try {
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    if (user?.passwordHash && await verifyPassword(password, user.passwordHash)) {
      const principal: AuthenticatedPrincipal = {
        userId: user.id,
        email: user.email || normalizedEmail,
        role: normalizePrincipalRole(user.role, 'viewer'),
        authSource: 'local',
        organizationId: user.organizationId,
      };

      res.json({
        token: signPrincipal(principal),
        user: {
          ...publicUser(principal, user.organization?.nombre),
          name: user.name,
        },
      });
      return;
    }
  } catch {
    dbLoginFailed = true;
  }

  if (isValidAdminCredentials(normalizedEmail, password)) {
    const principal: AuthenticatedPrincipal = {
      userId: 'admin-001',
      email: adminUser(),
      role: 'admin',
      authSource: 'local',
    };

    res.json({
      token: signPrincipal(principal),
      user: publicUser(principal),
    });
    return;
  }

  if (dbLoginFailed && !isConfiguredAdminEmail) {
    res.status(500).json({ error: 'Error validando credenciales' });
    return;
  }

  res.status(401).json({ error: 'Credenciales invalidas' });
});
router.post('/verify', verifyRateLimiter, async (req: Request, res: Response) => {
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
      organizationId?: string;
    };

    const principal: AuthenticatedPrincipal = {
      userId: decoded.userId,
      email: decoded.email,
      role: normalizePrincipalRole(decoded.role, 'viewer'),
      authSource: 'local',
      organizationId: decoded.organizationId,
    };

    res.json({
      valid: true,
      user: publicUser(principal),
    });
  } catch {
    const providerPrincipal = await verifyProviderToken(token);
    if (providerPrincipal) {
      if (!providerPrincipal.organizationId) {
        res.status(401).json({ error: 'Provider token missing organization scope' });
        return;
      }
      res.json({
        valid: true,
        user: publicUser(providerPrincipal),
      });
      return;
    }

    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(400).json({ error: 'Token requerido' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = jwtSecret();

  // Logout is best-effort: we never reveal whether the secret/token is valid,
  // we just blocklist the jti if we can extract one. If the secret is missing
  // we still respond 200 so the client can clear local state.
  if (secret && secret.length >= 32) {
    try {
      const decoded = jwt.verify(token, secret) as { jti?: string };
      if (decoded.jti) {
        revokeJti(decoded.jti, TOKEN_TTL_MS);
      }
    } catch {
      // Token already expired or invalid - nothing to revoke.
    }
  }

  res.json({ revoked: true });
});

export default router;
