import type { ReactNode } from 'react';
import type { Operation } from '../../types';
import { PriorityQueue } from './PriorityQueue';
import type { WorkbenchQueueFilter } from './operationWorkbench';

export interface CobranzaWorkbenchProps {
  operations: Operation[];
  activeFilter: WorkbenchQueueFilter;
  onFilterChange: (filter: WorkbenchQueueFilter) => void;
  onInspect: (operation: Operation) => void;
  formatCurrency: (amount: number) => string;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
}

export function CobranzaWorkbench({
  operations,
  activeFilter,
  onFilterChange,
  onInspect,
  formatCurrency,
  isLoading = false,
  error = null,
  children,
}: CobranzaWorkbenchProps) {
  return (
    <section className="grid grid-cols-1 gap-4" aria-label="Workbench de cobranza">
      <PriorityQueue
        operations={operations}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        onInspect={onInspect}
        formatCurrency={formatCurrency}
        isLoading={isLoading}
        error={error}
      />
      {children}
    </section>
  );
}
