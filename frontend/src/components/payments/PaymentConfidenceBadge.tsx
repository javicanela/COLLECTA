import type { PaymentReviewPayload } from '../../types';

type SignalTone = 'success' | 'warning' | 'danger' | 'neutral';

interface PaymentReviewSignals {
  hasDuplicateRisk: boolean;
  hasUncertainty: boolean;
  primaryLabel: string;
  tone: SignalTone;
  providerLabel?: string;
  reasonLabels: string[];
}

const reasonLabels: Record<string, string> = {
  missing_rfc: 'RFC faltante',
  missing_amount: 'Monto faltante',
  missing_payment_date: 'Fecha faltante',
  rfc_not_found: 'RFC no encontrado',
  no_safe_operation_match: 'Sin match seguro',
  ambiguous_operation_match: 'Match ambiguo',
  duplicate_receipt: 'Duplicado',
  duplicate_payment: 'Pago duplicado',
  low_confidence: 'Baja confianza',
};

const duplicateSignals = ['duplicate', 'duplicado'];
const uncertaintySignals = [
  'ambiguous',
  'uncertain',
  'missing',
  'not_found',
  'no_safe',
  'low_confidence',
  'review',
];

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function reasonLabel(reason: string) {
  const normalized = reason.replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ');
  return reasonLabels[reason] || `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`;
}

function getPaymentReviewSignals(payload: PaymentReviewPayload = {}): PaymentReviewSignals {
  const reasons = payload.reasons || [];
  const searchableSignals = [payload.status, payload.provider, ...reasons]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const hasDuplicateRisk = duplicateSignals.some(signal => searchableSignals.includes(signal));
  const hasUncertainty = uncertaintySignals.some(signal => searchableSignals.includes(signal));
  const providerLabel = payload.provider ? titleCase(payload.provider) : undefined;

  if (hasDuplicateRisk) {
    return {
      hasDuplicateRisk,
      hasUncertainty,
      primaryLabel: 'Duplicado posible',
      tone: 'danger',
      providerLabel,
      reasonLabels: reasons.map(reasonLabel),
    };
  }

  if (hasUncertainty) {
    return {
      hasDuplicateRisk,
      hasUncertainty,
      primaryLabel: 'Revision requerida',
      tone: 'warning',
      providerLabel,
      reasonLabels: reasons.map(reasonLabel),
    };
  }

  return {
    hasDuplicateRisk,
    hasUncertainty,
    primaryLabel: 'Evidencia suficiente',
    tone: 'success',
    providerLabel,
    reasonLabels: reasons.map(reasonLabel),
  };
}

interface PaymentConfidenceBadgeProps {
  payload: PaymentReviewPayload;
  compact?: boolean;
  className?: string;
}

const toneClasses: Record<SignalTone, string> = {
  success: 'border-[var(--brand-success)]/25 bg-[var(--brand-success-dim)] text-[var(--brand-success)]',
  warning: 'border-[var(--brand-warn)]/25 bg-[var(--brand-warn-dim)] text-[var(--brand-warn-dark)]',
  danger: 'border-[var(--brand-danger)]/25 bg-[var(--brand-danger-dim)] text-[var(--brand-danger)]',
  neutral: 'border-[var(--brand-gray)]/25 bg-[var(--brand-gray-dim)] text-[var(--brand-gray)]',
};

export function PaymentConfidenceBadge({
  payload,
  compact = false,
  className = '',
}: PaymentConfidenceBadgeProps) {
  const signals = getPaymentReviewSignals(payload);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${toneClasses[signals.tone]}`}
      >
        {signals.primaryLabel}
      </span>
      {signals.providerLabel && (
        <span className="inline-flex items-center rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] px-2 py-1 text-xs font-medium text-[var(--c-text-2)]">
          {signals.providerLabel}
        </span>
      )}
      {!compact && signals.reasonLabels.map(reason => (
        <span
          key={reason}
          className="inline-flex items-center rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-2 py-1 text-xs text-[var(--c-text-2)]"
        >
          {reason}
        </span>
      ))}
    </div>
  );
}

PaymentConfidenceBadge.getSignals = getPaymentReviewSignals;
PaymentConfidenceBadge.reasonLabel = reasonLabel;
