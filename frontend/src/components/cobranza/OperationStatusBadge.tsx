import { StatusBadge } from '../ui/StatusBadge';
import type { StatusBadgeProps } from '../ui/StatusBadge';
import type { Operation } from '../../types';
import { getOperationPriority, getOperationStatus } from './operationWorkbench';

export interface OperationStatusBadgeProps {
  operation?: Operation;
  status?: string;
  label?: string;
  size?: StatusBadgeProps['size'];
  className?: string;
  showPriority?: boolean;
}

export function OperationStatusBadge({
  operation,
  status,
  label,
  size = 'sm',
  className = '',
  showPriority = false,
}: OperationStatusBadgeProps) {
  if (showPriority && operation) {
    const priority = getOperationPriority(operation);
    return (
      <StatusBadge
        label={label || priority.label}
        tone={priority.tone}
        size={size}
        className={className}
      />
    );
  }

  const resolvedStatus = status || (operation ? getOperationStatus(operation) : label || 'PENDIENTE');

  return (
    <StatusBadge
      label={label || resolvedStatus}
      status={resolvedStatus}
      size={size}
      className={className}
    />
  );
}
