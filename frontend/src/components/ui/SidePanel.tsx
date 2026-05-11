import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

export interface SidePanelProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  side?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg';
  modal?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  closeLabel?: string;
}

const sizeClass = {
  sm: 'sm:w-[22rem]',
  md: 'sm:w-[28rem]',
  lg: 'sm:w-[34rem]',
};

export function SidePanel({
  title,
  subtitle,
  open,
  onClose,
  children,
  actions,
  side = 'right',
  size = 'md',
  modal = false,
  closeOnEscape = true,
  closeOnBackdrop = true,
  className = '',
  closeLabel = 'Cerrar panel',
}: SidePanelProps) {
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, onClose, open]);

  useEffect(() => {
    if (!open || !modal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, open]);

  if (!open) return null;

  return (
    <>
      {modal && (
        <button
          type="button"
          aria-label="Cerrar panel"
          className="fixed inset-0 z-30 bg-slate-950/35"
          onClick={closeOnBackdrop ? onClose : undefined}
          tabIndex={closeOnBackdrop ? 0 : -1}
        />
      )}

      <aside
        role={modal ? 'dialog' : 'complementary'}
        aria-modal={modal ? true : undefined}
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        data-state={open ? 'open' : 'closed'}
        className={`
          fixed inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} z-40
          flex w-full flex-col border-[var(--c-border)]
          bg-[var(--c-surface)] shadow-[var(--c-shadow-lg)]
          ${sizeClass[size]}
          ${side === 'right' ? 'border-l' : 'border-r'}
          ${className}
        `}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--c-border-subtle)] px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-bold tracking-tight text-[var(--c-text)]">
              {title}
            </h2>
            {subtitle && (
              <p id={subtitleId} className="mt-0.5 line-clamp-2 text-sm text-[var(--c-text-2)]">
                {subtitle}
              </p>
            )}
          </div>
          <IconButton
            icon={<X size={16} />}
            label={closeLabel}
            title={closeLabel}
            size="sm"
            onClick={onClose}
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {actions && (
          <footer className="border-t border-[var(--c-border-subtle)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          </footer>
        )}
      </aside>
    </>
  );
}
