import {
  FileText,
  Mail,
  MessageCircle,
  PlayCircle,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  getStatusIcon,
  getStatusLabel,
  type ReadinessItem,
  type ReadinessItemId,
} from './ReadinessChecklist';

const integrationIds: ReadinessItemId[] = [
  'whatsapp',
  'email',
  'pdfStorage',
  'n8n',
  'payments',
  'smartImport',
];

const integrationIcons: Partial<Record<ReadinessItemId, LucideIcon>> = {
  whatsapp: MessageCircle,
  email: Mail,
  pdfStorage: FileText,
  n8n: PlayCircle,
  payments: WalletCards,
  smartImport: Sparkles,
};

function statusTone(status: ReadinessItem['status']) {
  if (status === 'ok') return 'border-[rgba(16,183,125,0.24)] bg-[rgba(16,183,125,0.08)] text-[var(--brand-success)]';
  if (status === 'error') return 'border-[rgba(239,63,63,0.24)] bg-[rgba(239,63,63,0.08)] text-[var(--brand-danger)]';
  if (status === 'not_configured') return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
  if (status === 'unverified') return 'border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] text-[var(--brand-info)]';
  return 'border-[rgba(245,158,11,0.26)] bg-[rgba(245,158,11,0.08)] text-[var(--brand-warn-dark)]';
}

export function IntegrationStatusGrid({ items }: { items: ReadinessItem[] }) {
  const integrations = integrationIds
    .map(id => items.find(item => item.id === id))
    .filter((item): item is ReadinessItem => Boolean(item));

  return (
    <section className="space-y-3" aria-labelledby="integration-grid-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="integration-grid-title" className="text-lg font-bold text-[var(--c-text)]">
            Integraciones
          </h2>
          <p className="text-sm text-[var(--c-text-muted)]">
            Canales externos, automatizacion y capacidades con fallback visible.
          </p>
        </div>
        <p className="text-xs font-semibold text-[var(--c-text-muted)]">
          {integrations.length} capacidades monitoreadas
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_0.95fr_0.95fr]">
        {integrations.map((item, index) => {
          const Icon = integrationIcons[item.id] || Sparkles;
          const StatusIcon = getStatusIcon(item.status);

          return (
            <article
              key={item.id}
              className={`rounded-lg border border-[var(--c-border-subtle)] bg-[var(--c-surface-glass)] p-4 shadow-[var(--c-shadow-sm)] ${index === 0 ? 'xl:row-span-2' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border ${statusTone(item.status)}`}>
                    <Icon size={19} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-[var(--c-text)]">
                      {item.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--c-text-muted)]">
                      {item.sourceLabels.length > 0 ? item.sourceLabels.join(', ') : 'Sin fuente backend directa'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>
                  <StatusIcon size={12} aria-hidden="true" />
                  {getStatusLabel(item.status)}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[var(--c-text-2)]">
                {item.message}
              </p>

              <div className="mt-4 space-y-2">
                <div className="rounded-md bg-[var(--c-surface-raised)] px-3 py-2">
                  <p className="text-[11px] font-bold text-[var(--c-text-muted)]">Siguiente accion</p>
                  <p className="mt-1 text-sm text-[var(--c-text-2)]">{item.nextAction}</p>
                </div>
                <div className="rounded-md bg-[var(--c-surface-raised)] px-3 py-2">
                  <p className="text-[11px] font-bold text-[var(--c-text-muted)]">Fallback</p>
                  <p className="mt-1 text-sm text-[var(--c-text-2)]">{item.fallback}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
