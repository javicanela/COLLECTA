import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ChevronDown,
} from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50, 100],
  showPageSize = true,
  showTotal = true,
  className = '',
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div 
      className={`flex items-center justify-between flex-wrap gap-4 px-4 py-3 rounded-xl border ${className}`}
      style={{ 
        background: 'var(--c-surface-raised)',
        borderColor: 'var(--c-border)',
      }}
    >
      <div className="flex items-center gap-4">
        {showTotal && (
          <span className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
            {total === 0 
              ? 'Sin resultados' 
              : `Mostrando ${startItem}-${endItem} de ${total}`
            }
          </span>
        )}
        
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
              Ver
            </span>
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
                style={{ 
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                  color: 'var(--c-text)',
                }}
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <ChevronDown 
                size={14} 
                className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--c-text-muted)' }}
              />
            </div>
            <span className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
              por página
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--c-text)' }}
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          whileHover={canGoPrevious ? { scale: 1.05 } : {}}
          whileTap={canGoPrevious ? { scale: 0.95 } : {}}
        >
          <ChevronsLeft size={16} />
        </motion.button>
        
        <motion.button
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--c-text)' }}
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
          whileHover={canGoPrevious ? { scale: 1.05 } : {}}
          whileTap={canGoPrevious ? { scale: 0.95 } : {}}
        >
          <ChevronLeft size={16} />
        </motion.button>

        {getVisiblePages().map((p, index) => {
          if (p === 'ellipsis') {
            return (
              <span 
                key={`ellipsis-${index}`} 
                className="w-8 text-center text-sm"
                style={{ color: 'var(--c-text-muted)' }}
              >
                ...
              </span>
            );
          }

          const isActive = p === page;
          
          return (
            <motion.button
              key={p}
              className={`flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'text-white' 
                  : 'hover:bg-[var(--c-surface)]'
              }`}
              style={!isActive ? { color: 'var(--c-text)' } : { background: 'var(--brand-primary)' }}
              onClick={() => onPageChange(p)}
              whileHover={!isActive ? { scale: 1.05 } : {}}
              whileTap={!isActive ? { scale: 0.95 } : {}}
            >
              {p}
            </motion.button>
          );
        })}

        <motion.button
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--c-text)' }}
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          whileHover={canGoNext ? { scale: 1.05 } : {}}
          whileTap={canGoNext ? { scale: 0.95 } : {}}
        >
          <ChevronRight size={16} />
        </motion.button>
        
        <motion.button
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--c-text)' }}
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          whileHover={canGoNext ? { scale: 1.05 } : {}}
          whileTap={canGoNext ? { scale: 0.95 } : {}}
        >
          <ChevronsRight size={16} />
        </motion.button>
      </div>
    </div>
  );
};

interface PaginationInfoProps {
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}

export const PaginationInfo: React.FC<PaginationInfoProps> = ({
  page,
  pageSize,
  total,
  className = '',
}) => {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <span 
      className={`text-sm ${className}`}
      style={{ color: 'var(--c-text-muted)' }}
    >
      {total === 0 
        ? 'Sin resultados' 
        : `Mostrando ${startItem}-${endItem} de ${total}`
      }
    </span>
  );
};

export default Pagination;
