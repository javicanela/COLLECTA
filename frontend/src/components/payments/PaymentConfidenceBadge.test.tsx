import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaymentConfidenceBadge } from './PaymentConfidenceBadge';
import type { PaymentReviewPayload } from '../../types';

describe('PaymentConfidenceBadge', () => {
  it('detects duplicate and uncertainty signals from status and reasons', () => {
    const payload: PaymentReviewPayload = {
      status: 'review_required',
      provider: 'gemini',
      reasons: ['duplicate_receipt', 'ambiguous_operation_match', 'rfc_not_found'],
    };

    const signals = PaymentConfidenceBadge.getSignals(payload);

    expect(signals.hasDuplicateRisk).toBe(true);
    expect(signals.hasUncertainty).toBe(true);
    expect(signals.primaryLabel).toBe('Duplicado posible');
    expect(signals.reasonLabels).toEqual(['Duplicado', 'Match ambiguo', 'RFC no encontrado']);
  });

  it('normalizes unknown reasons without hiding provider context', () => {
    const html = renderToStaticMarkup(
      <PaymentConfidenceBadge
        payload={{
          provider: 'openrouter',
          reasons: ['provider_low_confidence'],
        }}
      />,
    );

    expect(PaymentConfidenceBadge.reasonLabel('provider_low_confidence')).toBe('Provider low confidence');
    expect(html).toContain('Revision requerida');
    expect(html).toContain('Openrouter');
    expect(html).toContain('Provider low confidence');
  });
});
