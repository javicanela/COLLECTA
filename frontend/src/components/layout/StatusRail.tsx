import { StatusBadge } from '../ui/StatusBadge';
import type { CollectaConnectionStatus } from '../../hooks/useConnectivityStatus';

export type WhatsAppConnectionStatus = 'connected' | 'disconnected' | 'not_configured' | 'error';
export type RailServiceStatus = 'ok' | 'warning' | 'error' | 'unknown';

export interface StatusRailProps {
  sysMode: string;
  waStatus: WhatsAppConnectionStatus;
  activeProvider: string | null;
  readinessStatus?: RailServiceStatus;
  emailStatus?: RailServiceStatus;
  pdfStatus?: RailServiceStatus;
  connectionStatus?: CollectaConnectionStatus;
  className?: string;
}

const waLabels: Record<WhatsAppConnectionStatus, string> = {
  connected: 'WA Conectado',
  disconnected: 'WA Desconectado',
  not_configured: 'WA No config.',
  error: 'WA Error',
};

const waTones: Record<WhatsAppConnectionStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  connected: 'success',
  disconnected: 'danger',
  not_configured: 'neutral',
  error: 'warning',
};

const serviceTone: Record<RailServiceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  ok: 'success',
  warning: 'warning',
  error: 'danger',
  unknown: 'neutral',
};

const serviceLabel: Record<RailServiceStatus, string> = {
  ok: 'OK',
  warning: 'Degradado',
  error: 'Bloqueado',
  unknown: 'Sin verificar',
};

const connectionTone: Record<CollectaConnectionStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  online: 'success',
  offline: 'warning',
  syncing: 'neutral',
  api_error: 'danger',
};

const connectionLabel: Record<CollectaConnectionStatus, string> = {
  online: 'Collecta Online',
  offline: 'Collecta Offline',
  syncing: 'Sincronizando',
  api_error: 'Error de API',
};

function normalizeMode(mode: string) {
  return mode.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

export function StatusRail({
  sysMode,
  waStatus,
  activeProvider,
  readinessStatus = 'unknown',
  emailStatus = 'unknown',
  pdfStatus = 'ok',
  connectionStatus = 'syncing',
  className = '',
}: StatusRailProps) {
  const isProduction = normalizeMode(sysMode) === 'PRODUCCION';

  return (
    <div
      className={`flex max-w-full items-center gap-3 overflow-x-auto rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] px-3 py-2 text-xs [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] ${className}`}
    >
      <StatusBadge
        label={sysMode}
        tone={isProduction ? 'success' : 'warning'}
        variant="dot"
        pulse={isProduction}
        title={isProduction ? 'Modo produccion activo' : 'Modo prueba: los envios no se ejecutan'}
      />

      <span className="hidden h-3 w-px bg-[var(--c-border)] sm:block" aria-hidden="true" />

      <StatusBadge
        label={connectionLabel[connectionStatus]}
        tone={connectionTone[connectionStatus]}
        variant="dot"
        pulse={connectionStatus === 'syncing'}
        title={connectionStatus === 'offline' ? 'Shell local disponible; sincronizacion requiere backend' : undefined}
      />

      <span className="hidden h-3 w-px bg-[var(--c-border)] sm:block" aria-hidden="true" />

      <StatusBadge
        label={waLabels[waStatus]}
        tone={waTones[waStatus]}
        variant="dot"
        pulse={waStatus === 'connected'}
      />

      <span className="hidden h-3 w-px bg-[var(--c-border)] sm:block" aria-hidden="true" />

      <StatusBadge
        label={activeProvider || 'Sin API'}
        tone={activeProvider ? 'success' : 'danger'}
        variant="dot"
      />

      <span className="hidden h-3 w-px bg-[var(--c-border)] sm:block" aria-hidden="true" />

      <StatusBadge
        label={`Email ${serviceLabel[emailStatus]}`}
        tone={serviceTone[emailStatus]}
        variant="dot"
      />

      <span className="hidden h-3 w-px bg-[var(--c-border)] sm:block" aria-hidden="true" />

      <StatusBadge
        label={`PDF ${serviceLabel[pdfStatus]}`}
        tone={serviceTone[pdfStatus]}
        variant="dot"
      />

      <span className="hidden h-3 w-px bg-[var(--c-border)] sm:block" aria-hidden="true" />

      <StatusBadge
        label={`Diagnostico ${serviceLabel[readinessStatus]}`}
        tone={serviceTone[readinessStatus]}
        variant="dot"
      />
    </div>
  );
}
