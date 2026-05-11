import { CalendarDays, FilterX, Search } from 'lucide-react';
import { auditOutcomeMeta, auditTypeMeta } from './AuditTimeline';
import type { AuditEventType, AuditOutcome } from './AuditTimeline';

export interface AuditFiltersState {
  type: AuditEventType | 'all';
  outcome: AuditOutcome | 'all';
  query: string;
  from: string;
  to: string;
}

interface AuditFiltersProps {
  filters: AuditFiltersState;
  resultCount: number;
  totalCount: number;
  onChange: (filters: AuditFiltersState) => void;
  onReset: () => void;
}

const typeOptions: Array<{ value: AuditEventType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'WHATSAPP', label: auditTypeMeta.WHATSAPP.label },
  { value: 'EMAIL', label: auditTypeMeta.EMAIL.label },
  { value: 'PAYMENT_DETECTION', label: auditTypeMeta.PAYMENT_DETECTION.label },
  { value: 'AGENT', label: auditTypeMeta.AGENT.label },
  { value: 'IMPORT', label: auditTypeMeta.IMPORT.label },
  { value: 'ERROR', label: auditTypeMeta.ERROR.label },
];

const outcomeOptions: Array<{ value: AuditOutcome | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los resultados' },
  { value: 'SUCCESS', label: auditOutcomeMeta.SUCCESS.label },
  { value: 'WARNING', label: auditOutcomeMeta.WARNING.label },
  { value: 'ERROR', label: auditOutcomeMeta.ERROR.label },
  { value: 'INFO', label: auditOutcomeMeta.INFO.label },
];

export function AuditFilters({ filters, resultCount, totalCount, onChange, onReset }: AuditFiltersProps) {
  const hasFilters = filters.type !== 'all' || filters.outcome !== 'all' || Boolean(filters.query || filters.from || filters.to);

  const update = (patch: Partial<AuditFiltersState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <section
      aria-label="Filtros de auditoria"
      className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-4 shadow-[var(--c-shadow-sm)]"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,0.8fr)_minmax(160px,0.8fr)_minmax(130px,0.6fr)_minmax(130px,0.6fr)_auto] lg:items-end">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Cliente o texto</span>
          <span className="flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[var(--c-surface-raised)] px-3 py-2">
            <Search size={15} className="text-[var(--c-text-muted)]" />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              placeholder="Buscar cliente, RFC, mensaje o canal"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text-muted)]"
            />
          </span>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Tipo</span>
          <select
            value={filters.type}
            onChange={(event) => update({ type: event.target.value as AuditFiltersState['type'] })}
            className="input-base h-10 rounded-md border border-[var(--c-border)] bg-[var(--c-surface-raised)] px-3 text-sm"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Resultado</span>
          <select
            value={filters.outcome}
            onChange={(event) => update({ outcome: event.target.value as AuditFiltersState['outcome'] })}
            className="input-base h-10 rounded-md border border-[var(--c-border)] bg-[var(--c-surface-raised)] px-3 text-sm"
          >
            {outcomeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Desde</span>
          <span className="flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[var(--c-surface-raised)] px-3 py-2">
            <CalendarDays size={14} className="text-[var(--c-text-muted)]" />
            <input
              type="date"
              value={filters.from}
              onChange={(event) => update({ from: event.target.value })}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--c-text)] outline-none"
            />
          </span>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Hasta</span>
          <span className="flex items-center gap-2 rounded-md border border-[var(--c-border)] bg-[var(--c-surface-raised)] px-3 py-2">
            <CalendarDays size={14} className="text-[var(--c-text-muted)]" />
            <input
              type="date"
              value={filters.to}
              onChange={(event) => update({ to: event.target.value })}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--c-text)] outline-none"
            />
          </span>
        </label>

        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
          <span className="whitespace-nowrap font-mono text-xs text-[var(--c-text-muted)]">
            {resultCount} de {totalCount}
          </span>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={onReset}>
              <FilterX size={14} />
              Limpiar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
