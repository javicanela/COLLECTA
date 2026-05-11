import type { Operation } from '../../types';
import type { StatusTone } from '../ui/statusTone';

export type OperationPriorityLevel = 'urgent' | 'today' | 'soon' | 'normal' | 'paused' | 'closed';
export type OperationQueueBucketId = 'overdue' | 'dueToday' | 'dueSoon' | 'missingContact' | 'other';
export type WorkbenchQueueFilter = 'all' | 'missingContact' | 'excluded' | 'paid';

export interface OperationPriority {
  level: OperationPriorityLevel;
  label: string;
  reason: string;
  tone: StatusTone;
}

export interface OperationQueueBucket {
  id: OperationQueueBucketId;
  label: string;
  description: string;
  tone: StatusTone;
  operations: Operation[];
  count: number;
  totalAmount: number;
  missingContactCount: number;
}

export interface ClientOpenBalance {
  total: number;
  count: number;
}

const queueBucketMeta: Record<OperationQueueBucketId, Pick<OperationQueueBucket, 'label' | 'description' | 'tone'>> = {
  overdue: {
    label: 'VENCIDO',
    description: 'Cobrar primero',
    tone: 'danger',
  },
  dueToday: {
    label: 'HOY VENCE',
    description: 'Contactar hoy',
    tone: 'warning',
  },
  dueSoon: {
    label: 'POR VENCER',
    description: 'Prevenir vencimiento',
    tone: 'warning',
  },
  missingContact: {
    label: 'Sin contacto',
    description: 'Completar telefono o email',
    tone: 'info',
  },
  other: {
    label: 'Resto',
    description: 'Seguimiento normal',
    tone: 'neutral',
  },
};

const queueBucketOrder: OperationQueueBucketId[] = ['overdue', 'dueToday', 'dueSoon', 'missingContact', 'other'];

export function getOperationStatus(operation: Operation) {
  return operation.calculatedStatus || operation.estatus;
}

export function getOperationDays(operation: Operation) {
  if (typeof operation.diasRestantes === 'number') {
    return operation.diasRestantes;
  }

  if (!operation.fechaVence) {
    return null;
  }

  const dueDate = new Date(operation.fechaVence);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  return Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
}

function pluralDays(days: number) {
  return days === 1 ? '1 dia' : `${days} dias`;
}

export function isPaidOperation(operation: Operation) {
  const status = getOperationStatus(operation);
  return status === 'PAGADO' || !!operation.fechaPago;
}

export function isExcludedOperation(operation: Operation) {
  const status = getOperationStatus(operation);
  return status === 'EXCLUIDO' || operation.excluir;
}

export function isMissingContact(operation: Operation) {
  const phone = operation.client?.telefono?.trim();
  const email = operation.client?.email?.trim();

  return !phone && !email;
}

export function getOperationPriority(operation: Operation): OperationPriority {
  const status = getOperationStatus(operation);
  const days = getOperationDays(operation);

  if (operation.excluir || status === 'EXCLUIDO') {
    return {
      level: 'paused',
      label: 'Fuera de cobranza',
      reason: 'La operacion esta excluida del flujo activo',
      tone: 'neutral',
    };
  }

  if (status === 'PAGADO' || operation.fechaPago) {
    return {
      level: 'closed',
      label: 'Cerrada',
      reason: 'La operacion esta marcada como pagada',
      tone: 'success',
    };
  }

  if (status === 'VENCIDO' || (typeof days === 'number' && days < 0)) {
    const overdueDays = Math.abs(days || 0);
    return {
      level: 'urgent',
      label: 'Atencion inmediata',
      reason: overdueDays > 0
        ? `${pluralDays(overdueDays)} vencida`
        : 'Operacion vencida',
      tone: 'danger',
    };
  }

  if (status === 'HOY VENCE' || days === 0) {
    return {
      level: 'today',
      label: 'Vence hoy',
      reason: 'Requiere seguimiento durante el dia',
      tone: 'warning',
    };
  }

  if (status === 'POR VENCER' || (typeof days === 'number' && days <= 3)) {
    return {
      level: 'soon',
      label: 'Seguimiento cercano',
      reason: typeof days === 'number'
        ? `Vence en ${pluralDays(Math.max(days, 1))}`
        : 'Operacion por vencer',
      tone: 'warning',
    };
  }

  return {
    level: 'normal',
    label: 'En seguimiento',
    reason: 'Sin bloqueo operativo inmediato',
    tone: 'info',
  };
}

