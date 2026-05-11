import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PaymentReviewQueue } from './PaymentReviewQueue';
import type { PaymentReviewItem } from '../../types';

const items: PaymentReviewItem[] = [
  {
    id: 'review-1',
    createdAt: '2026-05-10T12:00:00.000Z',
    client: null,
    payload: {
      rfc: 'DNO010101AA1',
      amount: 3480.5,
      paymentDate: '2026-05-09T00:00:00.000Z',
      reference: 'SPEI-4482',
      source: 'email_pdf',
      reasons: ['ambiguous_operation_match'],
    },
    candidates: [
      {
        id: 'op-1',
        tipo: 'Declaracion',
        monto: 3480.5,
        fechaVence: '2026-05-17T00:00:00.000Z',
        estatus: 'VENCIDO',
      },
    ],
  },
];

describe('PaymentReviewQueue', () => {
  it('renders queue rows with evidence summary and candidate count', () => {
    const html = renderToStaticMarkup(
      <PaymentReviewQueue
        items={items}
        selectedItemId="review-1"
        onSelectItem={vi.fn()}
      />,
    );

    expect(html).toContain('DNO010101AA1');
    expect(html).toContain('$3,480.50');
    expect(html).toContain('SPEI-4482');
    expect(html).toContain('1 candidato');
    expect(html).toContain('aria-current="true"');
  });

  it('renders an operational empty state', () => {
    const html = renderToStaticMarkup(
      <PaymentReviewQueue
        items={[]}
        selectedItemId={null}
        onSelectItem={vi.fn()}
      />,
    );

    expect(html).toContain('Sin pagos pendientes de revision');
    expect(html).toContain('Los comprobantes ambiguos apareceran aqui');
  });
});
