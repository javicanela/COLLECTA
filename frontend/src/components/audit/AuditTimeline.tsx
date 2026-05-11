/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type { LogEntry } from '../../types';
import type { AuditFiltersState } from './AuditFilters';

export type AuditEventType = 'WHATSAPP' | 'EMAIL' | 'PAYMENT_DETECTION' | 'AGENT' | 'IMPORT' | 'ERROR';
export type AuditOutcome = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

type DetailRow = [label: string, value: string];

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  title: string;
  summary: string;
  message: string;
  rawType: string;
  rawResult: string;
  rawVariant: string | null;
  outcome: AuditOutcome;
  outcomeLabel: string;
  clientName: string;
  clientRfc: string;
  channelLabel: string;
  phoneLabel: string;
  modeLabel: string;
  createdAt?: string;
  dateLabel: string;
  timeLabel: string;
  dateGroup: string;
  detailRows: DetailRow[];
  searchText: string;
  source: LogEntry;
}

interface AuditTimelineProps {
  events: AuditEvent[];
  loading: boolean;
  error: string | null;
  onSelect: (event: AuditEvent) => void;
  onRetry: () => void;
}

interface EventTypeMeta {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  toneClass: string;
}

interface OutcomeMeta {
  label: string;
  toneClass: string;
  icon: LucideIcon;
}

export const auditTypeMeta: Record<AuditEventType, EventTypeMeta> = {
  WHATSAPP: {
    label: 'WhatsApp',
    shortLabel: 'WA',
    icon: MessageCircle,
    toneClass: 'text-[var(--brand-success)] bg-[var(--brand-success-dim)] border-[var(--brand-success)]/25',
  },
  EMAIL: {
    label: 'Email',
    shortLabel: 'Mail',
    icon: Mail,
    toneClass: 'text-[var(--brand-info)] bg-[var(--brand-info-dim)] border-[var(--brand-info)]/25',
  },
  PAYMENT_DETECTION: {
    label: 'Pago',
    shortLabel: 'Pago',
    icon: CheckCircle2,
    toneClass: 'text-[var(--brand-gold)] bg-[var(--brand-gold-dim)] border-[var(--brand-gold)]/25',
  },
  AGENT: {
    label: 'Agente',
    shortLabel: 'AI',
    icon: Bot,
    toneClass: 'text-[var(--brand-primary)] bg-[var(--brand-primary-dim)] border-[var(--brand-primary)]/25',
  },
  IMPORT: {
    label: 'Importacion',
    shortLabel: 'Import',
    icon: FileSpreadsheet,
    toneClass: 'text-[var(--brand-warn-dark)] bg-[var(--brand-warn-dim)] border-[var(--brand-warn)]/25',
  },
  ERROR: {
    label: 'Error',
    shortLabel: 'Error',
    icon: ShieldAlert,
    toneClass: 'text-[var(--brand-danger)] bg-[var(--brand-danger-dim)] border-[var(--brand-danger)]/25',
  },
};

export const auditOutcomeMeta: Record<AuditOutcome, OutcomeMeta> = {
  SUCCESS: {
    label: 'Exitoso',
    toneClass: 'text-[var(--brand-success)] bg-[var(--brand-success-dim)] border-[var(--brand-success)]/25',
    icon: CheckCircle2,
  },
  WARNING: {
    label: 'Revision',
    toneClass: 'text-[var(--brand-warn-dark)] bg-[var(--brand-warn-dim)] border-[var(--brand-warn)]/25',
    icon: AlertTriangle,
  },
  ERROR: {
    label: 'Error',
    toneClass: 'text-[var(--brand-danger)] bg-[var(--brand-danger-dim)] border-[var(--brand-danger)]/25',
    icon: AlertCircle,
  },
  INFO: {
    label: 'Info',
    toneClass: 'text-[var(--brand-gray)] bg-[var(--brand-gray-dim)] border-[var(--brand-gray)]/25',
    icon: Clock3,
  },
};

