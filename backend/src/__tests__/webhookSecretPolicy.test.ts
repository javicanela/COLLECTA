import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function buildWebhookApp() {
  vi.resetModules();
  const { default: webhookRoutes } = await import('../routes/webhooks');
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', webhookRoutes);
  return request(app);
}

describe('Evolution webhook secret policy', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
  const originalOrganizationId = process.env.EVOLUTION_WEBHOOK_ORGANIZATION_ID;

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

  it('fails closed in production when EVOLUTION_WEBHOOK_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EVOLUTION_WEBHOOK_SECRET;

    const res = await (await buildWebhookApp())
      .post('/api/webhooks/evolution')
      .send({ event: 'connection.update' });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Webhook secret no configurado' });
  });

  it('keeps local and test webhooks open when EVOLUTION_WEBHOOK_SECRET is missing', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.EVOLUTION_WEBHOOK_SECRET;

    const res = await (await buildWebhookApp())
      .post('/api/webhooks/evolution')
      .send({ event: 'connection.update' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true, processed: false });
  });

  it('fails closed in production when no webhook organization mapping is configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EVOLUTION_WEBHOOK_SECRET = 'test_webhook_secret_123';
    delete process.env.EVOLUTION_WEBHOOK_ORGANIZATION_ID;

    const res = await (await buildWebhookApp())
      .post('/api/webhooks/evolution')
      .set('X-Webhook-Secret', 'test_webhook_secret_123')
      .send({ event: 'connection.update' });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Webhook organization no configurado' });
  });
});
