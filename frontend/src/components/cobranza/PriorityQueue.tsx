import { useMemo, type ReactNode } from 'react';
import { AlertTriangle, CalendarClock, Clock3, Eye, ListChecks, PhoneOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { StateBlock } from '../ui/StateBlock';
import { StatusBadge } from '../ui/StatusBadge';
import type { StatusTone } from '../ui/statusTone';
import type { Operation } from '../../types';
import { OperationStatusBadge } from './OperationStatusBadge';
import {
  buildPriorityQueue,
  filterOperationsForWorkbench,
  getOperationDays,
  isMissingContact,
  type OperationQueueBucket,
  type OperationQueueBucketId,
  type WorkbenchQueueFilter,
} from './operationWorkbench';

export interface PriorityQueueProps {
  operations: Operation[];
  activeFilter: WorkbenchQueueFilter;
  onFilterChange: (filter: WorkbenchQueueFilter) => void;
  onInspect: (operation: Operation) => void;
  formatCurrency: (amount: number) => string;
  isLoading?: boolean;
  error?: string | null;
  maxRowsPerBucket?: number;
  className?: string;
}

const bucketIcons: Record<OperationQueueBucketId, ReactNode> = {
  overdue: <AlertTriangle size={14} />,
  dueToday: <Clock3 size={14} />,
  dueSoon: <CalendarClock size={14} />,
  missingContact: <PhoneOff size={14} />,
  other: <ListChecks size={14} />,
};

const toneAccent: Record<StatusTone, string> = {
  danger: 'var(--brand-danger)',
  warning: 'var(--brand-warn)',
  info: 'var(--brand-info)',
  neutral: 'var(--brand-gray)',
  success: 'var(--brand-success)',
  primary: 'var(--brand-primary)',
  violet: 'var(--brand-violet)',
  gold: 'var(--brand-gold)',
};

function getDaysLabel(operation: Operation) {
  const days = getOperationDays(operation);

  if (days === null) return 'Sin fecha clara';
  if (days === 0) return 'Hoy';
  if (days < 0) return `${Math.abs(days)}d vencida`;

  return `${days}d restantes`;
}

function getClientLabel(operation: Operation) {
  return operation.client?.nombre || 'Operacion sin cliente';
}

function QueueRow({
  operation,
  onInspect,
  formatCurrency,
}: {
  operation: Operation;
  onInspect: (operation: Operation) => void;
  formatCurrency: (amount: number) => string;
}) {
  const missingContact = isMissingContact(operation);

  return (
    <button
      type="button"
      onClick={() => onInspect(operation)}
      className="group w-full border-t border-[var(--c-border-subtle)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--c-surface-raised)] active:translate-y-[1px]"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--c-text)]">{getClientLabel(operation)}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-[var(--c-text-2)]">
            {operation.descripcion || operation.tipo}
          </p>
        </div>
        <OperationStatusBadge operation={operation} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--c-text-muted)]">
        <span className="font-mono font-black tabular-nums text-[var(--brand-gold)]">
          {formatCurrency(operation.monto || 0)}
        </span>
        <span className="font-mono tabular-nums">{getDaysLabel(operation)}</span>
        {missingContact && (
          <StatusBadge label="Falta contacto" tone="info" size="sm" />
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[var(--c-text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
          <Eye size={12} />
          Ver
        </span>
      </div>
    </button>
  );
}

function QueueBucket({
  bucket,
  maxRows,
  onInspect,
  formatCurrency,
}: {
  bucket: OperationQueueBucket;
  maxRows: number;
  onInspect: (operation: Operation) => void;
  formatCurrency: (amount: number) => string;
}) {
  const visibleOperations = bucket.operations.slice(0, maxRows);
  const hiddenCount = Math.max(bucket.operations.length - visibleOperations.length, 0);

  return (
    <section
      aria-label={bucket.label}
      className="min-w-0 border-t-2 border-[var(--c-border-subtle)]"
      style={{ borderTopColor: toneAccent[bucket.tone] }}
    >
      <div className="px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge label={bucket.label} tone={bucket.tone} icon={bucketIcons[bucket.id]} size="sm" />
          <span className="font-mono text-xs font-black tabular-nums text-[var(--c-text)]">{bucket.count}</span>
        </div>
        <p className="mt-1 text-xs font-medium text-[var(--c-text-2)]">{bucket.description}</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-[var(--c-text-muted)]">
          <span>{formatCurrency(bucket.totalAmount)}</span>
          {bucket.missingContactCount > 0 && <span>{bucket.missingContactCount} sin contacto</span>}
        </div>
      </div>

      {visibleOperations.length > 0 ? (
        <div>
          {visibleOperations.map(operation => (
            <QueueRow
              key={operation.id}
              operation={operation}
              onInspect={onInspect}
              formatCurrency={formatCurrency}
            />
          ))}
          {hiddenCount > 0 && (
            <div className="border-t border-[var(--c-border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--c-text-muted)]">
              {hiddenCount} mas en la tabla
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-[var(--c-border-subtle)] px-3 py-4 text-xs font-semibold text-[var(--c-text-muted)]">
          Sin pendientes en este bloque
        </div>
      )}
    </section>
  );
}

export function PriorityQueue({
  operations,
  activeFilter,
  onFilterChange,
  onInspect,
  formatCurrency,
  isLoading = false,
  error = null,
  maxRowsPerBucket = 4,
  className = '',
}: PriorityQueueProps) {
  const buckets = useMemo(() => buildPriorityQueue(operations), [operations]);
  const filterItems = useMemo(() => [
    { id: 'all' as const, label: 'Todo', count: operations.length },
    { id: 'missingContact' as const, label: 'Sin contacto', count: filterOperationsForWorkbench(operations, 'missingContact').length },
    { id: 'excluded' as const, label: 'Excluidas', count: filterOperationsForWorkbench(operations, 'excluded').length },
    { id: 'paid' as const, label: 'Pagadas', count: filterOperationsForWorkbench(operations, 'paid').length },
  ], [operations]);

  return (
    <section
      aria-label="Cola priorizada"
      className={`overflow-hidden rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface)] ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--c-border-subtle)] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--c-text-muted)]">Workbench de cartera</p>
          <h2 className="mt-1 text-base font-black text-[var(--c-text)]">Cola priorizada</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterItems.map(item => (
            <Button
              key={item.id}
              size="xs"
              variant={activeFilter === item.id ? 'primary' : 'ghost'}
              onClick={() => onFilterChange(item.id)}
              title={`Filtrar ${item.label}`}
            >
              {item.label} ({item.count})
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-3">
          <StateBlock
            state="error"
            title="No se pudo cargar cartera"
            description={error}
            compact
          />
        </div>
      ) : isLoading ? (
        <div className="p-3">
          <StateBlock
            state="loading"
            title="Armando cola priorizada"
            description="Ordenando vencidas, vencimientos de hoy y proximas acciones."
            compact
          />
        </div>
      ) : operations.length === 0 ? (
        <div className="p-3">
          <StateBlock
            state="empty"
            title="Sin operaciones en cola"
            description="Ajusta los filtros o registra una operacion para verla aqui."
            compact
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-[var(--c-border-subtle)] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
          {buckets.map(bucket => (
            <QueueBucket
              key={bucket.id}
              bucket={bucket}
              maxRows={maxRowsPerBucket}
              onInspect={onInspect}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}
    </section>
  );
}
