import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ReceiptText, RefreshCw } from 'lucide-react';
import Topbar from '../components/Topbar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PaymentDetectionService } from '../services/paymentDetectionService';
import type { PaymentReviewItem } from '../types';

const money = (value?: number | null) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

const dateLabel = (iso?: string | null) => {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    missing_rfc: 'RFC faltante',
    missing_amount: 'Monto faltante',
    missing_payment_date: 'Fecha faltante',
    rfc_not_found: 'RFC no encontrado',
    no_safe_operation_match: 'Sin match seguro',
    ambiguous_operation_match: 'Match ambiguo',
    duplicate_receipt: 'Duplicado',
  };
  return labels[reason] || reason.replace(/_/g, ' ');
}

export default function PaymentReviewView() {
  const [items, setItems] = useState<PaymentReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchReview = () => {
    setIsLoading(true);
    setMessage(null);
    PaymentDetectionService.getReviewReport()
      .then(report => setItems(report.pending))
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReview();
  }, []);

  const stats = useMemo(() => {
    const withClient = items.filter(item => item.client).length;
    const withCandidates = items.filter(item => item.candidates.length > 0).length;
    return { total: items.length, withClient, withCandidates };
  }, [items]);

  const confirmCandidate = async (item: PaymentReviewItem, operationId: string) => {
    setConfirmingId(operationId);
    setMessage(null);
    try {
      await PaymentDetectionService.confirmReview({
        operationId,
        paymentDate: item.payload.paymentDate || undefined,
        reference: item.payload.reference || undefined,
        receiptId: item.payload.receiptKey || undefined,
      });
      setMessage('Pago confirmado manualmente.');
      fetchReview();
    } catch (error: any) {
      setMessage(error.message || 'No se pudo confirmar el pago.');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <>
      <Topbar
        title="Confirmaciones de pago"
        subtitle="Comprobantes ambiguos o incompletos que requieren revision"
        actions={
          <button
            onClick={fetchReview}
            disabled={isLoading}
            className="btn btn-ghost btn-sm gap-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      <div className="p-5 max-w-7xl mx-auto w-full flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="glass" padding="normal">
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--c-text-muted)' }}>
              Pendientes
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
              {stats.total}
            </p>
          </Card>
          <Card variant="glass" padding="normal">
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--c-text-muted)' }}>
              Con cliente
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
              {stats.withClient}
            </p>
          </Card>
          <Card variant="glass" padding="normal">
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--c-text-muted)' }}>
              Con candidatos
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
              {stats.withCandidates}
            </p>
          </Card>
        </div>

        {message && (
          <Card variant="glass" padding="sm">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-text)' }}>
              <AlertTriangle size={16} />
              {message}
            </div>
          </Card>
        )}

        {isLoading ? (
          <Card variant="glass" padding="lg">
            <div className="flex items-center gap-3" style={{ color: 'var(--c-text-muted)' }}>
              <RefreshCw size={18} className="animate-spin" />
              Cargando confirmaciones pendientes...
            </div>
          </Card>
        ) : items.length === 0 ? (
          <Card variant="glass" padding="xl">
            <div className="flex flex-col items-center text-center gap-3">
              <CheckCircle2 size={42} style={{ color: 'var(--brand-success)' }} />
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--c-text)' }}>
                  Sin confirmaciones pendientes
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--c-text-muted)' }}>
                  Los intentos ambiguos apareceran aqui para revision.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map(item => (
              <Card key={item.id} variant="glass" padding="normal">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--brand-warn)' }}
                      >
                        <ReceiptText size={20} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>
                            {item.client?.nombre || item.payload.rfc || 'Comprobante sin cliente'}
                          </h3>
                          <Badge status="PENDIENTE" size="sm" />
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>
                          {dateLabel(item.createdAt)} · RFC {item.client?.rfc || item.payload.rfc || 'N/D'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: 'var(--c-text)' }}>
                        {money(item.payload.amount)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
                        Pago {dateLabel(item.payload.paymentDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(item.payload.reasons || []).map(reason => (
                      <span
                        key={reason}
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{
                          background: 'rgba(245,158,11,0.12)',
                          color: 'var(--brand-warn)',
                        }}
                      >
                        {reasonLabel(reason)}
                      </span>
                    ))}
                    {item.payload.reference && (
                      <span className="px-2 py-1 rounded-md text-xs font-mono" style={{ background: 'var(--c-surface)', color: 'var(--c-text-muted)' }}>
                        Ref {item.payload.reference}
                      </span>
                    )}
                  </div>

                  <div className="border-t pt-4" style={{ borderColor: 'var(--c-border-subtle)' }}>
                    <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--c-text-muted)' }}>
                      Operaciones candidatas
                    </p>
                    {item.candidates.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
                        No hay operaciones pendientes sugeridas para este comprobante.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {item.candidates.map(candidate => (
                          <div
                            key={candidate.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2"
                            style={{ background: 'var(--c-surface)' }}
                          >
                            <div>
                              <p className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>
                                {candidate.tipo} · {money(candidate.monto)}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
                                Vence {dateLabel(candidate.fechaVence)} · {candidate.descripcion || 'Sin descripcion'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="green"
                              loading={confirmingId === candidate.id}
                              disabled={!!confirmingId}
                              leftIcon={<CheckCircle2 size={14} />}
                              onClick={() => confirmCandidate(item, candidate.id)}
                            >
                              Confirmar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
