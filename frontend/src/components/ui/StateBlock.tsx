import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Inbox, Loader2 } from 'lucide-react';

export interface StateBlockProps {
  state: 'empty' | 'loading' | 'error' | 'success' | 'idle';
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  inline?: boolean;
  className?: string;
}

const defaultIcons: Record<StateBlockProps['state'], ReactNode> = {
  empty: <Inbox size={22} />,
  loading: <Loader2 size={22} className="animate-spin" />,
  error: <AlertCircle size={22} />,
  success: <CheckCircle2 size={22} />,
  idle: <Clock3 size={22} />,
};

export function StateBlock({
  state,
  title,
  description,
  icon,
  action,
  compact = false,
  inline = false,
  className = '',
}: StateBlockProps) {
  return (
    <div
      role={state === 'error' ? 'alert' : 'status'}
      className={`flex ${inline ? 'items-center text-left' : 'flex-col items-center text-center'} gap-3 rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] ${compact ? 'p-4' : 'p-6'} ${className}`}
    >
      <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--c-surface-raised)] text-[var(--c-text-2)]">
        {icon || defaultIcons[state]}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-[var(--c-text)]">{title}</p>
        {description && <div className="mt-1 text-sm text-[var(--c-text-2)]">{description}</div>}
      </div>
      {action && <div className={inline ? 'ml-auto flex-shrink-0' : 'mt-1'}>{action}</div>}
    </div>
  );
}
