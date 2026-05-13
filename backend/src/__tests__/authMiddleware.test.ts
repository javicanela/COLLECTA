import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/authProvider', () => ({
  verifyProviderToken: vi.fn(),
}));

import { verifyProviderToken } from '../services/authProvider';
import { requireAuth, type AuthenticatedPrincipal } from '../middleware/auth';

const verifyProviderTokenMock = vi.mocked(verifyProviderToken);

function createProtectedApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ user: (req as unknown as { user: AuthenticatedPrincipal }).user });
  });
  return request(app);
}

describe('auth middleware principal contract', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test_api_key_12345678901234567890';
    process.env.JWT_SECRET = 'test_jwt_secret_123456789012345678901234567890';
    verifyProviderTokenMock.mockReset();
    verifyProviderTokenMock.mockResolvedValue(null);
  });

  it('maps API key authentication to the service principal shape', async () => {
    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: `Bearer ${process.env.API_KEY}` });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      userId: 'api-key',
      role: 'service',
      authSource: 'api_key',
    });
  });

  it('accepts a mocked provider token without requiring Supabase env vars', async () => {
    verifyProviderTokenMock.mockResolvedValue({
      userId: 'external-user-001',
      email: 'asesor@despacho.mx',
      role: 'asesor',
      authSource: 'supabase',
    });

    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: 'Bearer provider-token' });

    expect(res.status).toBe(200);
    expect(verifyProviderTokenMock).toHaveBeenCalledWith('provider-token');
    expect(res.body.user).toMatchObject({
      userId: 'external-user-001',
      email: 'asesor@despacho.mx',
      role: 'asesor',
      authSource: 'supabase',
    });
  });

  it('rejects invalid bearer tokens without echoing token details', async () => {
    const res = await createProtectedApp()
      .get('/protected')
      .set({ Authorization: 'Bearer wrong-key' });

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('wrong-key');
  });
});
