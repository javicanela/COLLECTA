import { describe, expect, it, vi } from 'vitest';
import {
  approvePendingAction,
  deriveAgentLifecycle,
  planAgentExecution,
} from '../services/agentPlanner';

const fixedNow = new Date('2026-05-04T16:00:00.000Z');

function buildPrismaMock(overrides: Partial<Record<string, any>> = {}) {
  return {
    agentConfig: {
      findFirst: vi.fn().mockResolvedValue({
        tenantId: 'default',
        maxDailySends: 10,
        rateLimitMs: 1500,
        sendPdfEnabled: true,
        ...overrides.config,
      }),
      create: vi.fn(),
    },
    agentExecution: {
      create: vi.fn().mockResolvedValue({
        id: 'exec_1',
        status: 'RUNNING',
        phase: 'ANALYZE',
        progress: 10,
        tenantId: 'default',
      }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'exec_1', ...data })
      ),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    agentAction: {
      count: vi.fn().mockResolvedValue(overrides.dailySendCount ?? 0),
      findFirst: vi.fn().mockResolvedValue(overrides.duplicateAction ?? null),
      findUnique: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: overrides.createdCount ?? 1 }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'action_1', ...data })
      ),
      updateMany: vi.fn(),
    },
    operation: {
      findMany: vi.fn().mockResolvedValue(overrides.operations ?? []),
    },
    logEntry: {
      create: vi.fn().mockResolvedValue({ id: 'log_1' }),
    },
  };
}

function dueOperation(clientId = 'client_1') {
  return {
    id: `op_${clientId}`,
    clientId,
    tipo: 'IVA',
    descripcion: 'Declaracion mensual',
    monto: 2400,
    fechaVence: new Date('2026-05-02T00:00:00.000Z'),
    client: {
      id: clientId,
      nombre: 'Taller Fiscal Norte',
      rfc: 'TFN260504AA1',
      telefono: '+52 664 123 4567',
    },
  };
}

describe('planAgentExecution', () => {
  it('creates pending approval actions and never sends directly', async () => {
    const sendSpy = vi.fn();
    const prisma = buildPrismaMock({ operations: [dueOperation()] });

    const result = await planAgentExecution({
      prisma: prisma as any,
      now: fixedNow,
      triggeredBy: 'MANUAL',
      sendAction: sendSpy,
    });

    expect(sendSpy).not.toHaveBeenCalled();
    expect(prisma.agentExecution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'RUNNING',
        phase: 'ANALYZE',
        progress: 10,
        triggeredBy: 'MANUAL',
        tenantId: 'default',
      }),
    });
    expect(prisma.agentAction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          executionId: 'exec_1',
          clientId: 'client_1',
          type: 'WHATSAPP_MESSAGE',
          status: 'PENDING',
          phone: '+52 664 123 4567',
          tenantId: 'default',
        }),
      ],
      skipDuplicates: true,
    });
    expect(result.planned).toBe(1);
    expect(result.approvalRequired).toBe(1);
    expect(result.automatic).toBe(0);
  });

  it('skips duplicate daily actions for the same client and type', async () => {
    const prisma = buildPrismaMock({
      operations: [dueOperation()],
      duplicateAction: { id: 'existing_action', status: 'PENDING' },
      createdCount: 0,
    });

    const result = await planAgentExecution({
      prisma: prisma as any,
      now: fixedNow,
      triggeredBy: 'MANUAL',
    });

    expect(prisma.agentAction.createMany).not.toHaveBeenCalled();
    expect(result.planned).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
    expect(prisma.agentExecution.update).toHaveBeenCalledWith({
      where: { id: 'exec_1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        phase: 'MONITOR',
        progress: 100,
        totalActions: 0,
      }),
    });
  });

  it('caps planned actions at the remaining daily send limit', async () => {
    const prisma = buildPrismaMock({
      config: { maxDailySends: 2 },
      dailySendCount: 1,
      operations: [dueOperation('client_1'), dueOperation('client_2')],
    });

    const result = await planAgentExecution({
      prisma: prisma as any,
      now: fixedNow,
      triggeredBy: 'MANUAL',
    });

    expect(result.planned).toBe(1);
    expect(result.skippedRateLimit).toBe(1);
    expect(prisma.agentAction.createMany.mock.calls[0][0].data).toHaveLength(1);
  });
});

describe('approvePendingAction', () => {
  it('requires a running execution and records an audit log before execution handoff', async () => {
    const prisma = buildPrismaMock();
    prisma.agentAction.findUnique.mockResolvedValue({
      id: 'action_1',
      status: 'PENDING',
      executionId: 'exec_1',
      clientId: 'client_1',
      type: 'WHATSAPP_MESSAGE',
      phone: '+52 664 123 4567',
      execution: { id: 'exec_1', status: 'RUNNING' },
    });

    const result = await approvePendingAction({
      prisma: prisma as any,
      actionId: 'action_1',
      now: fixedNow,
      approvedBy: 'operator@test.local',
    });

    expect(result.status).toBe('EXECUTING');
    expect(prisma.logEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client_1',
        tipo: 'AGENT_ACTION_APPROVED',
        resultado: 'APPROVED',
        modo: 'CONTROLLED_OPERATOR',
      }),
    });
    expect(prisma.agentAction.update).toHaveBeenCalledWith({
      where: { id: 'action_1' },
      data: expect.objectContaining({ status: 'EXECUTING' }),
    });
  });

  it('rejects approval when the daily limit has been reached', async () => {
    const prisma = buildPrismaMock({
      config: { maxDailySends: 1 },
      dailySendCount: 1,
    });
    prisma.agentAction.findUnique.mockResolvedValue({
      id: 'action_1',
      status: 'PENDING',
      executionId: 'exec_1',
      clientId: 'client_1',
      type: 'WHATSAPP_MESSAGE',
      execution: { id: 'exec_1', status: 'RUNNING' },
    });

    await expect(
      approvePendingAction({
        prisma: prisma as any,
        actionId: 'action_1',
        now: fixedNow,
      })
    ).rejects.toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      httpStatus: 429,
    });
  });
});

describe('deriveAgentLifecycle', () => {
  it('maps persisted execution statuses to the operator lifecycle', () => {
    expect(deriveAgentLifecycle(null)).toBe('IDLE');
    expect(deriveAgentLifecycle({ status: 'RUNNING' })).toBe('RUNNING');
    expect(deriveAgentLifecycle({ status: 'PAUSED' })).toBe('PAUSED');
    expect(deriveAgentLifecycle({ status: 'STOPPED' })).toBe('STOPPED');
    expect(deriveAgentLifecycle({ status: 'FAILED' })).toBe('FAILED');
    expect(deriveAgentLifecycle({ status: 'COMPLETED' })).toBe('COMPLETED');
  });
});