export function getOperationQueueBucketId(operation: Operation): OperationQueueBucketId {
  const status = getOperationStatus(operation);
  const days = getOperationDays(operation);

  if (isPaidOperation(operation) || isExcludedOperation(operation)) {
    return 'other';
  }

  if (status === 'VENCIDO' || (typeof days === 'number' && days < 0)) {
    return 'overdue';
  }

  if (status === 'HOY VENCE' || days === 0) {
    return 'dueToday';
  }

  if (status === 'POR VENCER' || (typeof days === 'number' && days > 0 && days <= 3)) {
    return 'dueSoon';
  }

  if (isMissingContact(operation)) {
    return 'missingContact';
  }

  return 'other';
}

function getSortValue(operation: Operation) {
  const days = getOperationDays(operation);
  return typeof days === 'number' ? days : Number.MAX_SAFE_INTEGER;
}

function getActionabilityRank(operation: Operation) {
  if (isExcludedOperation(operation)) return 2;
  if (isPaidOperation(operation)) return 1;
  return 0;
}

function compareOperationsByActionability(a: Operation, b: Operation) {
  const actionabilityDelta = getActionabilityRank(a) - getActionabilityRank(b);
  if (actionabilityDelta !== 0) return actionabilityDelta;

  const daysDelta = getSortValue(a) - getSortValue(b);
  if (daysDelta !== 0) return daysDelta;

  const amountDelta = (Number(b.monto) || 0) - (Number(a.monto) || 0);
  if (amountDelta !== 0) return amountDelta;

  return (a.client?.nombre || a.descripcion || a.tipo).localeCompare(b.client?.nombre || b.descripcion || b.tipo);
}

export function buildPriorityQueue(operations: Operation[]): OperationQueueBucket[] {
  const grouped = new Map<OperationQueueBucketId, Operation[]>(
    queueBucketOrder.map(bucketId => [bucketId, []]),
  );

  operations.forEach((operation) => {
    grouped.get(getOperationQueueBucketId(operation))?.push(operation);
  });

  return queueBucketOrder.map((bucketId) => {
    const bucketOperations = [...(grouped.get(bucketId) || [])].sort(compareOperationsByActionability);
    const meta = queueBucketMeta[bucketId];

    return {
      id: bucketId,
      ...meta,
      operations: bucketOperations,
      count: bucketOperations.length,
      totalAmount: bucketOperations.reduce((total, operation) => total + (Number(operation.monto) || 0), 0),
      missingContactCount: bucketOperations.filter(isMissingContact).length,
    };
  });
}

export function filterOperationsForWorkbench(
  operations: Operation[],
  filter: WorkbenchQueueFilter,
) {
  if (filter === 'missingContact') {
    return operations.filter(operation =>
      isMissingContact(operation) &&
      !isPaidOperation(operation) &&
      !isExcludedOperation(operation),
    );
  }

  if (filter === 'excluded') {
    return operations.filter(isExcludedOperation);
  }

  if (filter === 'paid') {
    return operations.filter(isPaidOperation);
  }

  return operations;
}

export function getClientOpenBalance(operations: Operation[]): ClientOpenBalance {
  return operations.reduce<ClientOpenBalance>((balance, operation) => {
    const status = getOperationStatus(operation);
    const isClosed = status === 'PAGADO' || !!operation.fechaPago;
    const isPaused = status === 'EXCLUIDO' || operation.excluir;

    if (isClosed || isPaused || operation.archived) {
      return balance;
    }

    return {
      total: balance.total + (Number(operation.monto) || 0),
      count: balance.count + 1,
    };
  }, { total: 0, count: 0 });
}