const outcomeByResult: Record<string, AuditOutcome> = {
  ENVIADO: 'SUCCESS',
  SENT: 'SUCCESS',
  ACCEPTED: 'SUCCESS',
  APPROVED: 'SUCCESS',
  MANUALLY_CONFIRMED: 'SUCCESS',
  COMPLETED: 'SUCCESS',
  RECIBIDO: 'SUCCESS',
  RECEIVED: 'SUCCESS',
  SUCCESS: 'SUCCESS',
  OK: 'SUCCESS',
  BLOQUEADO: 'WARNING',
  BLOCKED: 'WARNING',
  REVIEW_REQUIRED: 'WARNING',
  DUPLICATE: 'WARNING',
  FALLBACK: 'WARNING',
  MANUAL_FALLBACK: 'WARNING',
  CANCELLED: 'WARNING',
  PAUSED: 'WARNING',
  PENDING: 'WARNING',
  ERROR: 'ERROR',
  FAILED: 'ERROR',
  FAIL: 'ERROR',
  REJECTED: 'ERROR',
};

const resultLabels: Record<string, string> = {
  ENVIADO: 'Enviado',
  BLOQUEADO: 'Bloqueado',
  ERROR: 'Error',
  ACCEPTED: 'Pago aceptado',
  REVIEW_REQUIRED: 'Revision requerida',
  DUPLICATE: 'Duplicado',
  APPROVED: 'Aprobado',
  MANUALLY_CONFIRMED: 'Confirmado manual',
  COMPLETED: 'Completado',
  FALLBACK: 'Fallback manual',
  RECIBIDO: 'Recibido',
};

const titleByType: Record<AuditEventType, string> = {
  WHATSAPP: 'Actividad WhatsApp',
  EMAIL: 'Actividad email',
  PAYMENT_DETECTION: 'Deteccion de pago',
  AGENT: 'Decision del agente',
  IMPORT: 'Importacion de datos',
  ERROR: 'Evento con error',
};

export function maskAuditPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return 'No capturado';

  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'No capturado';
  if (digits.length <= 4) return '****';

  const countryDigits = digits.length > 10 ? digits.length - 10 : 0;
  const prefix = countryDigits > 0 ? `+${digits.slice(0, countryDigits)}` : '';
  const lastFour = digits.slice(-4);

  return `${prefix ? `${prefix} ` : ''}******${lastFour}`;
}

