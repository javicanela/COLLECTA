/* eslint-disable react-refresh/only-export-components -- Agent domain helpers stay here because this worker owns only agent component files. */
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Square,
} from 'lucide-react';

export type AgentLifecycleStatus =
  | 'IDLE'
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'STOPPED'
  | 'FAILED';

export type AgentRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type AgentChannel = 'INTERNAL' | 'WHATSAPP' | 'EMAIL';

export interface AgentStats {
  totalClients: number;
  totalOperations: number;
  pendingAmount: number;
  vencidas: number;
  hoyVence: number;
  porVencer: number;
  pagadasHoy: number;
}

export interface AgentExecution {
  id: string;
  status: string;
  phase: string;
  progress: number;
  startedAt: string;
  triggeredBy: string;
  totalActions?: number;
  completedActions?: number;
  failedActions?: number;
  cancelledActions?: number;
  notes?: string | null;
}

export interface PendingAgentAction {
  id: string;
  executionId: string;
  clientId: string | null;
  clientName: string;
  action: string;
  status: string;
  scheduledAt: string;
  messagePreview?: string;
  approvalRequired: boolean;
  risk: AgentRisk;
  policyReason?: string;
}

export interface RecentAgentAction {
  id: string;
  executionId: string;
  clientId: string | null;
  clientName: string;
  action: string;
  status: string;
  sentAt: string;
  error?: string | null;
}

export interface AgentActionPolicy {
  actionType: string;
  automatic: boolean;
  approvalRequired: boolean;
  risk: AgentRisk;
  channel: AgentChannel;
  reason: string;
}

