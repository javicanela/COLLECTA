import { X } from 'lucide-react';
import { auditOutcomeMeta, auditTypeMeta } from './AuditTimeline';
import type { AuditEvent } from './AuditTimeline';

interface AuditEventDrawerProps {
  event: AuditEvent | null;
  onClose: () => void;
}

export function AuditEventDrawer({ event, onClose }: AuditEventDrawerProps) {
  if (!event) return null;

  const typeMeta = auditTypeMeta[event.type];
  const outcomeMeta = auditOutcomeMeta[event.outcome];
  const TypeIcon = typeMeta.icon;
  const OutcomeIcon = outcomeMeta.icon;

  return (
    <div className="fixed inset-0 z-modal flex bg-[var(--c-overlay)] backdrop-blur-sm" role="presentation">
      <button
        type="button"
        aria-label="Cerrar detalle"
        className="hidden flex-1 cursor-default sm:block"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-event-drawer-title"
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[var(--c-border)] bg-[var(--c-surface)] shadow-[var(--c-shadow-lg)]"
      >
        <header className="border-b border-[var(--c-border-subtle)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${typeMeta.toneClass}`}>
                  <TypeIcon size={14} />
                  {typeMeta.label}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${outcomeMeta.toneClass}`}>
                  <OutcomeIcon size={14} />
                  {event.outcomeLabel}
                </span>
              </div>
              <h2 id="audit-event-drawer-title" className="text-lg font-semibold text-[var(--c-text)]">
                Detalle del evento
              </h2>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">{event.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel"
              className="btn btn-ghost btn-icon flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Contexto</p>
            <p className="mt-2 text-sm font-semibold text-[var(--c-text)]">{event.clientName}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <InfoPill label="RFC" value={event.clientRfc} mono />
              <InfoPill label="Canal" value={event.channelLabel} />
              <InfoPill label="Telefono" value={event.phoneLabel} mono />
              <InfoPill label="Fecha" value={`${event.dateLabel} ${event.timeLabel}`} mono />
            </div>
          </section>

          {event.message && (
            <section className="mt-4 rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Mensaje</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--c-text-2)]">{event.message}</p>
            </section>
          )}

          <section className="mt-4 overflow-hidden rounded-md border border-[var(--c-border-subtle)]">
            <div className="border-b border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-4 py-3">
              <p className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">Campos de auditoria</p>
            </div>
            <dl className="divide-y divide-[var(--c-border-subtle)]">
              {event.detailRows.map(([label, value]) => (
                <div key={`${label}-${value}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <dt className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">{label}</dt>
                  <dd className="break-words text-sm text-[var(--c-text)]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}

function InfoPill({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-[var(--c-text-muted)]">{label}</p>
      <p className={`mt-1 truncate text-sm text-[var(--c-text)] ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  );
}
