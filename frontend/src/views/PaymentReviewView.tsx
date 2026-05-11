import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import Topbar from '../components/Topbar';
import { Button } from '../components/ui/Button';
import { InlineAlert } from '../components/ui/InlineAlert';
import { Skeleton } from '../components/ui/Skeleton';
import { StateBlock } from '../components/ui/StateBlock';
import { PaymentCandidateList } from '../components/payments/PaymentCandidateList';
import { PaymentEvidencePanel } from '../components/payments/PaymentEvidencePanel';
import { PaymentConfidenceBadge } from '../components/payments/PaymentConfidenceBadge';
import { PaymentReviewQueue } from '../components/payments/PaymentReviewQueue';
import { PaymentDetectionService } from '../services/paymentDetectionService';
import type { PaymentReviewCandidate, PaymentReviewItem } from '../types';

interface LoadReviewOptions {
  showLoading?: boolean;
  clearNotice?: boolean;
}

const missingEvidenceReasons = new Set([
  'missing_rfc',
  'missing_amount',
  'missing_payment_date',
  'rfc_not_found',
]);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toApiPaymentDate(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function hasMissingEvidence(item: PaymentReviewItem) {
  const reasons = item.payload.reasons || [];
  return (
    !item.payload.rfc ||
    item.payload.amount === null ||
    item.payload.amount === undefined ||
    !item.payload.paymentDate ||
    reasons.some(reason => missingEvidenceReasons.has(reason))
  );
}

function PaymentReviewLoading() {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_minmax(360px,0.9fr)]">
      <section className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-4">
        <Skeleton variant="text" width="45%" height={16} />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rectangle" height={96} rounded={8} />
          ))}
        </div>
      </section>
      <section className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-4">
        <Skeleton variant="text" width="40%" height={16} />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="rectangle" height={48} rounded={8} />
          ))}
        </div>
      </section>
      <section className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-4">
        <Skeleton variant="text" width="36%" height={16} />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rectangle" height={112} rounded={8} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function PaymentReviewView() {
  const [items, setItems] = useState<PaymentReviewItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const [confirmingCandidateId, setConfirmingCandidateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchReview = useCallback(async ({
    showLoading = true,
    clearNotice = true,
  }: LoadReviewOptions = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showLoading) setIsLoading(true);
    setErrorMessage(null);
    if (clearNotice) setNotice(null);

    try {
      const report = await PaymentDetectionService.getReviewReport();
      if (requestId !== requestIdRef.current) return;

      const pending = Array.isArray(report.pending) ? report.pending : [];
      setItems(pending);
      setSelectedItemId(current => (
        current && pending.some(item => item.id === current)
          ? current
          : pending[0]?.id ?? null
      ));
      setPendingCandidateId(null);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setErrorMessage(getErrorMessage(error, 'No se pudo cargar el reporte de pagos.'));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchReview();
  }, [fetchReview]);

  const selectedItem = useMemo(() => {
    if (!items.length) return null;
    return items.find(item => item.id === selectedItemId) || items[0];
  }, [items, selectedItemId]);

  const stats = useMemo(() => {
    const duplicateRisk = items.filter(item => PaymentConfidenceBadge.getSignals(item.payload).hasDuplicateRisk).length;
    const uncertain = items.filter(item => PaymentConfidenceBadge.getSignals(item.payload).hasUncertainty).length;
    const withCandidates = items.filter(item => item.candidates.length > 0).length;
    const missingEvidence = items.filter(hasMissingEvidence).length;

    return {
      total: items.length,
      withCandidates,
      duplicateRisk,
      uncertain,
      missingEvidence,
    };
  }, [items]);

  const selectItem = (item: PaymentReviewItem) => {
    setSelectedItemId(item.id);
    setPendingCandidateId(null);
    setNotice(null);
  };

  const confirmCandidate = async (candidate: PaymentReviewCandidate) => {
    if (!selectedItem) {
      setErrorMessage('Selecciona un comprobante antes de confirmar.');
      return;
    }

    if (pendingCandidateId !== candidate.id) {
      setPendingCandidateId(candidate.id);
      return;
    }

    setConfirmingCandidateId(candidate.id);
    setErrorMessage(null);
    setNotice(null);

    try {
      await PaymentDetectionService.confirmReview({
        operationId: candidate.id,
        paymentDate: toApiPaymentDate(selectedItem.payload.paymentDate),
        reference: selectedItem.payload.reference || undefined,
        receiptId: selectedItem.payload.receiptKey || undefined,
      });
      setNotice('Pago confirmado manualmente. La cola fue actualizada.');
      await fetchReview({ showLoading: false, clearNotice: false });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'No se pudo confirmar el pago.'));
    } finally {
      setConfirmingCandidateId(null);
    }
  };

  const renderMainState = () => {
    if (isLoading && items.length === 0) {
      return <PaymentReviewLoading />;
    }

    if (errorMessage && items.length === 0) {
      return (
        <StateBlock
          state="error"
          title="No se pudo cargar la cola de pagos"
          description={errorMessage}
          action={(
            <Button
              variant="blue"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => void fetchReview()}
            >
              Reintentar
            </Button>
          )}
        />
      );
    }

    if (!isLoading && items.length === 0) {
      return (
        <StateBlock
          state="success"
          title="Sin pagos pendientes de revision"
          description="No hay comprobantes ambiguos esperando confirmacion manual."
          icon={<CheckCircle2 size={22} />}
        />
      );
    }

    if (!selectedItem) {
      return (
        <StateBlock
          state="idle"
          title="Selecciona un comprobante"
          description="La evidencia y los candidatos apareceran al seleccionar un elemento de la cola."
        />
      );
    }

    return (
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_minmax(360px,0.9fr)]">
        <PaymentReviewQueue
          items={items}
          selectedItemId={selectedItem.id}
          onSelectItem={selectItem}
          className="xl:min-h-[620px]"
        />
        <PaymentEvidencePanel item={selectedItem} className="xl:min-h-[620px]" />
        <PaymentCandidateList
          candidates={selectedItem.candidates}
          pendingCandidateId={pendingCandidateId}
          confirmingCandidateId={confirmingCandidateId}
          onRequestConfirm={candidate => setPendingCandidateId(candidate.id)}
          onCancelConfirm={() => setPendingCandidateId(null)}
          onConfirm={candidate => void confirmCandidate(candidate)}
          className="xl:min-h-[620px]"
        />
      </div>
    );
  };

  return (
    <>
      <Topbar
        title="Revision de pagos"
        subtitle="Cola operativa para resolver comprobantes ambiguos antes de marcar operaciones como pagadas"
        actions={(
          <Button
            variant="ghost"
            size="sm"
            loading={isLoading}
            disabled={!!confirmingCandidateId}
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void fetchReview()}
          >
            Actualizar
          </Button>
        )}
      />

      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-4 sm:p-5 lg:p-6">
        <section
          aria-label="Resumen de revision de pagos"
          className="grid overflow-hidden rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] sm:grid-cols-2 xl:grid-cols-5"
        >
          {[
            ['Pendientes', stats.total],
            ['Con candidatos', stats.withCandidates],
            ['Duplicado posible', stats.duplicateRisk],
            ['Con incertidumbre', stats.uncertain],
            ['Evidencia incompleta', stats.missingEvidence],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-[var(--c-border-subtle)] px-4 py-3 sm:border-r xl:border-b-0">
              <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">{label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--c-text)]">{value}</p>
            </div>
          ))}
        </section>

        {notice && (
          <InlineAlert tone="success" title="Confirmacion registrada" compact>
            {notice}
          </InlineAlert>
        )}

        {errorMessage && items.length > 0 && (
          <InlineAlert
            tone="danger"
            title="Hubo un problema"
            icon={<AlertTriangle size={16} />}
            action={(
              <Button
                variant="red"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => void fetchReview()}
              >
                Reintentar
              </Button>
            )}
            compact
          >
            {errorMessage}
          </InlineAlert>
        )}

        {renderMainState()}
      </main>
    </>
  );
}
