import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Force a deterministic DB failure so we can exercise the webhook error path
// without depending on a real database connection.
const findFirstMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    whatsAppMessage: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      create: vi.fn(),
      update: vi.fn(),
    },
    logEntry: { create: vi.fn() },
    client: { findFirst: vi.fn() },
  },
}));

const WEBHOOK_SECRET = 'super_secret_webhook_value_123456';

async function buildWebhookApp() {
  vi.resetModules();
  const { default: webhookRoutes } = await import('../routes/webhooks');
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', webhookRoutes);
  return request(app);
}

describe('Evolution webhook security hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
  const originalOrganizationId = process.env.EVOLUTION_WEBHOOK_ORGANIZATION_ID;

  beforeEach(() => {
    findFirstMock.mockReset();
    process.env.EVOLUTION_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.EVOLUTION_WEBHOOK_ORGANIZATION_ID = 'org-webhook-test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) {
      delete process.env.EVOLUTION_WEBHOOK_SECRET;
    } else {
      process.env.EVOLUTION_WEBHOOK_SECRET = originalSecret;
    }
    if (originalOrganizationId === undefined) {
      delete process.env.EVOLUTION_WEBHOOK_ORGANIZATION_ID;
    } else {
      process.env.EVOLUTION_WEBHOOK_ORGANIZATION_ID = originalOrganizationId;
    }
    vi.resetModules();
  });

  describe('constant-time secret verification', () => {
    it('rejects a request without the secret header (403)', async () => {
      process.env.NODE_ENV = 'production';

      const res = await (await buildWebhookApp())
        .post('/api/webhooks/evolution')
        .send({ event: 'connection.update' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Invalid webhook secret' });
    });

    it('rejects a wrong secret of equal length (403)', async () => {
      process.env.NODE_ENV = 'production';

      const wrongSameLength = 'x'.repeat(WEBHOOK_SECRET.length);
      const res = await (await buildWebhookApp())
        .post('/api/webhooks/evolution')
        .set('X-Webhook-Secret', wrongSameLength)
        .send({ event: 'connection.update' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Invalid webhook secret' });
    });

    it('rejects a secret of different length without throwing (403)', async () => {
      process.env.NODE_ENV = 'production';

      const res = await (await buildWebhookApp())
        .post('/api/webhooks/evolution')
        .set('X-Webhook-Secret', 'short')
        .send({ event: 'connection.update' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Invalid webhook secret' });
    });

    it('accepts the exact secret and processes the request', async () => {
      process.env.NODE_ENV = 'production';

      const res = await (await buildWebhookApp())
        .post('/api/webhooks/evolution')
        .set('X-Webhook-Secret', WEBHOOK_SECRET)
        .send({ event: 'connection.update' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ received: true, processed: false });
    });
  });

  describe('error detail disclosure policy', () => {
    const leakyError = new Error('postgres://user:secret@db.internal:5432 connection refused');

    function messageUpsertPayload() {
      return {
        event: 'messages.upsert',
        data: {
          key: { id: 'evt-123', remoteJid: '5215555555555@s.whatsapp.net', fromMe: false },
          message: { conversation: 'hola' },
        },
      };
    }

    it('hides internal error details in production', async () => {
      process.env.NODE_ENV = 'production';
      findFirstMock.mockRejectedValue(leakyError);

      const res = await (await buildWebhookApp())
        .post('/api/webhooks/evolution')
        .set('X-Webhook-Secret', WEBHOOK_SECRET)
        .send(messageUpsertPayload());

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Error processing webhook' });
      expect(res.body.details).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('secret@db.internal');
    });

    it('exposes details outside production to aid local debugging', async () => {
      process.env.NODE_ENV = 'development';
      findFirstMock.mockRejectedValue(leakyError);

      const res = await (await buildWebhookApp())
        .post('/api/webhooks/evolution')
        .set('X-Webhook-Secret', WEBHOOK_SECRET)
        .send(messageUpsertPayload());

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error processing webhook');
      expect(res.body.details).toContain('connection refused');
    });
  });
});
