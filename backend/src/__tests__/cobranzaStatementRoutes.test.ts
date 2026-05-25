import express from 'express';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '../middleware/auth';
import cobranzaRoutes, { cobranzaPublicRouter } from '../routes/cobranza';
import { sendStatementToClient } from '../services/statementDeliveryService';
import { storeTemporaryPdf } from '../services/tempFileStorage';
import { generateEstadoCuenta } from '../services/pdfGenerator';

type PdfDocLike = {
  text: (content: string) => unknown;
};

vi.mock('../services/statementDeliveryService', () => ({
  sendStatementToClient: vi.fn(async () => ({
    success: true,
    channel: 'WHATSAPP',
    clientId: 'client-1',
    mediaUrl: 'http://localhost:3001/api/cobranza/media/temp-token',
    messageId: 'wamid-statement-1',
  })),
}));

vi.mock('../services/pdfGenerator', () => ({
  generateEstadoCuenta: vi.fn(async () => ({
    cliente: { nombre: 'Cliente Prueba', rfc: 'XAXX010101000' },
    pendientes: [],
    pagados: [],
    totalPendiente: 0,
    totalPagado: 0,
    config: {},
  })),
  renderEstadoCuentaPdf: vi.fn((doc: PdfDocLike) => {
    doc.text('Estado de cuenta de prueba');
  }),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cobranza', cobranzaPublicRouter);
  app.use('/api/cobranza', requireAuth, cobranzaRoutes);
  return request(app);
}

const authHeader = { Authorization: `Bearer ${process.env.API_KEY || 'test_api_key_12345678901234567890'}` };
const jwtSecret = 'test_jwt_secret_123456789012345678901234567890';

function authHeaderForOrg(organizationId: string) {
  process.env.JWT_SECRET = jwtSecret;
  const token = jwt.sign({
    userId: 'user-org',
    email: 'admin@collecta.test',
    role: 'admin',
    organizationId,
  }, jwtSecret);
  return { Authorization: `Bearer ${token}` };
}

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
      organizationId: 'default',
      rfc: 'XAXX010101000',
      channelPreference: 'AUTO',
      requestedBy: 'api-key',
    });
  });

  it('passes the authenticated organization scope to statement delivery', async () => {
    const res = await buildApp()
      .post('/api/cobranza/cliente/XAXX010101000/send-statement')
      .set(authHeaderForOrg('org-cobranza'))
      .send({ channelPreference: 'AUTO' });

    expect(res.status).toBe(200);
    expect(sendStatementToClient).toHaveBeenCalledWith({
      organizationId: 'org-cobranza',
      rfc: 'XAXX010101000',
      channelPreference: 'AUTO',
      requestedBy: 'user-org',
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
      organizationId: 'default',
      operationId: 'operation-1',
      channelPreference: 'EMAIL',
      requestedBy: 'api-key',
    });
  });
});

describe('GET /api/cobranza/cliente/:rfc/pdf', () => {
  it('generates the PDF with the authenticated organization scope', async () => {
    const res = await buildApp()
      .get('/api/cobranza/cliente/XAXX010101000/pdf')
      .set(authHeaderForOrg('org-pdf'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(generateEstadoCuenta).toHaveBeenCalledWith('XAXX010101000', 'org-pdf');
  });

  it('does not expose PDF generation details in production errors', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    vi.mocked(generateEstadoCuenta).mockRejectedValueOnce(new Error('DATABASE_URL=secret-value'));

    try {
      const res = await buildApp()
        .get('/api/cobranza/cliente/XAXX010101000/pdf')
        .set(authHeaderForOrg('org-pdf'));

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Error generating PDF' });
      expect(JSON.stringify(res.body)).not.toContain('DATABASE_URL');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
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
