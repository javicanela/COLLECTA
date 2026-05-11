import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaymentEvidencePanel } from './PaymentEvidencePanel';
import type { PaymentReviewItem } from '../../types';

const reviewItem: PaymentReviewItem = {
  id: 'review-1',
  createdAt: '2026-05-10T12:00:00.000Z',
  client: {
    id: 'client-1',
    nombre: 'Despacho Norte',
    rfc: 'DNO010101AA1',
    telefono: null,
  },
  payload: {
    receiptKey: 'receipt-2026-05-10-01',
    rfc: 'DNO010101AA1',
    amount: 3480.5,
    paymentDate: '2026-05-09T00:00:00.000Z',
    reference: 'SPEI-4482',
    source: 'email_pdf',
    provider: 'gemini',
    reasons: ['duplicate_receipt', 'ambiguous_operation_match'],
  },
  candidates: [],
};

describe('PaymentEvidencePanel', () => {
  it('renders extracted evidence and risk context', () => {
    const html = renderToStaticMarkup(<PaymentEvidencePanel item={reviewItem} />);

    expect(html).toContain('DNO010101AA1');
    expect(html).toContain('$3,480.50');
    expect(html).toContain('09 may 2026');
    expect(html).toContain('SPEI-4482');
    expect(html).toContain('email_pdf');
    expect(html).toContain('Gemini');
    expect(html).toContain('Duplicado posible');
    expect(html).toContain('Match ambiguo');
  });

  it('renders a clear empty evidence marker when fields are missing', () => {
    const html = renderToStaticMarkup(
      <PaymentEvidencePanel
        item={{
          ...reviewItem,
          payload: {
            reasons: ['missing_rfc', 'missing_amount', 'missing_payment_date'],
          },
        }}
      />,
    );

    expect(html).toContain('Sin RFC');
    expect(html).toContain('Sin monto');
    expect(html).toContain('Sin fecha');
    expect(html).toContain('RFC faltante');
  });
});
