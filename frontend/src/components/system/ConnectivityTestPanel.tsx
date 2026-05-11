import { AlertTriangle, CheckCircle2, CircleHelp, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  formatDiagnosticDate,
  getStatusLabel,
  redactDiagnosticText,
  type ReadinessItemStatus,
  type ReadinessSummary,
} from './ReadinessChecklist';

interface ConnectivityTestPanelProps {
  summary: ReadinessSummary;
  overallStatus: ReadinessItemStatus;
  generatedAt?: string | null;
  environment?: string | null;
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

function summaryTone(status: ReadinessItemStatus) {
  if (status === 'ok') return 'text-[var(--brand-success)] bg-[var(--brand-success-dim)]';
  if (status === 'error') return 'text-[var(--brand-danger)] bg-[var(--brand-danger-dim)]';
  if (status === 'not_configured') return 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-white/5';
  if (status === 'unverified') return 'text-[var(--brand-info)] bg-[var(--brand-info-dim)]';
  return 'text-[var(--brand-warn-dark)] bg-[var(--brand-warn-dim)]';
}

function OverallStatusIcon({ status }: { status: ReadinessItemStatus }) {
  if (status === 'ok') return <CheckCircle2 size={23} aria-hidden="true" />;
  if (status === 'error') return <XCircle size={23} aria-hidden="true" />;
  if (status === 'warning') return <AlertTriangle size={23} aria-hidden="true" />;
  return <CircleHelp size={23} aria-hidden="true" />;
}

function Counter({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: ReadinessItemStatus;
}) {
  return (
    <div className="rounded-lg border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-3 py-2.5">
      <p className="text-[11px] font-bold text-[var(--c-text-muted)]">{label}</p>
      <p className={`mt-1 w-fit rounded-md px-2 py-1 text-sm font-black ${summaryTone(status)}`}>
        {value} {label}
      </p>
    </div>
  );
}

export function ConnectivityTestPanel({
  summary,
  overallStatus,
  generatedAt,
  environment,
  isLoading,
  error,
  onRefresh,
}: ConnectivityTestPanelProps) {
  return (
    <Card variant="glass" padding="normal">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${summaryTone(overallStatus)}`}>
            <OverallStatusIcon status={overallStatus} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--c-text-muted)]">Prueba de conectividad</p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-[var(--c-text)]">
              {getStatusLabel(overallStatus)}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--c-text-2)]">
              {summary.blocking === 0
                ? 'Las capacidades monitoreadas estan listas.'
                : `${summary.blocking} capacidades requieren configuracion, verificacion o correccion.`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--c-text-muted)]">
              <span>{generatedAt ? `Generado ${formatDiagnosticDate(generatedAt)}` : 'Sin fecha del backend'}</span>
              {environment && <span>Ambiente: {redactDiagnosticText(environment)}</span>}
            </div>
          </div>
        </div>

        <Button
          variant="blue"
          size="sm"
          loading={isLoading}
          onClick={onRefresh}
          leftIcon={<RefreshCw size={14} />}
        >
          Refrescar
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Counter label="OK" value={summary.ok} status="ok" />
        <Counter label="warning" value={summary.warning} status="warning" />
        <Counter label="error" value={summary.error} status="error" />
        <Counter label="no configuradas" value={summary.notConfigured} status="not_configured" />
        <Counter label="sin verificar" value={summary.unverified} status="unverified" />
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[rgba(239,63,63,0.24)] bg-[var(--brand-danger-dim)] px-4 py-3">
          <div className="flex items-start gap-2 text-[var(--brand-danger)]">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-bold">No se pudo cargar diagnostics.</p>
              <p className="mt-1 break-words text-sm text-[var(--c-text-2)]">
                {redactDiagnosticText(error)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!error && isLoading && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-4 py-3 text-sm text-[var(--c-text-muted)]">
          <RefreshCw size={15} className="animate-spin" aria-hidden="true" />
          Actualizando prueba protegida de readiness.
        </div>
      )}

      {!error && !isLoading && summary.total === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-4 py-3 text-sm text-[var(--c-text-muted)]">
          <ShieldCheck size={15} aria-hidden="true" />
          La respuesta llego vacia; refresca para reintentar.
        </div>
      )}
    </Card>
  );
}
