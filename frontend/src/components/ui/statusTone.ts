export type StatusTone =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'violet'
  | 'gold';

export type StatusToneVariant = 'soft' | 'outline' | 'solid';

const toneClassMap: Record<StatusTone, Record<StatusToneVariant, string>> = {
  success: {
    soft: 'bg-[var(--brand-success-dim)] text-[var(--brand-success)] border-[var(--brand-success)]/25',
    outline: 'bg-transparent text-[var(--brand-success)] border-[var(--brand-success)]/40',
    solid: 'bg-[var(--brand-success)] text-white border-[var(--brand-success)]',
  },
  danger: {
    soft: 'bg-[var(--brand-danger-dim)] text-[var(--brand-danger)] border-[var(--brand-danger)]/25',
    outline: 'bg-transparent text-[var(--brand-danger)] border-[var(--brand-danger)]/40',
    solid: 'bg-[var(--brand-danger)] text-white border-[var(--brand-danger)]',
  },
  warning: {
    soft: 'bg-[var(--brand-warn-dim)] text-[var(--brand-warn-dark)] border-[var(--brand-warn)]/25',
    outline: 'bg-transparent text-[var(--brand-warn-dark)] border-[var(--brand-warn)]/40',
    solid: 'bg-[var(--brand-warn)] text-white border-[var(--brand-warn)]',
  },
  info: {
    soft: 'bg-[var(--brand-info-dim)] text-[var(--brand-info)] border-[var(--brand-info)]/25',
    outline: 'bg-transparent text-[var(--brand-info)] border-[var(--brand-info)]/40',
    solid: 'bg-[var(--brand-info)] text-white border-[var(--brand-info)]',
  },
  neutral: {
    soft: 'bg-[var(--brand-gray-dim)] text-[var(--brand-gray)] border-[var(--brand-gray)]/25',
    outline: 'bg-transparent text-[var(--brand-gray)] border-[var(--brand-gray)]/40',
    solid: 'bg-[var(--brand-gray)] text-white border-[var(--brand-gray)]',
  },
  primary: {
    soft: 'bg-[var(--brand-primary-dim)] text-[var(--brand-primary)] border-[var(--brand-primary)]/25',
    outline: 'bg-transparent text-[var(--brand-primary)] border-[var(--brand-primary)]/40',
    solid: 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]',
  },
  violet: {
    soft: 'bg-[var(--brand-violet-dim)] text-[var(--brand-violet)] border-[var(--brand-violet)]/25',
    outline: 'bg-transparent text-[var(--brand-violet)] border-[var(--brand-violet)]/40',
    solid: 'bg-[var(--brand-violet)] text-white border-[var(--brand-violet)]',
  },
  gold: {
    soft: 'bg-[var(--brand-gold-dim)] text-[var(--brand-gold)] border-[var(--brand-gold)]/25',
    outline: 'bg-transparent text-[var(--brand-gold)] border-[var(--brand-gold)]/40',
    solid: 'bg-[var(--brand-gold)] text-white border-[var(--brand-gold)]',
  },
};

const operationToneMap: Record<string, StatusTone> = {
  PAGADO: 'success',
  ENVIADO: 'success',
  ACTIVO: 'success',
  PRODUCCION: 'success',
  VENCIDO: 'danger',
  ERROR: 'danger',
  BLOQUEADO: 'danger',
  SUSPENDIDO: 'danger',
  'HOY VENCE': 'warning',
  'POR VENCER': 'warning',
  PRUEBA: 'warning',
  PENDIENTE: 'info',
  'AL CORRIENTE': 'info',
  EXCLUIDO: 'neutral',
  ARCHIVADO: 'neutral',
};

export function normalizeStatusKey(status: string) {
  return status
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function getOperationStatusTone(status: string): StatusTone {
  return operationToneMap[normalizeStatusKey(status)] || 'neutral';
}

export function getToneClasses(tone: StatusTone, variant: StatusToneVariant = 'soft') {
  return toneClassMap[tone][variant];
}
