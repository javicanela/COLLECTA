/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Database,
  FileText,
  Mail,
  MessageCircle,
  PlayCircle,
  Server,
  Sparkles,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import type { DiagnosticsReadinessCheck, DiagnosticsReadinessResponse } from '../../types';

const REDACTED = '[oculto]';

export type ReadinessItemStatus = 'ok' | 'warning' | 'error' | 'not_configured' | 'unverified';
export type ReadinessItemId =
  | 'database'
  | 'backend'
  | 'whatsapp'
  | 'email'
  | 'pdfStorage'
  | 'n8n'
  | 'payments'
  | 'smartImport';

export interface ReadinessItem {
  id: ReadinessItemId;
  label: string;
  shortLabel: string;
  status: ReadinessItemStatus;
  message: string;
  nextAction: string;
  fallback: string;
  checkedAt?: string;
  sourceLabels: string[];
}

export interface ReadinessSummary {
  total: number;
  ok: number;
  warning: number;
  error: number;
  notConfigured: number;
  unverified: number;
  blocking: number;
}

interface CapabilityDefinition {
  id: ReadinessItemId;
  label: string;
  shortLabel: string;
  sourceIds: string[];
  Icon: LucideIcon;
  defaultMessage: string;
  defaultAction: string;
  fallback: string;
  missingStatus: ReadinessItemStatus;
  missingMessage: string;
  missingAction: string;
}

const statusConfig: Record<ReadinessItemStatus, {
  label: string;
  className: string;
  Icon: LucideIcon;
}> = {
  ok: {
    label: 'OK',
    className: 'bg-[var(--brand-success-dim)] text-[var(--brand-success)] border-[rgba(16,183,125,0.28)]',
    Icon: CheckCircle2,
  },
  warning: {
    label: 'Warning',
    className: 'bg-[var(--brand-warn-dim)] text-[var(--brand-warn-dark)] border-[rgba(245,158,11,0.30)]',
    Icon: AlertTriangle,
  },
  error: {
    label: 'Error',
    className: 'bg-[var(--brand-danger-dim)] text-[var(--brand-danger)] border-[rgba(239,63,63,0.30)]',
    Icon: XCircle,
  },
  not_configured: {
    label: 'No configurado',
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10',
    Icon: CircleHelp,
  },
  unverified: {
    label: 'Sin verificar',
    className: 'bg-[var(--brand-info-dim)] text-[var(--brand-info)] border-[rgba(59,130,246,0.24)]',
    Icon: CircleHelp,
  },
};

