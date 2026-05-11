import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ReadinessChecklist,
  buildReadinessItems,
  getReadinessSummary,
  redactDiagnosticText,
} from './ReadinessChecklist';
import type { DiagnosticsReadinessResponse } from '../../types';

const backendPayload: DiagnosticsReadinessResponse = {
  ok: false,
  status: 'degraded',
  generatedAt: '2026-05-11T18:40:00.000Z',
  environment: 'development',
  summary: { total: 5, ok: 2, warning: 3, error: 0 },
  checks: [
    {
      id: 'database',
      label: 'Database',
      status: 'ok',
      message: 'Database reachable.',
      checkedAt: '2026-05-11T18:40:00.000Z',
    },
    {
      id: 'auth',
      label: 'Backend auth',
      status: 'ok',
      message: 'Auth configured with api_key.',
      checkedAt: '2026-05-11T18:40:00.000Z',
    },
    {
      id: 'evolution',
      label: 'Evolution API',
      status: 'warning',
      message: 'WhatsApp automation is not fully configured; manual wa.me fallback remains available.',
      action: 'Configure Evolution only in a safe test/staging environment.',
      checkedAt: '2026-05-11T18:40:00.000Z',
    },
    {
      id: 'email',
      label: 'Email delivery',
      status: 'warning',
      message: 'Email delivery is not fully configured; statement delivery will use another channel or manual fallback.',
      action: 'Configure Resend or SMTP test credentials if email E2E is required.',
      checkedAt: '2026-05-11T18:40:00.000Z',
    },
    {
      id: 'paymentDetectionProvider',
      label: 'Payment detection provider',
      status: 'warning',
      message: 'Cloud payment detection providers are not configured; deterministic/manual detection can still run.',
      action: 'Use deterministic/manual detection or configure a test provider key.',
      checkedAt: '2026-05-11T18:40:00.000Z',
    },
  ],
};

describe('ReadinessChecklist normalizers', () => {
  it('builds the required operational checklist even when backend omits optional integration checks', () => {
    const items = buildReadinessItems(backendPayload);

    expect(items.map(item => item.id)).toEqual([
      'database',
      'backend',
      'whatsapp',
      'email',
      'pdfStorage',
      'n8n',
      'payments',
      'smartImport',
    ]);
    expect(items.find(item => item.id === 'whatsapp')).toMatchObject({
      status: 'not_configured',
      fallback: expect.stringContaining('wa.me'),
      nextAction: expect.stringContaining('Evolution'),
    });
    expect(items.find(item => item.id === 'pdfStorage')).toMatchObject({
      status: 'unverified',
      fallback: expect.stringContaining('PDF'),
      nextAction: expect.stringContaining('validar'),
    });
    expect(items.find(item => item.id === 'smartImport')).toMatchObject({
      status: 'unverified',
      fallback: expect.stringContaining('deterministico'),
    });
  });

  it('summarizes no configurado and sin verificar separately from warning and error', () => {
    const summary = getReadinessSummary(buildReadinessItems(backendPayload));

    expect(summary).toMatchObject({
      total: 8,
      ok: 2,
      warning: 0,
      error: 0,
      notConfigured: 3,
      unverified: 3,
    });
    expect(summary.blocking).toBe(6);
  });

  it('redacts secrets before rendering diagnostic text', () => {
    expect(redactDiagnosticText('token: sk-live-secret-value and Bearer abc.def.ghi')).toBe(
      'token: [oculto] and Bearer [oculto]',
    );
  });
});

describe('ReadinessChecklist component', () => {
  it('renders actionable rows with next actions and fallbacks', () => {
    const html = renderToStaticMarkup(
      <ReadinessChecklist
        items={buildReadinessItems(backendPayload)}
        isLoading={false}
      />,
    );

    expect(html).toContain('WhatsApp / Evolution');
    expect(html).toContain('Siguiente accion');
    expect(html).toContain('Fallback');
    expect(html).toContain('No configurado');
    expect(html).toContain('Sin verificar');
    expect(html).not.toContain('sk-live-secret-value');
  });
});
