import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DiagnosticsService } from '../services/diagnosticsService';
import type { DiagnosticsReadinessCheck, DiagnosticsReadinessResponse } from '../types';

type NormalizedStatus = 'ok' | 'warning' | 'error' | 'skipped' | 'unknown';

const REDACTED = '[oculto]';

const statusMeta: Record<NormalizedStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  Icon: LucideIcon;
}> = {
  ok: {
    label: 'Listo',
    color: 'var(--brand-success)',
    bg: 'rgba(16,183,125,0.12)',
    border: 'rgba(16,183,125,0.28)',
    Icon: CheckCircle2,
  },
  warning: {
    label: 'Atencion',
    color: 'var(--brand-warn)',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.28)',
    Icon: AlertTriangle,
  },
  error: {
    label: 'Bloqueado',
    color: 'var(--brand-danger)',
    bg: 'rgba(239,63,63,0.12)',
    border: 'rgba(239,63,63,0.28)',
    Icon: XCircle,
  },
  skipped: {
    label: 'Omitido',
    color: 'var(--c-text-muted)',
    bg: 'var(--c-surface)',
    border: 'var(--c-border)',
    Icon: CircleHelp,
  },
  unknown: {
    label: 'Desconocido',
    color: 'var(--c-text-muted)',
    bg: 'var(--c-surface)',
    border: 'var(--c-border)',
    Icon: CircleHelp,
  },
};

function normalizeStatus(status?: string, ok?: boolean): NormalizedStatus {
  const raw = (status || '').toLowerCase();

  if (['ok', 'ready', 'pass', 'passed', 'healthy', 'success'].includes(raw)) return 'ok';
  if (['warn', 'warning', 'degraded', 'partial'].includes(raw)) return 'warning';
  if (['error', 'fail', 'failed', 'blocked', 'down', 'unready'].includes(raw)) return 'error';
  if (['skip', 'skipped', 'disabled'].includes(raw)) return 'skipped';

  if (ok === true) return 'ok';
  if (ok === false) return 'error';
  return 'unknown';
}

function redactSecrets(value?: string | null) {
  if (!value) return '';

  return value
    .replace(/\b((?:api[_\s-]?key|token|secret|password|authorization|bearer)\s*[:=]\s*)[^,\s;]+/gi, `$1${REDACTED}`)
    .replace(/\b(Bearer\s+)[A-Za-z0-9._-]+/gi, `$1${REDACTED}`)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{8,})\b/g, REDACTED);
}

