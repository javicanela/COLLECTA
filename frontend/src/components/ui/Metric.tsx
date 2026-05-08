import type { ReactNode } from 'react';
import { getToneClasses, type StatusTone } from './statusTone';

export interface MetricProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  mono?: boolean;
  active?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Metric({
  label,
  value,
  detail,
  tone = 'neutral',
  icon,
  mono = false,
  active = false,
  interactive = false,
  onClick,
  className = '',
}: MetricProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-muted)]">{label}</span>
        {icon && (
          <span aria-hidden="true" className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${getToneClasses(tone, 'soft')}`}>
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-bold text-[var(--c-text)] ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </div>
      {detail && <div className="mt-1 text-xs text-[var(--c-text-2)]">{detail}</div>}
    </>
  );
  const classes = `rounded-md border p-4 text-left transition-colors ${active ? getToneClasses(tone, 'soft') : 'border-[var(--c-border-subtle)] bg-[var(--c-surface)]'} ${interactive ? 'cursor-pointer hover:border-[var(--brand-primary)]/30 hover:bg-[var(--c-surface-raised)]' : ''} ${className}`;

  if (interactive || onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} aria-pressed={active}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