const capabilityDefinitions: CapabilityDefinition[] = [
  {
    id: 'database',
    label: 'Base de datos',
    shortLabel: 'DB',
    sourceIds: ['database', 'db', 'postgres', 'neon'],
    Icon: Database,
    defaultMessage: 'La base de datos responde a la prueba de conectividad.',
    defaultAction: 'Mantener monitoreo de DATABASE_URL y disponibilidad de Neon/PostgreSQL.',
    fallback: 'Sin DB no hay fallback productivo: pausar commits de cobranza y restaurar conexion.',
    missingStatus: 'unverified',
    missingMessage: 'El diagnostico no incluyo una prueba de base de datos.',
    missingAction: 'Agregar o revisar el check database en diagnostics.',
  },
  {
    id: 'backend',
    label: 'Backend y rutas protegidas',
    shortLabel: 'Backend',
    sourceIds: ['auth', 'pendingCollections', 'whatsapp', 'sendStatement', 'paymentDetection', 'backend'],
    Icon: Server,
    defaultMessage: 'El endpoint protegido respondio y las rutas criticas registradas no reportan bloqueos.',
    defaultAction: 'Mantener auth, health liviano y rutas E2E bajo pruebas focalizadas.',
    fallback: 'Si una ruta falla, operar manualmente solo despues de confirmar datos en cartera.',
    missingStatus: 'ok',
    missingMessage: 'El endpoint de diagnostico protegido respondio.',
    missingAction: 'Revisar rutas individuales si el backend empieza a marcar errores.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp / Evolution',
    shortLabel: 'WhatsApp',
    sourceIds: ['evolution', 'evolutionApi', 'whatsapp', 'whatsappEvolution'],
    Icon: MessageCircle,
    defaultMessage: 'El canal de WhatsApp automatizado esta listo para pruebas de envio.',
    defaultAction: 'Validar instancia Evolution en ambiente seguro antes de activar automatizacion.',
    fallback: 'Fallback manual: abrir wa.me con mensaje prellenado desde la operacion.',
    missingStatus: 'not_configured',
    missingMessage: 'No hay senal de configuracion de WhatsApp/Evolution en diagnostics.',
    missingAction: 'Configurar Evolution API solo si no implica costo de servicio, o mantener wa.me manual.',
  },
  {
    id: 'email',
    label: 'Email',
    shortLabel: 'Email',
    sourceIds: ['email', 'emailDelivery', 'smtp', 'resend'],
    Icon: Mail,
    defaultMessage: 'El envio por email esta disponible para estados de cuenta.',
    defaultAction: 'Enviar una prueba controlada con Resend o SMTP antes de produccion.',
    fallback: 'Fallback: descargar PDF y enviarlo por el canal manual definido por el despacho.',
    missingStatus: 'not_configured',
    missingMessage: 'No hay senal de proveedor de email configurado.',
    missingAction: 'Configurar Resend o SMTP de prueba si email E2E es requerido.',
  },
  {
    id: 'pdfStorage',
    label: 'PDF / storage',
    shortLabel: 'PDF',
    sourceIds: ['pdfStorage', 'pdf', 'storage', 'fileStorage', 'documentStorage'],
    Icon: FileText,
    defaultMessage: 'La generacion y persistencia de PDF reportan una senal valida.',
    defaultAction: 'Generar un estado de cuenta de prueba y validar descarga/almacenamiento.',
    fallback: 'Fallback: generar PDF localmente y descargarlo sin persistirlo en storage remoto.',
    missingStatus: 'unverified',
    missingMessage: 'Diagnostics aun no reporta generacion de PDF ni storage.',
    missingAction: 'validar una descarga de estado de cuenta y agregar check PDF/storage cuando exista.',
  },
  {
    id: 'n8n',
    label: 'n8n',
    shortLabel: 'n8n',
    sourceIds: ['n8n', 'n8nWorkflows', 'pendingCollections', 'workflowExports'],
    Icon: PlayCircle,
    defaultMessage: 'Los workflows o rutas n8n requeridas estan presentes.',
    defaultAction: 'Ejecutar una prueba de workflow con datos controlados antes de automatizar cobranza.',
    fallback: 'Fallback: preparar cartera desde la vista de cobranza y ejecutar seguimiento manual.',
    missingStatus: 'unverified',
    missingMessage: 'No hay datos de workflows n8n en diagnostics.',
    missingAction: 'Restaurar exports n8n o agregar verificacion de workflows.',
  },
  {
    id: 'payments',
    label: 'Pagos',
    shortLabel: 'Pagos',
    sourceIds: ['paymentDetectionProvider', 'paymentDetection', 'payments', 'paymentProvider'],
    Icon: WalletCards,
    defaultMessage: 'La deteccion o integracion de pagos tiene una senal operativa.',
    defaultAction: 'Probar deteccion con un comprobante controlado y registrar resultado esperado.',
    fallback: 'Fallback: deteccion deterministica/manual y conciliacion por usuario antes de marcar pagado.',
    missingStatus: 'not_configured',
    missingMessage: 'No hay proveedor o ruta de pagos reportada.',
    missingAction: 'Configurar provider de prueba o mantener conciliacion manual.',
  },
  {
    id: 'smartImport',
    label: 'Smart Import',
    shortLabel: 'Import',
    sourceIds: ['smartImport', 'smartImportProvider', 'importParser', 'extract', 'documentExtraction'],
    Icon: Sparkles,
    defaultMessage: 'Smart Import reporta capacidad de parseo o proveedor disponible.',
    defaultAction: 'Probar un Excel/CSV caotico y revisar preview antes de commitear datos.',
    fallback: 'Fallback deterministico: parseo local en navegador, preview editable y commit con confirmacion.',
    missingStatus: 'unverified',
    missingMessage: 'Diagnostics no incluye aun senales de Smart Import.',
    missingAction: 'Agregar check de parseo local/provider cuando el backend lo exponga.',
  },
];

