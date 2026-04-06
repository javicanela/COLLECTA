import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  showBreadcrumbs?: boolean;
}

export default function Topbar({ 
  title, 
  subtitle, 
  actions, 
  breadcrumbs,
  showBreadcrumbs = true,
}: TopbarProps) {
  const location = useLocation();

  const defaultBreadcrumbs = [
    { label: 'Inicio', href: '/' },
    ...(location.pathname !== '/' 
      ? [{ label: title, href: undefined }] 
      : []
    ),
  ];

  const crumbs = breadcrumbs || defaultBreadcrumbs;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="sticky top-0 z-20 px-4 sm:px-5 lg:px-6 py-4 lg:py-5 flex-shrink-0"
      style={{
        background: 'var(--c-surface-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--c-border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto w-full">
        {showBreadcrumbs && crumbs.length > 0 && (
          <motion.nav 
            className="flex items-center gap-1.5 mb-3 overflow-x-auto scrollbar-none"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            {crumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center whitespace-nowrap">
                {idx > 0 && (
                  <ChevronRight 
                    size={12} 
                    className="mx-1.5 text-[var(--c-text-muted)] flex-shrink-0" 
                  />
                )}
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="text-xs font-medium no-underline transition-all duration-200 hover:opacity-75 hover:scale-[0.98]"
                    style={{ 
                      color: idx === crumbs.length - 1 
                        ? 'var(--brand-primary)' 
                        : 'var(--c-text-muted)' 
                    }}
                  >
                    {idx === 0 ? (
                      <span className="flex items-center gap-1">
                        <Home size={11} className="flex-shrink-0" />
                        <span className="hidden sm:inline">{crumb.label}</span>
                      </span>
                    ) : (
                      crumb.label
                    )}
                  </Link>
                ) : (
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: idx === crumbs.length - 1
                        ? 'var(--c-text)'
                        : 'var(--c-text-muted)',
                    }}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </motion.nav>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="min-w-0"
          >
            <h1
              className="text-xl sm:text-2xl lg:text-2xl font-bold tracking-tight leading-tight truncate"
              style={{ 
                color: 'var(--c-text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <motion.p 
                className="text-sm sm:text-base font-normal mt-1.5 line-clamp-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                style={{ color: 'var(--c-text-2)' }}
              >
                {subtitle}
              </motion.p>
            )}
          </motion.div>

          {actions && (
            <motion.div
              className="flex flex-wrap items-center gap-2 sm:gap-3"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              {actions}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
