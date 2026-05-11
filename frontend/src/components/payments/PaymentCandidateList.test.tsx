import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PaymentCandidateList } from './PaymentCandidateList';
import type { PaymentReviewCandidate } from '../../types';

const candidates: PaymentReviewCandidate[] = [
  {
    id: 'op-1',
    tipo: 'Declaracion',
    descripcion: 'IVA abril',
    monto: 3480.5,
    fechaVence: '2026-05-17T00:00:00.000Z',
    estatus: 'VENCIDO',
    client: {
      nombre: 'Despacho Norte',
      rfc: 'DNO010101AA1',
    },
  },
  {
    id: 'op-2',
    tipo: 'Honorarios',
    descripcion: null,
    monto: 3200,
    fechaVence: '2026-05-31T00:00:00.000Z',
    estatus: 'PENDIENTE',
    client: {
      nombre: 'Servicios Delta',
      rfc: 'SDE010101BB2',
    },
  },
];

describe('PaymentCandidateList', () => {
  it('renders candidate amount, due date, client and status', () => {
    const html = renderToStaticMarkup(
      <PaymentCandidateList
        candidates={candidates}
        pendingCandidateId={null}
        confirmingCandidateId={null}
        onRequestConfirm={vi.fn()}
        onCancelConfirm={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('Despacho Norte');
    expect(html).toContain('$3,480.50');
    expect(html).toContain('17 may 2026');
    expect(html).toContain('Vencido');
    expect(html).toContain('Revisar candidato');
    expect(html).not.toContain('Confirmar pago en Declaracion');
  });

  it('requires a second explicit confirmation before exposing the final action', () => {
    const html = renderToStaticMarkup(
      <PaymentCandidateList
        candidates={candidates}
        pendingCandidateId="op-1"
        confirmingCandidateId={null}
        onRequestConfirm={vi.fn()}
        onCancelConfirm={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('Confirmar pago en Declaracion');
    expect(html).toContain('Esta accion marcara la operacion como pagada');
    expect(html).toContain('Cancelar');
  });
});
