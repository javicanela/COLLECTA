import { AlertTriangle, CalendarDays, CircleDollarSign, FileText, Fingerprint, Hash, RadioTower } from 'lucide-react';
import type { PaymentReviewItem } from '../../types';
import { InlineAlert } from '../ui/InlineAlert';
import { PaymentConfidenceBadge } from './PaymentConfidenceBadge';

interface PaymentEvidencePanelProps {
  item: PaymentReviewItem;
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

const evidenceRows = (item: PaymentReviewItem) => [
  {
    label: 'RFC detectado',
    value: item.payload.rfc || 'Sin RFC',
    icon: <Fingerprint size={15} />,
    mono: true,
  },
  {
    label: 'Monto',
    value: money(item.payload.amount),
    icon: <CircleDollarSign size={15} />,
    mono: true,
  },
  {
    label: 'Fecha de pago',
    value: dateLabel(item.payload.paymentDate),
    icon: <CalendarDays size={15} />,
  },
  {
    label: 'Referencia',
    value: item.payload.reference || item.payload.receiptKey || 'Sin referencia',
    icon: <Hash size={15} />,
    mono: true,
  },
  {
    label: 'Fuente',
    value: item.payload.source || 'Sin fuente',
    icon: <RadioTower size={15} />,
  },
  {
    label: 'Comprobante',
    value: item.payload.receiptKey || item.id,
    icon: <FileText size={15} />,
    mono: true,
  },
];

export function PaymentEvidencePanel({ item, className = '' }: PaymentEvidencePanelProps) {
  const signals = PaymentConfidenceBadge.getSignals(item.payload);

  return (
    <section
      aria-labelledby="payment-evidence-title"
      className={`rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] ${className}`}
    >
      <div className="border-b border-[var(--c-border-subtle)] px-4 py-3">
        <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Panel evidencia</p>
        <h2 id="payment-evidence-title" className="mt-1 text-base font-semibold text-[var(--c-text)]">
          Datos extraidos del comprobante
        </h2>
      </div>

      <div className="space-y-4 p-4">
        <PaymentConfidenceBadge payload={item.payload} />

        {signals.hasDuplicateRisk && (
          <InlineAlert tone="danger" title="Duplicado posible" icon={<AlertTriangle size={16} />} compact>
            El comprobante coincide con una senal de duplicado. Valida referencia, monto y fecha antes de confirmar.
          </InlineAlert>
        )}

        {!signals.hasDuplicateRisk && signals.hasUncertainty && (
          <InlineAlert tone="warning" title="Incertidumbre detectada" icon={<AlertTriangle size={16} />} compact>
            El payload contiene razones de baja confianza. Confirma solo si la evidencia coincide con la operacion.
          </InlineAlert>
        )}

        <dl className="divide-y divide-[var(--c-border-subtle)] rounded-md border border-[var(--c-border-subtle)]">
          {evidenceRows(item).map(row => (
            <div key={row.label} className="grid grid-cols-[132px_minmax(0,1fr)] gap-3 px-3 py-3">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--c-text-muted)]">
                <span aria-hidden="true">{row.icon}</span>
                {row.label}
              </dt>
              <dd className={`min-w-0 text-sm font-medium text-[var(--c-text)] ${row.mono ? 'font-mono' : ''}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {item.payload.rawMessage && (
          <div className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Mensaje original</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--c-text-2)]">
              {item.payload.rawMessage}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