export function redactDiagnosticText(value?: string | null) {
  if (!value) return '';

  return value
    .replace(/\b((?:api[_\s-]?key|token|secret|password|authorization|bearer)\s*[:=]\s*)[^,\s;]+/gi, `$1${REDACTED}`)
    .replace(/\b(Bearer\s+)[A-Za-z0-9._-]+/gi, `$1${REDACTED}`)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{8,})\b/g, REDACTED);
}

export function formatDiagnosticDate(iso?: string | null) {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return redactDiagnosticText(iso);

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getReadinessSummary(items: ReadinessItem[]): ReadinessSummary {
  const summary = items.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    {
      ok: 0,
      warning: 0,
      error: 0,
      not_configured: 0,
      unverified: 0,
    } as Record<ReadinessItemStatus, number>,
  );

  return {
    total: items.length,
    ok: summary.ok,
    warning: summary.warning,
    error: summary.error,
    notConfigured: summary.not_configured,
    unverified: summary.unverified,
    blocking: summary.warning + summary.error + summary.not_configured + summary.unverified,
  };
}

export function getStatusLabel(status: ReadinessItemStatus) {
  return statusConfig[status].label;
}

export function getStatusIcon(status: ReadinessItemStatus) {
  return statusConfig[status].Icon;
}

function normalizeCheckList(checks: DiagnosticsReadinessResponse['checks']): DiagnosticsReadinessCheck[] {
  if (Array.isArray(checks)) return checks;
  if (!checks) return [];

  return Object.entries(checks).map(([key, check]) => ({
    id: check.id || key,
    ...check,
  }));
}

function checkIdentity(check: DiagnosticsReadinessCheck) {
  return (check.id || check.key || check.name || check.label || '').toLowerCase();
}

function checkText(check: DiagnosticsReadinessCheck) {
  return [
    check.id,
    check.key,
    check.name,
    check.label,
    check.status,
    check.message,
    check.warning,
    check.action,
    check.remediation,
  ].filter(Boolean).join(' ').toLowerCase();
}

function checkStatus(check: DiagnosticsReadinessCheck): ReadinessItemStatus {
  const text = checkText(check);
  const raw = (check.status || '').toLowerCase();

  if (
    text.includes('not fully configured') ||
    text.includes('not configured') ||
    text.includes('sin configurar') ||
    text.includes('no configurado') ||
    text.includes('no api key') ||
    text.includes('nokey')
  ) {
    return 'not_configured';
  }

  if (['ok', 'ready', 'pass', 'passed', 'healthy', 'success'].includes(raw)) return 'ok';
  if (['error', 'fail', 'failed', 'blocked', 'down', 'unready'].includes(raw)) return 'error';
  if (['warn', 'warning', 'degraded', 'partial'].includes(raw)) return 'warning';
  if (['skip', 'skipped', 'disabled'].includes(raw)) return 'not_configured';
  if (check.ok === true) return 'ok';
  if (check.ok === false) return 'error';

  return 'unverified';
}

function worstStatus(statuses: ReadinessItemStatus[]): ReadinessItemStatus {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('not_configured')) return 'not_configured';
  if (statuses.includes('warning')) return 'warning';
  if (statuses.includes('unverified')) return 'unverified';
  return 'ok';
}

function findChecks(checks: DiagnosticsReadinessCheck[], sourceIds: string[]) {
  const sourceSet = new Set(sourceIds.map(id => id.toLowerCase()));

  return checks.filter(check => sourceSet.has(checkIdentity(check)));
}

function firstText(checks: DiagnosticsReadinessCheck[], field: 'message' | 'warning' | 'action' | 'remediation') {
  const found = checks.find(check => Boolean(check[field]));
  return redactDiagnosticText(found?.[field]);
}

function readableCheckLabel(check: DiagnosticsReadinessCheck) {
  return redactDiagnosticText(check.label || check.name || check.id || check.key || 'check');
}