export function redactAuditText(text: string | null | undefined, phone?: string | null): string {
  if (!text) return '';

  let redacted = text;
  const maskedPhone = maskAuditPhone(phone);
  const phoneDigits = phone?.replace(/\D/g, '');

  if (phone?.trim()) {
    redacted = redacted.split(phone.trim()).join(maskedPhone);
  }

  if (phoneDigits && phoneDigits.length >= 8) {
    redacted = redacted.split(phoneDigits).join(maskedPhone);
  }

  redacted = redacted.replace(
    /([A-Z0-9._%+-])[A-Z0-9._%+-]*(@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
    '$1***$2',
  );

  return redacted;
}

export function normalizeAuditEvents(logs: LogEntry[]): AuditEvent[] {
  return logs.map(normalizeAuditEvent);
}

export function normalizeAuditEvent(log: LogEntry): AuditEvent {
  const rawType = normalizeRaw(log.tipo, 'UNKNOWN');
  const rawResult = normalizeRaw(log.resultado, 'SIN_RESULTADO');
  const rawVariant = log.variante?.trim() || null;
  const type = classifyAuditEvent(log);
  const outcome = classifyOutcome(rawResult);
  const sanitizedMessage = redactAuditText(log.mensaje, log.telefono);
  const clientName = log.client?.nombre?.trim() || 'Sin cliente asociado';
  const clientRfc = log.client?.rfc?.trim() || 'Sin RFC';
  const channelLabel = channelFromEvent(type, rawType, rawVariant);
  const phoneLabel = maskAuditPhone(log.telefono);
  const dateParts = formatDateParts(log.createdAt);
  const parsedDetails = parseMessageDetails(sanitizedMessage);
  const title = buildEventTitle(type, rawResult);
  const summary = buildEventSummary(clientName, clientRfc, sanitizedMessage);

  const detailRows = [
    ['ID', log.id],
    ['Tipo original', rawType],
    rawVariant ? ['Variante', rawVariant] : null,
    ['Resultado', resultLabels[rawResult] || rawResult],
    ['Modo', log.modo || 'No capturado'],
    ['Cliente', clientName],
    ['RFC', clientRfc],
    ['Canal', channelLabel],
    ['Telefono', phoneLabel],
    ...parsedDetails,
  ].filter((row): row is DetailRow => Boolean(row));

  return {
    id: log.id,
    type,
    title,
    summary,
    message: sanitizedMessage,
    rawType,
    rawResult,
    rawVariant,
    outcome,
    outcomeLabel: resultLabels[rawResult] || auditOutcomeMeta[outcome].label,
    clientName,
    clientRfc,
    channelLabel,
    phoneLabel,
    modeLabel: log.modo || 'No capturado',
    createdAt: log.createdAt,
    dateLabel: dateParts.dateLabel,
    timeLabel: dateParts.timeLabel,
    dateGroup: dateParts.dateGroup,
    detailRows,
    searchText: [
      rawType,
      rawVariant,
      rawResult,
      log.mensaje,
      log.telefono,
      clientName,
      clientRfc,
      channelLabel,
      phoneLabel,
    ].filter(Boolean).join(' '),
    source: log,
  };
}

export function filterAuditEvents(events: AuditEvent[], filters: AuditFiltersState): AuditEvent[] {
  const query = filters.query.trim().toLowerCase();
  const from = parseDateBoundary(filters.from, false);
  const to = parseDateBoundary(filters.to, true);

  return events.filter((event) => {
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (filters.outcome !== 'all' && event.outcome !== filters.outcome) return false;
    if (query && !event.searchText.toLowerCase().includes(query)) return false;

    if (from || to) {
      const eventTime = event.createdAt ? new Date(event.createdAt).getTime() : Number.NaN;
      if (Number.isNaN(eventTime)) return false;
      if (from && eventTime < from.getTime()) return false;
      if (to && eventTime > to.getTime()) return false;
    }

    return true;
  });
}

export function AuditTimeline({ events, loading, error, onSelect, onRetry }: AuditTimelineProps) {
  if (loading) {
    return (
      <StateShell
        icon={<Loader2 size={20} className="animate-spin" />}
        title="Cargando auditoria"
        description="Recuperando eventos recientes y preparando la linea de tiempo."
      >
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] skeleton"
            />
          ))}
        </div>
      </StateShell>
    );
  }

  if (error) {
    return (
      <StateShell
        icon={<AlertCircle size={20} />}
        title={error}
        description="La auditoria no pudo cargarse. Reintenta sin perder los filtros actuales."
        tone="error"
        action={(
          <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={onRetry}>
            <RefreshCw size={14} />
            Reintentar
          </button>
        )}
      />
    );
  }

  if (events.length === 0) {
    return (
      <StateShell
        icon={<Inbox size={20} />}
        title="Sin eventos para mostrar"
        description="Ajusta los filtros o espera nuevas acciones de cobranza, pagos, importaciones o agente."
      />
    );
  }

  const groups = groupEventsByDate(events);

  return (
    <section aria-label="Linea de tiempo de auditoria" className="space-y-6">
      {groups.map((group) => (
        <div key={group.dateGroup} className="grid gap-3 md:grid-cols-[168px_minmax(0,1fr)]">
          <div className="text-xs font-semibold uppercase text-[var(--c-text-muted)] md:pt-3">
            {group.dateGroup}
          </div>
          <div className="relative space-y-3 border-l border-[var(--c-border-subtle)] pl-4">
            {group.events.map((event) => (
              <TimelineEvent key={event.id} event={event} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function TimelineEvent({ event, onSelect }: { event: AuditEvent; onSelect: (event: AuditEvent) => void }) {
  const typeMeta = auditTypeMeta[event.type];
  const outcomeMeta = auditOutcomeMeta[event.outcome];
  const TypeIcon = typeMeta.icon;
  const OutcomeIcon = outcomeMeta.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="group relative w-full rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-4 text-left shadow-[var(--c-shadow-sm)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--c-border)] hover:shadow-[var(--c-shadow)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
    >
      <span
        aria-hidden="true"
        className={`absolute -left-[23px] top-5 flex h-10 w-10 items-center justify-center rounded-md border ${typeMeta.toneClass}`}
      >
        <TypeIcon size={18} />
      </span>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${typeMeta.toneClass}`}>
              {typeMeta.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${outcomeMeta.toneClass}`}>
              <OutcomeIcon size={12} />
              {event.outcomeLabel}
            </span>
            <span className="font-mono text-xs text-[var(--c-text-muted)]">{event.timeLabel}</span>
          </div>

          <h3 className="text-sm font-semibold text-[var(--c-text)]">{event.title}</h3>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">{event.summary}</p>
          {event.message && (
            <p className="mt-2 line-clamp-2 text-xs text-[var(--c-text-muted)]">{event.message}</p>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          <MetadataPill label={event.channelLabel} />
          {event.phoneLabel !== 'No capturado' && <MetadataPill label={event.phoneLabel} mono />}
          <ChevronRight
            aria-hidden="true"
            size={16}
            className="text-[var(--c-text-muted)] transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </button>
  );
}

function MetadataPill({ label, mono = false }: { label: string; mono?: boolean }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-2 py-1 text-xs text-[var(--c-text-2)] ${mono ? 'font-mono' : 'font-medium'}`}>
      {label}
    </span>
  );
}

function StateShell({
  icon,
  title,
  description,
  action,
  tone = 'default',
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: 'default' | 'error';
  children?: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-6 shadow-[var(--c-shadow-sm)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border ${
              tone === 'error'
                ? 'border-[var(--brand-danger)]/25 bg-[var(--brand-danger-dim)] text-[var(--brand-danger)]'
                : 'border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] text-[var(--c-text-2)]'
            }`}
          >
            {icon}
          </span>
          <div>
            <p className="font-semibold text-[var(--c-text)]">{title}</p>
            <p className="mt-1 max-w-2xl text-sm text-[var(--c-text-2)]">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function classifyAuditEvent(log: LogEntry): AuditEventType {
  const rawType = normalizeRaw(log.tipo, 'UNKNOWN');
  const rawVariant = normalizeRaw(log.variante || '', '');
  const rawResult = normalizeRaw(log.resultado, '');
  const haystack = `${rawType} ${rawVariant} ${rawResult} ${log.mensaje || ''}`.toUpperCase();

  if (haystack.includes('PAYMENT_DETECTION') || haystack.includes('PAYMENT_CONFIRMED')) return 'PAYMENT_DETECTION';
  if (rawType.includes('EMAIL')) return 'EMAIL';
  if (rawType.includes('AGENT')) return 'AGENT';
  if (rawType.includes('IMPORT')) return 'IMPORT';
  if (
    rawType.includes('WHATSAPP') ||
    rawType === 'WA' ||
    rawType === 'INCOMING' ||
    rawType.includes('STATEMENT_DELIVERY') ||
    rawVariant.includes('MANUAL_FALLBACK')
  ) {
    return 'WHATSAPP';
  }
  if (rawType.includes('ERROR') || rawResult.includes('ERROR') || rawResult.includes('FAILED')) return 'ERROR';

  return 'ERROR';
}

function classifyOutcome(rawResult: string): AuditOutcome {
  const normalized = normalizeRaw(rawResult, 'SIN_RESULTADO');
  const direct = outcomeByResult[normalized];
  if (direct) return direct;
  if (normalized.includes('ERROR') || normalized.includes('FAILED') || normalized.includes('FAIL')) return 'ERROR';
  if (normalized.includes('REVIEW') || normalized.includes('BLOCK') || normalized.includes('FALLBACK')) return 'WARNING';
  if (normalized.includes('APPROVED') || normalized.includes('ACCEPTED') || normalized.includes('SENT')) return 'SUCCESS';
  return 'INFO';
}

function buildEventTitle(type: AuditEventType, rawResult: string): string {
  if (type === 'PAYMENT_DETECTION') {
    if (rawResult === 'REVIEW_REQUIRED') return 'Pago por revisar';
    if (rawResult === 'ACCEPTED') return 'Pago detectado';
    if (rawResult === 'DUPLICATE') return 'Pago duplicado';
  }

  if (type === 'WHATSAPP') {
    if (rawResult === 'ENVIADO') return 'WhatsApp enviado';
    if (rawResult === 'BLOQUEADO') return 'WhatsApp bloqueado';
    if (rawResult === 'ERROR') return 'WhatsApp con error';
    if (rawResult === 'FALLBACK') return 'Fallback WhatsApp';
  }

  if (type === 'EMAIL') {
    if (rawResult === 'ENVIADO') return 'Email enviado';
    if (rawResult === 'ERROR') return 'Email con error';
  }

  if (type === 'AGENT' && rawResult === 'APPROVED') return 'Accion aprobada';
  if (type === 'IMPORT' && rawResult === 'COMPLETED') return 'Importacion completada';

  return titleByType[type];
}

function buildEventSummary(clientName: string, clientRfc: string, message: string): string {
  if (clientName !== 'Sin cliente asociado') {
    return clientRfc !== 'Sin RFC' ? `${clientName} (${clientRfc})` : clientName;
  }

  if (message) return truncate(message, 110);
  return 'Evento sin cliente asociado';
}

function channelFromEvent(type: AuditEventType, rawType: string, rawVariant: string | null): string {
  if (type === 'WHATSAPP') return rawVariant === 'MANUAL_FALLBACK' ? 'WhatsApp manual' : 'WhatsApp';
  if (type === 'EMAIL') return 'Email';
  if (type === 'PAYMENT_DETECTION') return 'Detector de pagos';
  if (type === 'AGENT') return 'Agente';
  if (type === 'IMPORT') return rawType.includes('SMART') ? 'Smart Import' : 'Importacion';
  return 'Sistema';
}

function parseMessageDetails(message: string): DetailRow[] {
  if (!message) return [];

  const rows = message
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): DetailRow => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return ['Mensaje', part];

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      return [labelForMessageKey(key), value || 'No capturado'];
    });

  return rows.length > 0 ? rows : [['Mensaje', message]];
}

function labelForMessageKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  const labels: Record<string, string> = {
    fingerprint: 'Fingerprint',
    confidence_source: 'Fuente',
    confidence_reasons: 'Motivos',
    operationid: 'Operacion',
    operation_id: 'Operacion',
  };

  return labels[normalized] || normalized.replace(/_/g, ' ');
}

function formatDateParts(iso: string | undefined) {
  if (!iso) {
    return {
      dateLabel: 'Sin fecha',
      timeLabel: '--:--',
      dateGroup: 'Sin fecha',
    };
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return {
      dateLabel: iso,
      timeLabel: '--:--',
      dateGroup: 'Fecha invalida',
    };
  }

  return {
    dateLabel: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeLabel: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    dateGroup: date.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
  };
}

function groupEventsByDate(events: AuditEvent[]) {
  const groups = new Map<string, AuditEvent[]>();

  for (const event of events) {
    groups.set(event.dateGroup, [...(groups.get(event.dateGroup) || []), event]);
  }

  return [...groups.entries()].map(([dateGroup, groupedEvents]) => ({
    dateGroup,
    events: groupedEvents,
  }));
}

function parseDateBoundary(date: string, endOfDay: boolean): Date | null {
  if (!date) return null;
  const parsed = new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeRaw(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : fallback;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
