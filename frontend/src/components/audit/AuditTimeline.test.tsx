import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  AuditTimeline,
  filterAuditEvents,
  maskAuditPhone,
  normalizeAuditEvent,
  redactAuditText,
} from './AuditTimeline';
import type { LogEntry } from '../../types';

const baseLog: LogEntry = {
  id: 'log-1',
  clientId: 'client-1',
  tipo: 'WHATSAPP',
  variante: 'STATEMENT_PDF',
  resultado: 'ENVIADO',
  mensaje: 'fingerprint=abc | confidence_source=heuristic',
  telefono: '+52 664 123 4567',
  modo: 'PRODUCCION' as LogEntry['modo'],
  createdAt: '2026-05-10T18:30:00.000Z',
  client: {
    id: 'client-1',
    nombre: 'Cliente Demo',
    rfc: 'AAA010101AAA',
    telefono: '+52 664 123 4567',
    estado: 'ACTIVO',
  },
};

describe('maskAuditPhone', () => {
  it('masks the middle digits and keeps the last four', () => {
    expect(maskAuditPhone('+52 664 123 4567')).toBe('+52 ******4567');
  });

  it('returns a placeholder when the phone is empty', () => {
    expect(maskAuditPhone('')).toBe('No capturado');
    expect(maskAuditPhone(null)).toBe('No capturado');
  });
});

describe('redactAuditText', () => {
  it('replaces the phone number with the masked version', () => {
    const redacted = redactAuditText('Contacto: +52 664 123 4567', '+52 664 123 4567');
    expect(redacted).toContain('+52 ******4567');
    expect(redacted).not.toContain('664 123 4567');
  });

  it('masks email local parts', () => {
    const redacted = redactAuditText('Aviso a cliente@example.com');
    expect(redacted).toContain('c***@example.com');
    expect(redacted).not.toContain('cliente@example.com');
  });
});

describe('normalizeAuditEvent', () => {
  it('classifies a WhatsApp delivery and masks the phone in the search index', () => {
    const event = normalizeAuditEvent(baseLog);

    expect(event.type).toBe('WHATSAPP');
    expect(event.outcome).toBe('SUCCESS');
    expect(event.title).toBe('WhatsApp enviado');
    expect(event.phoneLabel).toBe('+52 ******4567');
    expect(event.clientName).toBe('Cliente Demo');
  });

  it('parses pipe-separated message metadata into detail rows', () => {
    const event = normalizeAuditEvent(baseLog);
    const labels = event.detailRows.map(([label]) => label.toLowerCase());

    expect(labels).toContain('fingerprint');
    expect(labels).toContain('fuente');
  });

  it('renders WhatsApp payment correlation JSON as readable audit evidence', () => {
    const event = normalizeAuditEvent({
      ...baseLog,
      tipo: 'PAYMENT_DETECTION',
      variante: 'WHATSAPP_REPLY',
      resultado: 'ACCEPTED',
      mensaje: JSON.stringify({
        event: 'whatsapp_payment_confirmation_correlation',
        phoneLast4: '4500',
        sourceMessageId: 'wa-pay-1',
        operationId: 'op-123',
        amount: 2600,
        reasons: ['amount_exact', 'previous_outbound_whatsapp'],
        confidence: 0.95,
        textSample: 'te mande comprobante por $2,600.00',
      }),
    });

    expect(event.type).toBe('PAYMENT_DETECTION');
    expect(event.message).not.toContain('{');
    expect(event.detailRows).toContainEqual(['Operacion', 'op-123']);
    expect(event.detailRows).toContainEqual(['Monto detectado', '2600']);
    expect(event.detailRows).toContainEqual(['Motivos', 'amount_exact, previous_outbound_whatsapp']);
    expect(event.detailRows).toContainEqual(['Telefono', '******4500']);
  });
});

describe('filterAuditEvents', () => {
  const events = [
    normalizeAuditEvent(baseLog),
    normalizeAuditEvent({
      ...baseLog,
      id: 'log-2',
      tipo: 'EMAIL',
      resultado: 'ERROR',
      mensaje: 'smtp_error',
      createdAt: '2026-05-09T10:00:00.000Z',
    }),
  ];

  it('filters by event type', () => {
    const result = filterAuditEvents(events, {
      query: '',
      type: 'EMAIL',
      outcome: 'all',
      from: '',
      to: '',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('log-2');
  });

  it('filters by outcome', () => {
    const result = filterAuditEvents(events, {
      query: '',
      type: 'all',
      outcome: 'SUCCESS',
      from: '',
      to: '',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('log-1');
  });
});

describe('AuditTimeline', () => {
  it('renders a loading shell when loading', () => {
    const html = renderToStaticMarkup(
      <AuditTimeline events={[]} loading error={null} onSelect={vi.fn()} onRetry={vi.fn()} />,
    );

    expect(html).toContain('Cargando auditoria');
  });

  it('renders an empty state when there are no events', () => {
    const html = renderToStaticMarkup(
      <AuditTimeline
        events={[]}
        loading={false}
        error={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('Sin eventos para mostrar');
  });

  it('renders an error state with a retry affordance', () => {
    const html = renderToStaticMarkup(
      <AuditTimeline
        events={[]}
        loading={false}
        error="Auditoria no disponible"
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('Auditoria no disponible');
    expect(html).toContain('Reintentar');
  });

  it('renders events grouped by date with a masked phone metadata pill', () => {
    const event = normalizeAuditEvent(baseLog);
    const html = renderToStaticMarkup(
      <AuditTimeline
        events={[event]}
        loading={false}
        error={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain('WhatsApp enviado');
    expect(html).toContain('Cliente Demo');
    expect(html).toContain('+52 ******4567');
    expect(html).not.toContain('664 123 4567');
  });
});