export function buildReadinessItems(readiness?: DiagnosticsReadinessResponse | null): ReadinessItem[] {
  const checks = normalizeCheckList(readiness?.checks);

  return capabilityDefinitions.map(definition => {
    const matches = findChecks(checks, definition.sourceIds);
    const statuses = matches.map(checkStatus);
    const status = matches.length > 0 ? worstStatus(statuses) : definition.missingStatus;
    const message = firstText(matches, 'warning') || firstText(matches, 'message') ||
      (matches.length > 0 ? definition.defaultMessage : definition.missingMessage);
    const nextAction = firstText(matches, 'action') || firstText(matches, 'remediation') ||
      (matches.length > 0 ? definition.defaultAction : definition.missingAction);
    const checkedAt = matches.find(check => check.checkedAt)?.checkedAt || readiness?.generatedAt || readiness?.updatedAt;

    return {
      id: definition.id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      status,
      message: redactDiagnosticText(message),
      nextAction: redactDiagnosticText(nextAction),
      fallback: redactDiagnosticText(definition.fallback),
      checkedAt,
      sourceLabels: matches.map(readableCheckLabel),
    };
  });
}

function StatusBadge({ status }: { status: ReadinessItemStatus }) {
  const meta = statusConfig[status];
  const Icon = meta.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      <Icon size={13} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function ItemIcon({ item }: { item: ReadinessItem }) {
  const definition = capabilityDefinitions.find(def => def.id === item.id);
  const Icon = definition?.Icon || ClipboardCheck;
  const StatusIcon = statusConfig[item.status].Icon;

  return (
    <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] text-[var(--c-text-2)]">
      <Icon size={20} aria-hidden="true" />
      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--c-surface)] bg-[var(--c-surface)]">
        <StatusIcon size={14} className={item.status === 'ok' ? 'text-[var(--brand-success)]' : item.status === 'error' ? 'text-[var(--brand-danger)]' : 'text-[var(--brand-warn-dark)]'} aria-hidden="true" />
      </span>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] px-3 py-2.5">
      <p className="text-[11px] font-bold text-[var(--c-text-muted)]">{title}</p>
      <div className="mt-1 text-sm leading-relaxed text-[var(--c-text-2)]">
        {children}
      </div>
    </div>
  );
}

function ChecklistSkeleton() {
  return (
    <Card variant="glass" padding="normal">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="skeleton h-5 w-56" />
          <div className="skeleton mt-2 h-3 w-72" />
        </div>
        <div className="skeleton h-8 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-[var(--c-border-subtle)] p-4">
            <div className="skeleton h-11 w-11 rounded-lg" />
            <div className="flex-1">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-3 h-3 w-4/5" />
              <div className="skeleton mt-2 h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ReadinessChecklist({
  items,
  isLoading = false,
}: {
  items: ReadinessItem[];
  isLoading?: boolean;
}) {
  const summary = getReadinessSummary(items);

  if (isLoading && items.length === 0) return <ChecklistSkeleton />;

  return (
    <Card
      variant="glass"
      padding="normal"
      title="Checklist accionable"
      subtitle="Readiness por capacidad, con siguiente accion y fallback operativo."
      headerAction={<StatusBadge status={summary.error > 0 ? 'error' : summary.blocking > 0 ? 'warning' : 'ok'} />}
    >
      {items.length === 0 ? (
        <div className="empty-state">
          <ClipboardCheck className="empty-state-icon" aria-hidden="true" />
          <h3 className="empty-state-title">Sin checks para mostrar</h3>
          <p className="empty-state-description">Actualiza el diagnostico para construir el checklist operativo.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--c-border-subtle)]">
          {items.map(item => (
            <article key={item.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex min-w-0 flex-1 gap-3">
                  <ItemIcon item={item} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--c-text)]">{item.label}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-2)]">
                      {item.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--c-text-muted)]">
                      {item.checkedAt && <span>Rev. {formatDiagnosticDate(item.checkedAt)}</span>}
                      {item.sourceLabels.length > 0 && (
                        <span>Fuente: {item.sourceLabels.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 lg:w-[360px]">
                  <DetailBlock title="Siguiente accion">
                    {item.nextAction}
                  </DetailBlock>
                  <DetailBlock title="Fallback">
                    {item.fallback}
                  </DetailBlock>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

export { statusConfig as readinessStatusConfig };
