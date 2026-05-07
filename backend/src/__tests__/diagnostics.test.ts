import { describe, expect, it } from 'vitest';
import { req, TEST_AUTH } from './test-app';

function serialized(body: unknown) {
  return JSON.stringify(body);
}

describe('GET /api/diagnostics/e2e-readiness', () => {
  it('requires auth', async () => {
    const res = await req.get('/api/diagnostics/e2e-readiness');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('reports backend E2E readiness checks without frontend render checks', async () => {
    const res = await req
      .get('/api/diagnostics/e2e-readiness')
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      service: 'collecta-backend',
      status: expect.any(String),
      checks: {
        database: { status: 'ok' },
        auth: { status: 'ok', configured: true },
        routes: {
          pendingCollections: {
            status: 'ok',
            method: 'GET',
            path: '/api/n8n/pending-collections',
          },
          whatsapp: {
            status: 'ok',
            method: 'GET',
            path: '/api/whatsapp/status',
          },
          sendStatement: {
            status: 'ok',
            method: 'POST',
            path: '/api/cobranza/cliente/:rfc/send-statement',
          },
          paymentDetection: {
            status: 'ok',
            method: 'POST',
            path: '/api/n8n/payment-detections',
          },
        },
        n8nWorkflows: {
          status: 'ok',
          expected: [
            '01_reporte_diario_cartera.json',
            '02_cobranza_automatica_whatsapp.json',
            '03_deteccion_pagos_gemini_vision.json',
            '04_cobranza_email_pdf.json',
          ],
        },
      },
    });
    expect(serialized(res.body)).not.toContain('frontend');
  });

  it('does not expose secret values in the response', async () => {
    const res = await req
      .get('/api/diagnostics/e2e-readiness')
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    const payload = serialized(res.body);

    for (const secret of [
      process.env.API_KEY,
      process.env.JWT_SECRET,
      process.env.DATABASE_URL,
      process.env.DIRECT_URL,
      process.env.EVOLUTION_API_KEY,
      process.env.RESEND_API_KEY,
      process.env.SMTP_PASS,
      process.env.GEMINI_API_KEY,
      process.env.OPENROUTER_API_KEY,
      process.env.GROQ_API_KEY,
    ]) {
      if (secret) {
        expect(payload).not.toContain(secret);
      }
    }
  });

  it('warns when optional outbound integrations are not configured', async () => {
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
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
    };

    for (const key of Object.keys(original) as Array<keyof typeof original>) {
      delete process.env[key];
    }

    try {
      const res = await req
        .get('/api/diagnostics/e2e-readiness')
        .set(TEST_AUTH.headers);

      expect(res.status).toBe(200);
      expect(res.body.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'whatsapp_integration_unconfigured' }),
          expect.objectContaining({ code: 'email_integration_unconfigured' }),
          expect.objectContaining({ code: 'payment_detection_provider_unconfigured' }),
        ]),
      );
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
