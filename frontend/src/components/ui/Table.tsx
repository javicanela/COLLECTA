import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { Skeleton } from './Skeleton';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectRow?: (row: T) => void;
  onSelectAll?: (selected: boolean) => void;
  striped?: boolean;
  hoverable?: boolean;
  stickyHeader?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  loading?: boolean;
  loadingRows?: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  onSort?: (key: string, direction: SortDirection) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortable = false,
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  striped = true,
  hoverable = true,
  stickyHeader = false,
  emptyMessage = 'No hay datos disponibles',
  emptyIcon,
  loading = false,
  loadingRows = 5,
  pagination,
  onSort,
  sortKey,
  sortDirection,
  className = '',
}: TableProps<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const activeSortKey = sortable ? (sortKey ?? internalSortKey) : null;
  const activeSortDirection = sortable ? (sortDirection ?? internalSortDirection) : null;

  const sortedData = useMemo(() => {
    if (!activeSortKey || !activeSortDirection) return data;
    
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[activeSortKey];
      const bVal = (b as Record<string, unknown>)[activeSortKey];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return activeSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, activeSortKey, activeSortDirection]);

  const displayData = pagination
    ? sortedData.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize
      )
    : sortedData;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!displayData.length || isMobile) return;
    
    const rows = displayData.length;
    const cols = columns.filter(c => c.key !== '__select').length;
    
    let { row: curRow, col: curCol } = focusedCell || { row: -1, col: -1 };
    
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocusedCell({ row: curRow, col: Math.min(curCol + 1, cols - 1) });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedCell({ row: curRow, col: Math.max(curCol - 1, 0) });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedCell({ row: Math.min(curRow + 1, rows - 1), col: curCol >= 0 ? curCol : 0 });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedCell({ row: Math.max(curRow - 1, 0), col: curCol >= 0 ? curCol : 0 });
        break;
      case 'Enter':
        if (curRow >= 0 && selectable && onSelectRow) {
          onSelectRow(displayData[curRow]);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedCell({ row: curRow, col: 0 });
        break;
      case 'End':
        e.preventDefault();
        setFocusedCell({ row: curRow, col: cols - 1 });
        break;
    }
  }, [displayData.length, columns.length, focusedCell, selectable, onSelectRow, isMobile]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode('cards');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSort = (key: string) => {
    if (!sortable) return;
    
    const newDirection: SortDirection = 
      activeSortKey === key && activeSortDirection === 'asc' ? 'desc' : 'asc';
    
    if (onSort) {
      onSort(key, newDirection);
    } else {
      setInternalSortKey(key);
      setInternalSortDirection(newDirection);
    }
  };

  const allSelected = selectable && data.length > 0 && data.every(row => selectedRows.has(keyExtractor(row)));
  const someSelected = selectable && data.some(row => selectedRows.has(keyExtractor(row))) && !allSelected;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  const renderHeaderCell = (column: Column<T>, colIndex: number) => {
    const isSorted = activeSortKey === column.key;
    
    return (
      <th
        key={column.key}
        role="columnheader"
        aria-sort={isSorted ? (activeSortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
        aria-colindex={colIndex + 1}
        className={`
          px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap
          ${sortable ? 'cursor-pointer select-none hover:bg-[var(--c-surface-raised)]' : ''}
          ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
        `}
        style={{ 
          width: column.width,
          color: 'var(--c-text-muted)',
          borderBottom: '1px solid var(--c-border)',
          background: 'var(--c-surface-raised)',
        }}
        onClick={() => sortable && handleSort(column.key)}
        tabIndex={sortable ? 0 : -1}
        onKeyDown={(e) => {
          if (sortable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleSort(column.key);
          }
        }}
      >
        <div className={`flex items-center gap-2 ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}`}>
          {selectable && column.key === '__select' ? (
            <input
              type="checkbox"
              className="checkbox-base"
              checked={allSelected}
              ref={el => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={handleSelectAll}
            />
          ) : (
            <>
              <span>{column.header}</span>
              {sortable && isSorted && (
                <motion.span
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={activeSortDirection}
                >
                  {activeSortDirection === 'asc' ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </motion.span>
              )}
            </>
          )}
        </div>
      </th>
    );
  };

  const renderCell = (row: T, column: Column<T>, rowIndex: number, colIndex: number) => {
    const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
    
    if (column.key === '__select' && selectable) {
      return (
        <td key={column.key} role="cell" className="px-4 py-3">
          <input
            type="checkbox"
            className="checkbox-base"
            checked={selectedRows.has(keyExtractor(row))}
            onChange={() => onSelectRow?.(row)}
            aria-label={`Seleccionar fila ${rowIndex + 1}`}
          />
        </td>
      );
    }

    if (column.render) {
      return (
        <td
          key={column.key}
          role="cell"
          aria-rowindex={rowIndex + 1}
          aria-colindex={colIndex + 1}
          aria-selected={selectable ? selectedRows.has(keyExtractor(row)) : undefined}
          className={`px-4 py-3 text-sm ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''} ${isFocused ? 'ring-2 ring-brand-primary ring-inset' : ''}`}
          style={{ 
            color: 'var(--c-text)',
            borderBottom: '1px solid var(--c-border-subtle)',
          }}
          tabIndex={selectable ? 0 : -1}
        >
          {column.render(row, rowIndex)}
        </td>
      );
    }

    const value = (row as Record<string, unknown>)[column.key];
    return (
      <td
        key={column.key}
        role="cell"
        aria-rowindex={rowIndex + 1}
        aria-colindex={colIndex + 1}
        aria-selected={selectable ? selectedRows.has(keyExtractor(row)) : undefined}
        className={`px-4 py-3 text-sm ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''} ${isFocused ? 'ring-2 ring-brand-primary ring-inset' : ''}`}
        style={{ 
          color: 'var(--c-text)',
          borderBottom: '1px solid var(--c-border-subtle)',
        }}
        tabIndex={selectable ? 0 : -1}
      >
        {value !== null && value !== undefined ? String(value) : '—'}
      </td>
    );
  };

  const renderLoadingRows = () => (
    <>
      {Array.from({ length: loadingRows }).map((_, i) => (
        <tr 
          key={`skeleton-${i}`}
          className={striped ? (i % 2 === 0 ? '' : 'bg-[var(--c-surface-raised)]') : ''}
          style={{ borderBottom: '1px solid var(--c-border-subtle)' }}
        >
          {columns.map((col, j) => (
            <td key={col.key} className="px-4 py-3">
              <Skeleton variant="text" width={j === 0 ? '80%' : '60%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  const renderCard = (row: T, index: number) => {
    const isSelected = selectedRows.has(keyExtractor(row));
    return (
      <motion.div
        key={keyExtractor(row)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`
          p-4 rounded-xl border mb-3 cursor-pointer transition-all
          ${hoverable ? 'hover:shadow-md' : ''}
          ${isSelected ? 'bg-brand-primary-dim border-brand-primary' : 'bg-[var(--c-surface)] border-[var(--c-border)]'}
        `}
        style={{ 
          borderColor: isSelected ? 'var(--brand-primary)' : 'var(--c-border)',
        }}
        onClick={() => selectable && onSelectRow?.(row)}
      >
        {selectable && (
          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              className="checkbox-base"
              checked={isSelected}
              onChange={() => onSelectRow?.(row)}
              onClick={e => e.stopPropagation()}
            />
            <span className="text-xs font-semibold uppercase text-[var(--c-text-muted)]">
              {index + 1}
            </span>
          </div>
        )}
        <div className="space-y-2">
          {columns.filter(col => col.key !== '__select').map((col) => (
            <div key={col.key} className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold uppercase text-[var(--c-text-muted)] shrink-0">
                {col.header}
              </span>
              <div className={`text-sm text-right ${col.align === 'right' ? 'text-left' : ''}`}>
                {col.render ? col.render(row, index) : (
                  <span className={col.align === 'right' ? 'font-mono' : ''}>
                    {String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderCardsView = () => {
    if (loading) {
      return Array.from({ length: loadingRows }).map((_, i) => (
        <div key={`skeleton-${i}`} className="p-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] mb-3">
          <div className="space-y-2">
            {columns.filter(col => col.key !== '__select').map((col) => (
              <div key={col.key} className="flex justify-between">
                <Skeleton variant="text" width={60} />
                <Skeleton variant="text" width={80} />
              </div>
            ))}
          </div>
        </div>
      ));
    }
    if (displayData.length === 0) {
      return (
        <div className="py-12 text-center" style={{ color: 'var(--c-text-muted)' }}>
          {emptyIcon && <div className="mb-3 flex justify-center opacity-50">{emptyIcon}</div>}
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }
    return displayData.map((row, index) => renderCard(row, index));
  };

  return (
    <div 
      className={`overflow-hidden rounded-xl border border-[var(--c-border)] ${className}`}
      style={{ background: 'var(--c-surface)' }}
    >
      {isMobile && (
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-raised)' }}>
          <span className="text-xs text-[var(--c-text-muted)]">
            {pagination ? `${displayData.length} elementos` : `${data.length} elementos`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-brand-primary text-white' : 'hover:bg-[var(--c-surface)]'}`}
              style={{ color: viewMode === 'cards' ? '#fff' : 'var(--c-text-muted)' }}
              title="Vista cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-brand-primary text-white' : 'hover:bg-[var(--c-surface)]'}`}
              style={{ color: viewMode === 'table' ? '#fff' : 'var(--c-text-muted)' }}
              title="Vista tabla"
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {viewMode === 'cards' || isMobile ? (
        <div className="p-3 md:hidden">
          {renderCardsView()}
        </div>
      ) : (
        <div 
          ref={tableRef}
          className={`overflow-x-auto ${stickyHeader ? 'max-h-[60vh]' : ''}`}
          style={stickyHeader ? { overflowY: 'auto' } : {}}
          role="grid"
          aria-label="Tabla de datos"
          tabIndex={selectable ? 0 : -1}
          onKeyDown={handleKeyDown}
        >
          <div className="hidden md:block">
            <table className="w-full" role="table">
          <thead 
            className={stickyHeader ? 'sticky top-0 z-10' : ''}
            style={{ background: 'var(--c-surface-raised)' }}
          >
            <tr>{columns.map((col, idx) => renderHeaderCell(col, idx))}</tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {loading ? (
                renderLoadingRows()
              ) : displayData.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length} 
                    className="px-4 py-12 text-center"
                    style={{ color: 'var(--c-text-muted)' }}
                  >
                    {emptyIcon && <div className="mb-3 flex justify-center opacity-50">{emptyIcon}</div>}
                    <p className="text-sm">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                displayData.map((row, index) => (
                  <motion.tr
                    key={keyExtractor(row)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`
                      ${hoverable ? 'hover:bg-[var(--c-surface-raised)] transition-colors cursor-pointer' : ''}
                      ${striped ? (index % 2 === 0 ? '' : 'bg-[var(--c-surface-raised)]/50') : ''}
                      ${selectedRows.has(keyExtractor(row)) ? 'bg-[var(--brand-primary-dim)]' : ''}
                    `}
                    style={{ borderBottom: '1px solid var(--c-border-subtle)' }}
                    onClick={() => selectable && onSelectRow?.(row)}
                    role="row"
                    aria-rowindex={index + 1}
                  >
                    {columns.map((col, colIdx) => renderCell(row, col, index, colIdx))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
          </div>
        </div>
      )}

      {pagination && (
        <div 
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ 
            background: 'var(--c-surface-raised)',
            borderColor: 'var(--c-border)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
              Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
            </span>
            {pagination.onPageSizeChange && (
              <select
                className="input-base text-sm py-1 px-2"
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              >
                {[5, 10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size} por página</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-lg hover:bg-[var(--c-surface)] transition-colors disabled:opacity-40"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              style={{ color: 'var(--c-text)' }}
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-[var(--c-surface)] transition-colors disabled:opacity-40"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{ color: 'var(--c-text)' }}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ 
              length: Math.ceil(pagination.total / pagination.pageSize) 
            }).map((_, i) => {
              const page = i + 1;
              const isActive = page === pagination.page;
              const isNear = Math.abs(page - pagination.page) <= 1;
              const isEnd = page === 1 || page === Math.ceil(pagination.total / pagination.pageSize);
              
              if (!isNear && !isEnd) {
                if (page === pagination.page - 2 || page === pagination.page + 2) {
                  return <span key={page} className="px-1" style={{ color: 'var(--c-text-muted)' }}>...</span>;
                }
                return null;
              }
              
              return (
                <button
                  key={page}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-brand-primary text-white' 
                      : 'hover:bg-[var(--c-surface)]'
                  }`}
                  style={!isActive ? { color: 'var(--c-text)' } : {}}
                  onClick={() => pagination.onPageChange(page)}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              className="p-2 rounded-lg hover:bg-[var(--c-surface)] transition-colors disabled:opacity-40"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              style={{ color: 'var(--c-text)' }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-[var(--c-surface)] transition-colors disabled:opacity-40"
              onClick={() => pagination.onPageChange(Math.ceil(pagination.total / pagination.pageSize))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              style={{ color: 'var(--c-text)' }}
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
