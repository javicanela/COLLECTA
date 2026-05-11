import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageInfo } from './navigation';

export interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  const location = useLocation();
  const pageInfo = title ? { title, subtitle: subtitle || '' } : getPageInfo(location.pathname);

  return (
    <header className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1
          className="text-xl font-bold tracking-tight text-[var(--c-text)] sm:text-2xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p className="mt-0.5 text-sm text-[var(--c-text-2)] line-clamp-1">{pageInfo.subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