function formatDate(iso?: string | null) {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return redactSecrets(iso);
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeChecks(checks: DiagnosticsReadinessResponse['checks']): DiagnosticsReadinessCheck[] {
  if (Array.isArray(checks)) return checks;
  if (!checks) return [];

  return Object.entries(checks).map(([key, check]) => ({
    id: check.id || key,
    ...check,
  }));
}

function uniqueMessages(messages: string[]) {
  return [...new Set(messages.map(redactSecrets).filter(Boolean))];
}

function checkTitle(check: DiagnosticsReadinessCheck, index: number) {
  return redactSecrets(check.label || check.name || check.id || check.key || `Check ${index + 1}`);
}

function checkMessage(check: DiagnosticsReadinessCheck) {
  return redactSecrets(check.warning || check.message || '');
}

function checkAction(check: DiagnosticsReadinessCheck) {
  return redactSecrets(check.action || check.remediation || '');
}

function StatusPill({ status }: { status: NormalizedStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
  color: string;
}) {
  return (
    <Card variant="glass" padding="normal">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl" style={{ background: `${color}18`, color }}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>
            {label}
          </p>
          <p className="mt-1 text-2xl font-black leading-none truncate" style={{ color: 'var(--c-text)' }}>
            {value}
          </p>
          {detail && (
            <p className="mt-1 text-xs truncate" style={{ color: 'var(--c-text-muted)' }}>
              {detail}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function MessagePanel({
  title,
  icon: Icon,
  messages,
  emptyText,
  color,
}: {
  title: string;
  icon: LucideIcon;
  messages: string[];
  emptyText: string;
  color: string;
}) {
  return (
    <Card variant="glass" padding="normal">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
          {title}
        </h3>
      </div>
      {messages.length > 0 ? (
        <ul className="space-y-2">
          {messages.map((message) => (
            <li
              key={message}
              className="rounded-lg px-3 py-2 text-sm leading-relaxed"
              style={{ background: 'var(--c-surface)', color: 'var(--c-text-2)' }}
            >
              {message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
          {emptyText}
        </p>
      )}
    </Card>
  );
}

export default function SystemReadinessView() {
  const [readiness, setReadiness] = useState<DiagnosticsReadinessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchReadiness = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await DiagnosticsService.getE2EReadiness();
      setReadiness(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el diagnostico.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadiness();
  }, [fetchReadiness]);

  const checks = useMemo(() => normalizeChecks(readiness?.checks), [readiness]);

  const computedStats = useMemo(() => {
    const stats = checks.reduce(
      (acc, check) => {
        acc[normalizeStatus(check.status, check.ok)] += 1;
        return acc;
      },
      { ok: 0, warning: 0, error: 0, skipped: 0, unknown: 0 } as Record<NormalizedStatus, number>
    );

    const summary = readiness?.summary;

    return {
      total: summary?.total ?? checks.length,
      ok: summary?.ok ?? summary?.passed ?? stats.ok,
      warning: summary?.warning ?? summary?.warnings ?? stats.warning,
      error: summary?.error ?? summary?.failed ?? stats.error,
      skipped: summary?.skipped ?? stats.skipped,
      unknown: stats.unknown,
    };
  }, [checks, readiness]);

  const overallStatus = useMemo<NormalizedStatus>(() => {
    const explicit = normalizeStatus(readiness?.status, readiness?.ok);
    if (explicit !== 'unknown') return explicit;
    if (computedStats.error > 0) return 'error';
    if (computedStats.warning > 0) return 'warning';
    if (computedStats.ok > 0 && computedStats.total === computedStats.ok) return 'ok';
    return 'unknown';
  }, [computedStats, readiness]);

  const warningMessages = useMemo(() => uniqueMessages([
    ...(readiness?.warnings || []),
    ...checks
      .filter((check) => normalizeStatus(check.status, check.ok) === 'warning' || !!check.warning)
      .map(checkMessage),
  ]), [checks, readiness]);

  const actionMessages = useMemo(() => uniqueMessages([
    ...(readiness?.actions || []),
    ...checks.map(checkAction),
  ]), [checks, readiness]);

  const overallMeta = statusMeta[overallStatus];
  const OverallIcon = overallMeta.Icon;
  const timestamp = readiness?.generatedAt || readiness?.updatedAt || lastUpdated;

  return (
    <>
      <Topbar
        title="Diagnostico del sistema"
        subtitle="Readiness E2E de backend, automatizacion e integraciones"
        actions={
          <Button
            variant="ghost"
            size="sm"
            loading={isLoading}
            onClick={() => void fetchReadiness()}
            leftIcon={<RefreshCw size={14} />}
          >
            Actualizar
          </Button>
        }
      />

      <div className="p-5 max-w-7xl mx-auto w-full flex flex-col gap-4">
        {error && (
          <Card variant="glass" padding="normal">
            <div className="flex items-start gap-3" style={{ color: 'var(--brand-danger)' }}>
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">No se pudo cargar el diagnostico.</p>
                <p className="text-sm mt-1" style={{ color: 'var(--c-text-muted)' }}>
                  {redactSecrets(error)}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            icon={OverallIcon}
            label="Estado E2E"
            value={overallMeta.label}
            detail={readiness?.environment ? redactSecrets(readiness.environment) : undefined}
            color={overallMeta.color}
          />
          <SummaryTile
            icon={ClipboardCheck}
            label="Checks"
            value={computedStats.total}
            detail={`${computedStats.ok} listos`}
            color="var(--brand-info)"
          />
          <SummaryTile
            icon={ShieldAlert}
            label="Advertencias"
            value={computedStats.warning}
            detail={computedStats.error > 0 ? `${computedStats.error} bloqueos` : 'Sin bloqueos activos'}
            color="var(--brand-warn)"
          />
          <SummaryTile
            icon={Wrench}
            label="Acciones"
            value={actionMessages.length}
            detail={timestamp ? `Rev. ${formatDate(timestamp)}` : 'Pendiente de lectura'}
            color="var(--brand-violet)"
          />
        </div>

        {isLoading && !readiness ? (
          <Card variant="glass" padding="lg">
            <div className="flex items-center gap-3" style={{ color: 'var(--c-text-muted)' }}>
              <RefreshCw size={18} className="animate-spin" />
              Cargando diagnostico de readiness...
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <Card
              variant="glass"
              padding="normal"
              title="Checks de readiness"
              subtitle="Estado operativo sin exponer credenciales ni valores sensibles."
              headerAction={<StatusPill status={overallStatus} />}
            >
              {checks.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--c-border-subtle)' }}>
                  {checks.map((check, index) => {
                    const status = normalizeStatus(check.status, check.ok);
                    const message = checkMessage(check);
                    const action = checkAction(check);

                    return (
                      <div
                        key={check.id || check.key || `${checkTitle(check, index)}-${index}`}
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold" style={{ color: 'var(--c-text)' }}>
                              {checkTitle(check, index)}
                            </p>
                            {message && (
                              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                                {message}
                              </p>
                            )}
                            {action && (
                              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
                                <span className="font-bold" style={{ color: 'var(--c-text)' }}>Accion:</span> {action}
                              </p>
                            )}
                            {check.checkedAt && (
                              <p className="text-xs mt-2" style={{ color: 'var(--c-text-muted)' }}>
                                Revisado {formatDate(check.checkedAt)}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <StatusPill status={status} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-3 py-10">
                  <ShieldCheck size={42} style={{ color: 'var(--c-text-muted)' }} />
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>
                      Sin checks reportados
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--c-text-muted)' }}>
                      El endpoint respondio, pero no incluyo una lista de checks.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex flex-col gap-4">
              <MessagePanel
                title="Advertencias"
                icon={AlertTriangle}
                messages={warningMessages}
                emptyText="No hay advertencias reportadas."
                color="var(--brand-warn)"
              />
              <MessagePanel
                title="Acciones recomendadas"
                icon={Wrench}
                messages={actionMessages}
                emptyText="No hay acciones pendientes reportadas."
                color="var(--brand-violet)"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