export interface AgentStatusCopy {
  label: string;
  description: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export interface AgentCommand {
  endpoint: string;
  label: string;
  description: string;
  intent: 'primary' | 'success' | 'warning' | 'danger';
  icon: 'play' | 'pause' | 'stop' | 'resume';
  destructive?: boolean;
}

const statusCopy: Record<Exclude<AgentLifecycleStatus, 'IDLE'>, AgentStatusCopy> = {
  PENDING: {
    label: 'Pendiente de operador',
    description: 'Listo para una ejecucion manual o programada.',
    tone: 'neutral',
  },
  RUNNING: {
    label: 'Ejecucion en curso',
    description: 'El agente esta orquestando cartera, reglas y aprobaciones.',
    tone: 'success',
  },
  PAUSED: {
    label: 'Pausado',
    description: 'La ejecucion conserva contexto y espera reanudacion.',
    tone: 'warning',
  },
  COMPLETED: {
    label: 'Completado',
    description: 'El ultimo ciclo termino sin ejecucion activa.',
    tone: 'success',
  },
  STOPPED: {
    label: 'Detenido',
    description: 'Un operador detuvo el ciclo y bloqueo acciones pendientes.',
    tone: 'danger',
  },
  FAILED: {
    label: 'Fallido',
    description: 'El ciclo necesita revision antes de volver a operar.',
    tone: 'danger',
  },
};

const commandSet: Record<Exclude<AgentLifecycleStatus, 'IDLE'>, AgentCommand[]> = {
  PENDING: [
    {
      endpoint: '/agent/execution/start',
      label: 'Ejecutar ahora',
      description: 'Inicia planeacion y cola de aprobaciones',
      intent: 'success',
      icon: 'play',
    },
  ],
  RUNNING: [
    {
      endpoint: '/agent/execution/pause',
      label: 'Pausar',
      description: 'Congela el ciclo operativo',
      intent: 'warning',
      icon: 'pause',
    },
    {
      endpoint: '/agent/execution/stop',
      label: 'Detener',
      description: 'Cancela cola en curso',
      intent: 'danger',
      icon: 'stop',
      destructive: true,
    },
  ],
  PAUSED: [
    {
      endpoint: '/agent/execution/resume',
      label: 'Reanudar',
      description: 'Continua desde la fase pausada',
      intent: 'success',
      icon: 'resume',
    },
    {
      endpoint: '/agent/execution/stop',
      label: 'Detener',
      description: 'Cancela cola en curso',
      intent: 'danger',
      icon: 'stop',
      destructive: true,
    },
  ],
  COMPLETED: [
    {
      endpoint: '/agent/execution/start',
      label: 'Ejecutar ahora',
      description: 'Genera un nuevo ciclo manual',
      intent: 'success',
      icon: 'play',
    },
  ],
  STOPPED: [
    {
      endpoint: '/agent/execution/start',
      label: 'Ejecutar ahora',
      description: 'Genera un nuevo ciclo manual',
      intent: 'success',
      icon: 'play',
    },
  ],
  FAILED: [
    {
      endpoint: '/agent/execution/start',
      label: 'Reintentar ciclo',
      description: 'Genera una nueva ejecucion manual',
      intent: 'primary',
      icon: 'play',
    },
  ],
};

const toneClasses: Record<AgentStatusCopy['tone'], string> = {
  neutral: 'border-slate-300/70 bg-white text-slate-700',
  info: 'border-sky-300/70 bg-sky-50 text-sky-800',
  success: 'border-emerald-300/70 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-300/80 bg-amber-50 text-amber-800',
  danger: 'border-red-300/70 bg-red-50 text-red-800',
};

const intentClasses: Record<AgentCommand['intent'], string> = {
  primary: 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800',
  success: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
  warning: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
  danger: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
};

export function normalizeAgentStatus(status: string): Exclude<AgentLifecycleStatus, 'IDLE'> {
  if (status === 'RUNNING' || status === 'PAUSED' || status === 'COMPLETED' || status === 'STOPPED' || status === 'FAILED') {
    return status;
  }

  return 'PENDING';
}

export function getAgentStatusCopy(status: string): AgentStatusCopy {
  return statusCopy[normalizeAgentStatus(status)];
}

export function getAvailableAgentCommands(status: string): AgentCommand[] {
  return commandSet[normalizeAgentStatus(status)];
}

export function getRiskCopy(risk: AgentRisk): { label: string; className: string } {
  const riskCopy: Record<AgentRisk, { label: string; className: string }> = {
    LOW: {
      label: 'Riesgo bajo',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    MEDIUM: {
      label: 'Riesgo medio',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    HIGH: {
      label: 'Riesgo alto',
      className: 'border-red-200 bg-red-50 text-red-700',
    },
  };

  return riskCopy[risk];
}

export function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    WHATSAPP_MESSAGE: 'WhatsApp',
    WHATSAPP_PDF: 'PDF por WhatsApp',
    FOLLOWUP: 'Seguimiento',
    EMAIL: 'Email',
  };

  return labels[actionType] || actionType.replaceAll('_', ' ');
}

export function formatAgentDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAgentMoney(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

interface AgentControlCenterProps {
  status: string;
  currentExecution: AgentExecution | null;
  nextScheduledRun: string;
  pendingApprovals: number;
  failedActions: number;
  loadingCommand: string | null;
  onCommand: (endpoint: string, label: string) => void;
  onRefresh: () => void;
}

export function AgentControlCenter({
  status,
  currentExecution,
  nextScheduledRun,
  pendingApprovals,
  failedActions,
  loadingCommand,
  onCommand,
  onRefresh,
}: AgentControlCenterProps) {
  const normalizedStatus = normalizeAgentStatus(status);
  const copy = getAgentStatusCopy(status);
  const commands = getAvailableAgentCommands(status);
  const progress = Math.max(0, Math.min(100, currentExecution?.progress ?? 0));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_-38px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-950 text-white">
              <Bot size={22} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">Agente de cobranza</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">Centro de control operativo</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Supervisa ejecuciones, aprobaciones humanas y politicas de accion sin cambiar los contratos API.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:translate-y-px"
            >
              <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
              Actualizar
            </button>
            {commands.map((command) => (
              <CommandButton
                key={command.endpoint}
                command={command}
                loading={loadingCommand === command.endpoint}
                disabled={loadingCommand !== null}
                onClick={() => {
                  if (command.destructive && typeof window !== 'undefined') {
                    const confirmed = window.confirm('Esto detendra la ejecucion activa y cancelara acciones pendientes. Continuar?');
                    if (!confirmed) return;
                  }
                  onCommand(command.endpoint, command.label);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[copy.tone]}`}>
                <StatusGlyph status={normalizedStatus} />
                {copy.label}
              </span>
              <p className="mt-3 text-sm leading-6 text-slate-600">{copy.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-64">
              <Signal label="Aprobaciones" value={`${pendingApprovals}`} tone={pendingApprovals > 0 ? 'warning' : 'neutral'} />
              <Signal label="Fallos" value={`${failedActions}`} tone={failedActions > 0 ? 'danger' : 'neutral'} />
            </div>
          </div>

          {currentExecution ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Fase <strong className="font-semibold text-slate-800">{currentExecution.phase}</strong>
                </span>
                <span className="font-mono text-slate-700">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Inicio {formatAgentDate(currentExecution.startedAt)} por {currentExecution.triggeredBy}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
              Proximo ciclo programado: <span className="font-medium text-slate-900">{formatAgentDate(nextScheduledRun)}</span>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <OperatorNote
            icon={<Activity size={16} strokeWidth={1.8} aria-hidden="true" />}
            label="Estado operativo"
            value={copy.label}
          />
          <OperatorNote
            icon={<ShieldAlert size={16} strokeWidth={1.8} aria-hidden="true" />}
            label="Control humano"
            value={pendingApprovals > 0 ? `${pendingApprovals} aprobacion pendiente` : 'Sin bloqueos activos'}
          />
          <OperatorNote
            icon={<AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />}
            label="Incidentes"
            value={failedActions > 0 ? `${failedActions} requiere revision` : 'Sin fallos recientes'}
          />
        </div>
      </div>
    </section>
  );
}

function CommandButton({
  command,
  loading,
  disabled,
  onClick,
}: {
  command: AgentCommand;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={command.description}
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${intentClasses[command.intent]}`}
    >
      {loading ? <RefreshCw size={15} className="animate-spin" strokeWidth={1.8} aria-hidden="true" /> : getCommandIcon(command.icon)}
      {command.label}
    </button>
  );
}

function getCommandIcon(icon: AgentCommand['icon']): ReactNode {
  const props = { size: 15, strokeWidth: 1.8, 'aria-hidden': true };

  if (icon === 'pause') return <Pause {...props} />;
  if (icon === 'stop') return <Square {...props} />;
  if (icon === 'resume') return <RotateCcw {...props} />;
  return <Play {...props} />;
}

function StatusGlyph({ status }: { status: Exclude<AgentLifecycleStatus, 'IDLE'> }) {
  if (status === 'RUNNING') {
    return <span className="h-2 w-2 rounded-full bg-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />;
  }

  if (status === 'FAILED' || status === 'STOPPED') {
    return <AlertTriangle size={13} strokeWidth={1.8} aria-hidden="true" />;
  }

  if (status === 'COMPLETED') {
    return <CheckCircle2 size={13} strokeWidth={1.8} aria-hidden="true" />;
  }

  return <span className="h-2 w-2 rounded-full bg-slate-500" />;
}

function Signal({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'warning' | 'danger';
}) {
  const className = {
    neutral: 'border-slate-200 bg-white text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-700',
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <p className="text-[11px] font-semibold uppercase text-current opacity-70">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function OperatorNote({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}
