import type { ReactNode } from 'react';

export interface ToolbarProps {
  label: string;
  leading?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  selectedCount?: number;
  bulkActions?: ReactNode;
  collapsible?: boolean;
  className?: string;
}

export function Toolbar({
  label,
  leading,
  filters,
  actions,
  selectedCount = 0,
  bulkActions,
  className = '',
}: ToolbarProps) {
  return (
    <section
      aria-label={label}
      className={`rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] p-3 ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {leading && <div className="flex-shrink-0 text-[var(--c-text-2)]">{leading}</div>}
          {filters && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{filters}</div>}
        </div>
        {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {selectedCount > 0 && bulkActions && (
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--c-border-subtle)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--c-text-2)]" aria-live="polite">
            {selectedCount} seleccionado{selectedCount === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap items-center gap-2">{bulkActions}</div>
        </div>
      )}
    </section>
  );
}
