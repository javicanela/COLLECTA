import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import Topbar from '../components/Topbar';
import { LogService } from '../services/logService';
import type { LogEntry } from '../types';
import { AuditEventDrawer } from '../components/audit/AuditEventDrawer';
import { AuditFilters, type AuditFiltersState } from '../components/audit/AuditFilters';
import {
  AuditTimeline,
  auditOutcomeMeta,
  auditTypeMeta,
  filterAuditEvents,
  normalizeAuditEvents,
} from '../components/audit/AuditTimeline';
import type { AuditEvent, AuditEventType, AuditOutcome } from '../components/audit/AuditTimeline';

const defaultFilters: AuditFiltersState = {
  type: 'all',
  outcome: 'all',
  query: '',
  from: '',
  to: '',
};

const typeOrder: AuditEventType[] = ['WHATSAPP', 'EMAIL', 'PAYMENT_DETECTION', 'AGENT', 'IMPORT', 'ERROR'];

export default function LogView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFiltersState>(defaultFilters);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextLogs = await LogService.getAll();
      setLogs(Array.isArray(nextLogs) ? nextLogs : []);
    } catch {
      setError('No se pudo cargar la auditoria');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextLogs = await LogService.getAll();
        if (active) setLogs(Array.isArray(nextLogs) ? nextLogs : []);
      } catch {
        if (active) setError('No se pudo cargar la auditoria');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const events = useMemo(() => normalizeAuditEvents(logs), [logs]);
  const filteredEvents = useMemo(() => filterAuditEvents(events, filters), [events, filters]);
  const metrics = useMemo(() => buildAuditMetrics(events), [events]);
  const timelineError = error && events.length === 0 ? error : null;

  return (
    <>
      <Topbar
        title="Auditoria operativa"
        subtitle="Linea de tiempo de comunicaciones, pagos, agente e importaciones"
        actions={(
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="btn btn-ghost btn-sm gap-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        )}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-5">
        <section className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-5 shadow-[var(--c-shadow-sm)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Eventos auditados</p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="font-mono text-3xl font-semibold leading-none text-[var(--c-text)]">{events.length}</span>
                  <span className="pb-1 text-sm text-[var(--c-text-2)]">
                    {filteredEvents.length === events.length ? 'visibles' : `${filteredEvents.length} filtrados`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <MetricPill
                  label={auditOutcomeMeta.SUCCESS.label}
                  value={metrics.outcomes.SUCCESS}
                  toneClass={auditOutcomeMeta.SUCCESS.toneClass}
                />
                <MetricPill
                  label={auditOutcomeMeta.WARNING.label}
                  value={metrics.outcomes.WARNING}
                  toneClass={auditOutcomeMeta.WARNING.toneClass}
                />
                <MetricPill
                  label={auditOutcomeMeta.ERROR.label}
                  value={metrics.outcomes.ERROR}
                  toneClass={auditOutcomeMeta.ERROR.toneClass}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {typeOrder.map((type) => (
                <TypeMetric key={type} type={type} value={metrics.types[type]} />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-5 shadow-[var(--c-shadow-sm)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-[var(--brand-primary)]/25 bg-[var(--brand-primary-dim)] text-[var(--brand-primary)]">
                <ShieldCheck size={19} />
              </span>
              <div>
                <p className="font-semibold text-[var(--c-text)]">Auditoria legible</p>
                <p className="mt-1 text-sm text-[var(--c-text-2)]">
                  Los eventos se normalizan en seis categorias operativas y los telefonos se muestran parcialmente enmascarados.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] p-3">
              <Clock3 size={16} className="text-[var(--c-text-muted)]" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Ultimo evento</p>
                <p className="truncate text-sm text-[var(--c-text)]">
                  {events[0] ? `${events[0].dateLabel} ${events[0].timeLabel} - ${events[0].title}` : 'Sin actividad registrada'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <AuditFilters
          filters={filters}
          resultCount={filteredEvents.length}
          totalCount={events.length}
          onChange={setFilters}
          onReset={() => setFilters(defaultFilters)}
        />

        {error && events.length > 0 && (
          <div role="alert" className="flex items-start gap-3 rounded-md border border-[var(--brand-warn)]/25 bg-[var(--brand-warn-dim)] p-4 text-[var(--brand-warn-dark)]">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">No se pudo actualizar la auditoria</p>
              <p className="mt-1 text-sm">Se conserva la informacion que ya estaba cargada en pantalla.</p>
            </div>
          </div>
        )}

        <AuditTimeline
          events={filteredEvents}
          loading={isLoading && events.length === 0}
          error={timelineError}
          onSelect={setSelectedEvent}
          onRetry={fetchLogs}
        />
      </main>

      <AuditEventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}

function buildAuditMetrics(events: AuditEvent[]) {
  const types = typeOrder.reduce<Record<AuditEventType, number>>((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {
    WHATSAPP: 0,
    EMAIL: 0,
    PAYMENT_DETECTION: 0,
    AGENT: 0,
    IMPORT: 0,
    ERROR: 0,
  });

  const outcomes: Record<AuditOutcome, number> = {
    SUCCESS: 0,
    WARNING: 0,
    ERROR: 0,
    INFO: 0,
  };

  for (const event of events) {
    types[event.type] += 1;
    outcomes[event.outcome] += 1;
  }

  return { types, outcomes };
}

function MetricPill({ label, value, toneClass }: { label: string; value: number; toneClass: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${toneClass}`}>
      <span className="font-mono text-sm">{value}</span>
      {label}
    </span>
  );
}

function TypeMetric({ type, value }: { type: AuditEventType; value: number }) {
  const meta = auditTypeMeta[type];
  const Icon = meta.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border ${meta.toneClass}`}>
          <Icon size={15} />
        </span>
        <span className="truncate text-sm font-medium text-[var(--c-text)]">{meta.label}</span>
      </span>
      <span className="font-mono text-sm font-semibold text-[var(--c-text)]">{value}</span>
    </div>
  );
}
