import { ReceiptText } from 'lucide-react';
import type { PaymentReviewItem } from '../../types';
import { StateBlock } from '../ui/StateBlock';
import { PaymentConfidenceBadge } from './PaymentConfidenceBadge';

interface PaymentReviewQueueProps {
  items: PaymentReviewItem[];
  selectedItemId: string | null;
  onSelectItem: (item: PaymentReviewItem) => void;
  className?: string;
}

const money = (value?: number | null) => {
  if (value === null || value === undefined) return 'Sin monto';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
};

const dateLabel = (iso?: string | null) => {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const candidateCountLabel = (count: number) => `${count} candidato${count === 1 ? '' : 's'}`;

export function PaymentReviewQueue({
  items,
  selectedItemId,
  onSelectItem,
  className = '',
}: PaymentReviewQueueProps) {
  return (
    <section
      aria-labelledby="payment-review-queue-title"
      className={`rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] ${className}`}
    >
      <div className="border-b border-[var(--c-border-subtle)] px-4 py-3">
        <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Cola operativa</p>
        <h2 id="payment-review-queue-title" className="mt-1 text-base font-semibold text-[var(--c-text)]">
          Comprobantes ambiguos
        </h2>
      </div>

      <div className="p-3">
        {items.length === 0 ? (
          <StateBlock
            state="empty"
            title="Sin pagos pendientes de revision"
            description="Los comprobantes ambiguos apareceran aqui cuando el detector no encuentre un match seguro."
            compact
          />
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const isSelected = selectedItemId === item.id;
              const title = item.client?.nombre || item.payload.rfc || 'Comprobante sin cliente';

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => onSelectItem(item)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-[var(--brand-info)] bg-[var(--brand-info-dim)]'
                      : 'border-[var(--c-border-subtle)] bg-[var(--c-surface)] hover:bg-[var(--c-surface-raised)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[var(--brand-warn-dim)] text-[var(--brand-warn-dark)]"
                    >
                      <ReceiptText size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--c-text)]">{title}</span>
                        <span className="font-mono text-sm font-semibold text-[var(--c-text)]">
                          {money(item.payload.amount)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-[var(--c-text-2)]">
                        RFC {item.payload.rfc || item.client?.rfc || 'N/D'} - Ref {item.payload.reference || 'N/D'}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--c-text-muted)]">
                        Pago {dateLabel(item.payload.paymentDate)} - {candidateCountLabel(item.candidates.length)}
                      </span>
                      <PaymentConfidenceBadge payload={item.payload} compact className="mt-2" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
