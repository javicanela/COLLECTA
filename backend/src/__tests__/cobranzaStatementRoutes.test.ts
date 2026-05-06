import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '../middleware/auth';
import cobranzaRoutes, { cobranzaPublicRouter } from '../routes/cobranza';
import { sendStatementToClient } from '../services/statementDeliveryService';
import { storeTemporaryPdf } from '../services/tempFileStorage';

vi.mock('../services/statementDeliveryService', () => ({
  sendStatementToClient: vi.fn(async () => ({
    success: true,
    channel: 'WHATSAPP',
    clientId: 'client-1',
    mediaUrl: 'http://localhost:3001/api/cobranza/media/temp-token',
    messageId: 'wamid-statement-1',
  })),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cobranza', cobranzaPublicRouter);
  app.use('/api/cobranza', requireAuth, cobranzaRoutes);
  return request(app);
}

const authHeader = { Authorization: `Bearer ${process.env.API_KEY || 'test_api_key_12345678901234567890'}` };

beforeEach(() => {
  process.env.API_KEY = process.env.API_KEY || 'test_api_key_12345678901234567890';
  process.env.JWT_SECRET = '';
  vi.clearAllMocks();
});

describe('POST /api/cobranza/cliente/:rfc/send-statement', () => {
  it('requires auth', async () => {
    const res = await buildApp()
      .post('/api/cobranza/cliente/XAXX010101000/send-statement')
      .send({ channelPreference: 'AUTO' });

    expect(res.status).toBe(401);
    expect(sendStatementToClient).not.toHaveBeenCalled();
  });

  it('returns a stable delivery response', async () => {
    const res = await buildApp()
      .post('/api/cobranza/cliente/XAXX010101000/send-statement')
      .set(authHeader)
      .send({ channelPreference: 'AUTO' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      channel: 'WHATSAPP',
      clientId: 'client-1',
      mediaUrl: 'http://localhost:3001/api/cobranza/media/temp-token',
      messageId: 'wamid-statement-1',
    });
    expect(sendStatementToClient).toHaveBeenCalledWith({
      rfc: 'XAXX010101000',
      channelPreference: 'AUTO',
      requestedBy: 'api-key',
    });
  });

  it('maps missing clients to 404', async () => {
    vi.mocked(sendStatementToClient).mockRejectedValueOnce(
      Object.assign(new Error('Client not found'), { code: 'CLIENT_NOT_FOUND', statusCode: 404 }),
    );

    const res = await buildApp()
      .post('/api/cobranza/cliente/MISSING/send-statement')
      .set(authHeader)
      .send({ channelPreference: 'AUTO' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'client_not_found' });
  });

  it('maps suspended clients to 409', async () => {
    vi.mocked(sendStatementToClient).mockRejectedValueOnce(
      Object.assign(new Error('Client suspended'), { code: 'CLIENT_SUSPENDED', statusCode: 409 }),
    );

    const res = await buildApp()
      .post('/api/cobranza/cliente/XAXX010101000/send-statement')
      .set(authHeader)
      .send({ channelPreference: 'AUTO' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'client_suspended' });
  });
});

describe('POST /api/cobranza/operation/:operationId/send-statement', () => {
  it('sends a statement by operation id', async () => {
    const res = await buildApp()
      .post('/api/cobranza/operation/operation-1/send-statement')
      .set(authHeader)
      .send({ channelPreference: 'EMAIL' });

    expect(res.status).toBe(200);
    expect(sendStatementToClient).toHaveBeenCalledWith({
      operationId: 'operation-1',
      channelPreference: 'EMAIL',
      requestedBy: 'api-key',
    });
  });
});

describe('GET /api/cobranza/media/:token', () => {
  it('serves a temporary PDF before expiration', async () => {
    process.env.TEMP_PDF_TTL_MS = '60000';
    const stored = await storeTemporaryPdf({
      buffer: Buffer.from('%PDF-1.3 active pdf'),
      fileName: 'estado_cuenta_test.pdf',
      contentType: 'application/pdf',
    });
    const token = stored.url.split('/').pop()!;

    const res = await buildApp()
      .get(`/api/cobranza/media/${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.text || res.body.toString()).toContain('%PDF-1.3');
  });

  it('returns 410 for expired temporary PDF URLs', async () => {
    process.env.TEMP_PDF_TTL_MS = '-1';
    const stored = await storeTemporaryPdf({
      buffer: Buffer.from('%PDF-1.3 expired pdf'),
      fileName: 'estado_cuenta_expired.pdf',
      contentType: 'application/pdf',
    });
    const token = stored.url.split('/').pop()!;

    const res = await buildApp()
      .get(`/api/cobranza/media/${token}`);

    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: 'temporary_file_expired' });
  });
});
