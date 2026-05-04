import { describe, expect, it } from 'vitest';
import {
  detectPaymentFromEvidence,
  PAYMENT_DETECTION_LOG_TYPE,
} from '../services/paymentDetection';

let rfcCounter = 0;
const uniqueRfc = () => {
  rfcCounter++;
  return `PAYD010101${String(rfcCounter).padStart(3, '0')}`;
};

function createInMemoryPrisma() {
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}_${++idCounter}`;
  const clients: any[] = [];
  const operations: any[] = [];
  const logs: any[] = [];

  const prisma = {
    client: {
      create: async ({ data }: any) => {
        const client = {
          id: nextId('client'),
          telefono: null,
          email: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        clients.push(client);
        return client;
      },
      findUnique: async ({ where }: any) =>
        clients.find(client => client.rfc === where.rfc || client.id === where.id) || null,
    },
    operation: {
      create: async ({ data }: any) => {
        const operation = {
          id: nextId('operation'),
          descripcion: null,
          fechaPago: null,
          estatus: 'PENDIENTE',
          asesor: null,
          excluir: false,
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        operations.push(operation);
        return operation;
      },
      findMany: async ({ where, orderBy }: any = {}) => {
        let result = [...operations];
        if (where?.clientId) result = result.filter(op => op.clientId === where.clientId);
        if (where?.fechaPago === null) result = result.filter(op => op.fechaPago === null);
        if (where?.excluir !== undefined) result = result.filter(op => op.excluir === where.excluir);
        if (where?.archived !== undefined) result = result.filter(op => op.archived === where.archived);
        if (where?.estatus?.not) result = result.filter(op => op.estatus !== where.estatus.not);
        if (orderBy?.fechaVence === 'asc') {
          result.sort((a, b) => a.fechaVence.getTime() - b.fechaVence.getTime());
        }
        return result;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const operation = operations.find(op => op.id === where.id);
        if (!operation) throw new Error('Operation not found');
        return operation;
      },
      update: async ({ where, data }: any) => {
        const index = operations.findIndex(op => op.id === where.id);
        if (index < 0) throw new Error('Operation not found');
        operations[index] = {
          ...operations[index],
          ...data,
          updatedAt: new Date(),
        };
        return operations[index];
      },
    },
    logEntry: {
      create: async ({ data }: any) => {
        const log = {
          id: nextId('log'),
          createdAt: new Date(Date.UTC(2026, 4, logs.length + 1)),
          ...data,
        };
        logs.push(log);
        return log;
      },
      findMany: async ({ where, orderBy }: any = {}) => {
        let result = [...logs];
        if (where?.tipo) result = result.filter(log => log.tipo === where.tipo);
        if (orderBy?.createdAt === 'asc') {
          result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        if (orderBy?.createdAt === 'desc') {
          result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return result;
      },
      findFirst: async ({ where, orderBy }: any = {}) => {
        let result = logs.filter(log => {
          const typeOk = where?.tipo ? log.tipo === where.tipo : true;
          const resultOk = where?.resultado ? log.resultado === where.resultado : true;
          const containsOk = where?.mensaje?.contains
            ? String(log.mensaje || '').includes(where.mensaje.contains)
            : true;
          return typeOk && resultOk && containsOk;
        });
        if (orderBy?.createdAt === 'desc') {
          result = result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return result[0] || null;
      },
    },
  };

  return prisma as any;
}

async function createPendingOperation(prisma: any, options: {
  rfc?: string;
  amount?: number;
  dueDate?: Date;
  status?: string;
}) {
  const client = await prisma.client.create({
    data: {
      rfc: options.rfc ?? uniqueRfc(),
      nombre: 'Cliente Pago Detectado',
      telefono: '6641234567',
    },
  });

  const operation = await prisma.operation.create({
    data: {
      clientId: client.id,
      tipo: 'FISCAL',
      descripcion: 'Servicio contable mensual',
      monto: options.amount ?? 2100,
      fechaVence: options.dueDate ?? new Date('2026-05-10T00:00:00.000Z'),
      estatus: options.status ?? 'PENDIENTE',
    },
  });

  return { client, operation };
}

async function detectionLogs(prisma: any) {
  return prisma.logEntry.findMany({
    where: { tipo: PAYMENT_DETECTION_LOG_TYPE },
    orderBy: { createdAt: 'asc' },
  });
}

describe('Payment detection service', () => {
  it('marks an operation paid on exact RFC, amount and date match', async () => {
    const prisma = createInMemoryPrisma();
    const { client, operation } = await createPendingOperation(prisma, {
      amount: 2100,
      dueDate: new Date('2026-05-10T00:00:00.000Z'),
    });

    const result = await detectPaymentFromEvidence(prisma, {
      rfc: client.rfc,
      amount: 2100,
      paymentDate: '2026-05-10',
      reference: 'REF-EXACT-001',
      source: 'n8n',
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.operationId).toBe(operation.id);

    const updated = await prisma.operation.findUniqueOrThrow({
      where: { id: operation.id },
    });
    expect(updated.estatus).toBe('PAGADO');
    expect(updated.fechaPago?.toISOString()).toBe('2026-05-10T00:00:00.000Z');

    const logs = await detectionLogs(prisma);
    expect(logs).toHaveLength(1);
    expect(logs[0].resultado).toBe('ACCEPTED');
    expect(logs[0].mensaje).toContain('amount_exact');
  });

  it('accepts an amount within the configured tolerance', async () => {
    const prisma = createInMemoryPrisma();
    const { client, operation } = await createPendingOperation(prisma, {
      amount: 2100,
      dueDate: new Date('2026-05-10T00:00:00.000Z'),
    });

    const result = await detectPaymentFromEvidence(prisma, {
      rfc: client.rfc,
      amount: 2100.49,
      paymentDate: '2026-05-11',
      reference: 'REF-TOL-001',
      source: 'n8n',
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.operationId).toBe(operation.id);

    const updated = await prisma.operation.findUniqueOrThrow({
      where: { id: operation.id },
    });
    expect(updated.estatus).toBe('PAGADO');
    expect(updated.fechaPago?.toISOString()).toBe('2026-05-11T00:00:00.000Z');

    const logs = await detectionLogs(prisma);
    expect(logs).toHaveLength(1);
    expect(logs[0].resultado).toBe('ACCEPTED');
    expect(logs[0].mensaje).toContain('amount_within_tolerance');
  });

  it('does not mark paid when evidence does not safely match an operation', async () => {
    const prisma = createInMemoryPrisma();
    const { client, operation } = await createPendingOperation(prisma, {
      amount: 2100,
      dueDate: new Date('2026-05-10T00:00:00.000Z'),
    });

    const result = await detectPaymentFromEvidence(prisma, {
      rfc: client.rfc,
      amount: 2300,
      paymentDate: '2026-05-10',
      reference: 'REF-NO-MATCH-001',
      source: 'n8n',
    });

    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.operationId).toBeUndefined();
    expect(result.reasons).toContain('no_safe_operation_match');

    const unchanged = await prisma.operation.findUniqueOrThrow({
      where: { id: operation.id },
    });
    expect(unchanged.estatus).toBe('PENDIENTE');
    expect(unchanged.fechaPago).toBeNull();

    const logs = await detectionLogs(prisma);
    expect(logs).toHaveLength(1);
    expect(logs[0].resultado).toBe('REVIEW_REQUIRED');
    expect(logs[0].mensaje).toContain('no_safe_operation_match');
  });

  it('prevents duplicate receipts from marking another operation paid', async () => {
    const prisma = createInMemoryPrisma();
    const rfc = uniqueRfc();
    const first = await createPendingOperation(prisma, {
      rfc,
      amount: 2100,
      dueDate: new Date('2026-05-10T00:00:00.000Z'),
    });
    const second = await prisma.operation.create({
      data: {
        clientId: first.client.id,
        tipo: 'FISCAL',
        descripcion: 'Servicio contable adicional',
        monto: 2100,
        fechaVence: new Date('2026-05-12T00:00:00.000Z'),
      },
    });

    const firstResult = await detectPaymentFromEvidence(prisma, {
      rfc,
      amount: 2100,
      paymentDate: '2026-05-10',
      reference: 'DUP-REF-001',
      receiptId: 'receipt-001',
      source: 'n8n',
    });
    const duplicateResult = await detectPaymentFromEvidence(prisma, {
      rfc,
      amount: 2100,
      paymentDate: '2026-05-12',
      reference: 'DUP-REF-001',
      receiptId: 'receipt-001',
      source: 'n8n',
    });

    expect(firstResult.status).toBe('ACCEPTED');
    expect(duplicateResult.status).toBe('DUPLICATE');
    expect(duplicateResult.operationId).toBe(first.operation.id);

    const untouchedSecond = await prisma.operation.findUniqueOrThrow({
      where: { id: second.id },
    });
    expect(untouchedSecond.estatus).toBe('PENDIENTE');
    expect(untouchedSecond.fechaPago).toBeNull();

    const logs = await detectionLogs(prisma);
    expect(logs.map((log: any) => log.resultado)).toEqual(['ACCEPTED', 'DUPLICATE']);
    expect(logs[1].mensaje).toContain('duplicate_receipt');
  });
});
