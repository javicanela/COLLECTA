import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuditEventDrawer } from './AuditEventDrawer';
import { normalizeAuditEvent } from './AuditTimeline';
import type { LogEntry } from '../../types';

const log: LogEntry = {
  id: 'log-drawer',
  clientId: 'client-1',
  tipo: 'WHATSAPP',
  variante: 'STATEMENT_PDF',
  resultado: 'ERROR',
  mensaje: 'delivery_error',
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

describe('AuditEventDrawer', () => {
  it('renders local drawer details with masked phone and raw audit fields', () => {
    const html = renderToStaticMarkup(
      <AuditEventDrawer event={normalizeAuditEvent(log)} onClose={vi.fn()} />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Detalle del evento');
    expect(html).toContain('log-drawer');
    expect(html).toContain('STATEMENT_PDF');
    expect(html).toContain('delivery_error');
    expect(html).toContain('+52 ******4567');
    expect(html).not.toContain('664 123 4567');
  });

  it('renders nothing without an event', () => {
    const html = renderToStaticMarkup(<AuditEventDrawer event={null} onClose={vi.fn()} />);

    expect(html).toBe('');
  });
});
