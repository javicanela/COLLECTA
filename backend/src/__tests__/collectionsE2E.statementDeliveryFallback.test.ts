import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupE2EData, seedE2ECollectionsFixture } from './fixtures/e2eCollectionsFixture';
import { prisma, req, TEST_AUTH } from './test-app';

vi.mock('../services/evolutionApi', () => ({
  isConfigured: () => false,
  normalizePhone: (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('52') ? digits : `52${digits}`;
  },
  sendMediaMessage: vi.fn(async () => ({ success: false, error: 'evolution_not_configured' })),
}));

describe('Collections E2E: statement delivery fallback', () => {
  beforeEach(async () => {
    await cleanupE2EData(prisma);
  });

  afterEach(async () => {
    await cleanupE2EData(prisma);
  });

  it('generates a manual fallback when outbound statement integrations are unavailable', async () => {
    const original = {
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
      EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE,
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      EMAIL_FROM: process.env.EMAIL_FROM,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
    };

    for (const key of Object.keys(original) as Array<keyof typeof original>) {
      delete process.env[key];
    }

    try {
      const fixture = await seedE2ECollectionsFixture(prisma);

      const res = await req
        .post(`/api/cobranza/cliente/${fixture.clients.primary.rfc}/send-statement`)
        .set(TEST_AUTH.headers)
        .send({ channelPreference: 'AUTO' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: false,
        channel: 'MANUAL_FALLBACK',
        clientId: fixture.clients.primary.id,
        error: 'automatic_channels_unavailable',
      });
      expect(res.body.mediaUrl).toContain('/api/cobranza/media/');
      expect(res.body.fallbackWaUrl).toContain('https://wa.me/');

      const fallbackLog = await prisma.logEntry.findFirst({
        where: {
          clientId: fixture.clients.primary.id,
          tipo: 'STATEMENT_DELIVERY',
          variante: 'MANUAL_FALLBACK',
        },
      });
      expect(fallbackLog).toMatchObject({
        resultado: 'FALLBACK',
      });
    } finally {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
