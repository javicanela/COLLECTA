import { CheckCircle2, X } from 'lucide-react';
import type { PaymentReviewCandidate } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StateBlock } from '../ui/StateBlock';

interface PaymentCandidateListProps {
  candidates: PaymentReviewCandidate[];
  pendingCandidateId: string | null;
  confirmingCandidateId: string | null;
  onRequestConfirm: (candidate: PaymentReviewCandidate) => void;
  onCancelConfirm: () => void;
  onConfirm: (candidate: PaymentReviewCandidate) => void;
  className?: string;
}

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

const dateLabel = (iso?: string | null) => {
  if (!iso) return 'Sin vencimiento';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export function PaymentCandidateList({
  candidates,
  pendingCandidateId,
  confirmingCandidateId,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
  className = '',
}: PaymentCandidateListProps) {
  return (
    <section
      aria-labelledby="payment-candidates-title"
      className={`rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] ${className}`}
    >
      <div className="border-b border-[var(--c-border-subtle)] px-4 py-3">
        <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Candidatos</p>
        <h2 id="payment-candidates-title" className="mt-1 text-base font-semibold text-[var(--c-text)]">
          Operaciones posibles
        </h2>
      </div>

      <div className="p-4">
        {candidates.length === 0 ? (
          <StateBlock
            state="empty"
            title="Sin candidatos sugeridos"
            description="No hay operaciones pendientes sugeridas para este comprobante."
            compact
          />
        ) : (
          <div className="divide-y divide-[var(--c-border-subtle)] overflow-hidden rounded-md border border-[var(--c-border-subtle)]">
            {candidates.map(candidate => {
              const isPending = pendingCandidateId === candidate.id;
              const isConfirming = confirmingCandidateId === candidate.id;

              return (
                <article key={candidate.id} className="bg-[var(--c-surface)]">
                  <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-[var(--c-text)]">
                          {candidate.tipo}
                        </h3>
                        <Badge status={candidate.estatus} size="sm" />
                      </div>
                      <p className="mt-1 truncate text-sm text-[var(--c-text-2)]">
                        {candidate.client?.nombre || 'Cliente no identificado'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--c-text-muted)]">
                        {candidate.descripcion || 'Sin descripcion'} - RFC {candidate.client?.rfc || 'N/D'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:min-w-[210px] lg:text-right">
                      <div>
                        <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Monto</p>
                        <p className="font-mono text-sm font-semibold text-[var(--c-text)]">{money(candidate.monto)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Vence</p>
                        <p className="text-sm font-medium text-[var(--c-text)]">{dateLabel(candidate.fechaVence)}</p>
                      </div>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="border-t border-[var(--c-border-subtle)] bg-[var(--brand-warn-dim)] px-3 py-3">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--c-text)]">
                            Confirmar pago en {candidate.tipo}
                          </p>
                          <p className="mt-1 text-xs text-[var(--c-text-2)]">
                            Esta accion marcara la operacion como pagada usando la evidencia del comprobante seleccionado.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="gray"
                            size="sm"
                            leftIcon={<X size={14} />}
                            disabled={!!confirmingCandidateId}
                            onClick={onCancelConfirm}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="green"
                            size="sm"
                            loading={isConfirming}
                            disabled={!!confirmingCandidateId && !isConfirming}
                            leftIcon={<CheckCircle2 size={14} />}
                            onClick={() => onConfirm(candidate)}
                          >
                            Confirmar pago
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-[var(--c-border-subtle)] px-3 py-3">
                      <Button
                        variant="blue"
                        size="sm"
                        disabled={!!confirmingCandidateId}
                        onClick={() => onRequestConfirm(candidate)}
                      >
                        Revisar candidato
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
