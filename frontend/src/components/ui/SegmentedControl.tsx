import type { ReactNode } from 'react';

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
};

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
  className = '',
}: SegmentedControlProps<T>) {
  const sizeClass = size === 'md' ? 'px-3 py-2 text-sm' : 'px-2.5 py-1.5 text-xs';

  return (
    <div role="tablist" aria-label={label} className={`inline-flex rounded-md border border-[var(--c-border)] bg-[var(--c-surface)] p-1 ${className}`}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded px-2 font-semibold transition-colors ${sizeClass} ${
              selected
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface-raised)] hover:text-[var(--c-text)]'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {option.icon && <span aria-hidden="true">{option.icon}</span>}
            {option.label}
            {typeof option.count === 'number' && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selected ? 'bg-white/20 text-white' : 'bg-[var(--c-border-subtle)] text-[var(--c-text-muted)]'}`}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
