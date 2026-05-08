import type { ReactNode } from 'react';
import { getOperationStatusTone, getToneClasses, type StatusTone, type StatusToneVariant } from './statusTone';

export type StatusBadgeVariant = StatusToneVariant | 'dot';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  status?: string;
  variant?: StatusBadgeVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  pulse?: boolean;
  title?: string;
  className?: string;
}

export function StatusBadge({
  label,
  tone,
  status,
  variant = 'soft',
  size = 'sm',
  icon,
  pulse = false,
  title,
  className = '',
}: StatusBadgeProps) {
  const resolvedTone = tone || getOperationStatusTone(status || label);
  const sizeClass = size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[10px]';

  if (variant === 'dot') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-2)] ${className}`}
        title={title || label}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full border ${getToneClasses(resolvedTone, 'solid')} ${pulse ? 'animate-pulse' : ''}`}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-bold uppercase tracking-wide ${sizeClass} ${getToneClasses(resolvedTone, variant)} ${className}`}
      title={title || label}
    >
      {icon && <span aria-hidden="true" className="inline-flex items-center">{icon}</span>}
      {label}
    </span>
  );
}
