type PrismaLike = {
  agentConfig: {
    findFirst: (args: any) => Promise<any | null>;
    create: (args: any) => Promise<any>;
  };
  agentExecution: {
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  agentAction: {
    count: (args: any) => Promise<number>;
    findFirst: (args: any) => Promise<any | null>;
    findUnique: (args: any) => Promise<any | null>;
    createMany: (args: any) => Promise<{ count: number }>;
    update: (args: any) => Promise<any>;
  };
  operation: {
    findMany: (args: any) => Promise<any[]>;
  };
  logEntry: {
    create: (args: any) => Promise<any>;
  };
};

export type AgentLifecycleStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'FAILED'
  | 'COMPLETED';

export type AgentActionPolicy = {
  actionType: string;
  automatic: boolean;
  approvalRequired: boolean;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  channel: 'INTERNAL' | 'WHATSAPP' | 'EMAIL';
  reason: string;
};

export class AgentPlannerError extends Error {
  code: string;
  httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = 'AgentPlannerError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function daysUntil(dueDate: Date, now: Date): number {
  return Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function money(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

async function getOrCreateConfig(prisma: PrismaLike, tenantId: string) {
  const config = await prisma.agentConfig.findFirst({ where: { tenantId } });
  if (config) return config;
  return prisma.agentConfig.create({ data: { tenantId } });
}

function getPolicy(actionType: string): AgentActionPolicy {
  if (actionType === 'WHATSAPP_MESSAGE' || actionType === 'WHATSAPP_PDF') {
    return {
      actionType,
      automatic: false,
      approvalRequired: true,
      risk: actionType === 'WHATSAPP_PDF' ? 'HIGH' : 'MEDIUM',
      channel: 'WHATSAPP',
      reason: 'External client communication requires operator approval before handoff.',
    };
  }

  if (actionType === 'EMAIL') {
    return {
      actionType,
      automatic: false,
      approvalRequired: true,
      risk: 'MEDIUM',
      channel: 'EMAIL',
      reason: 'External email requires operator approval before handoff.',
    };
  }

  return {
    actionType,
    automatic: true,
    approvalRequired: false,
    risk: 'LOW',
    channel: 'INTERNAL',
    reason: 'Internal follow-up can be recorded without external delivery.',
  };
}

function buildMessage(clientName: string, operations: any[], now: Date): string {
  const total = operations.reduce((sum, op) => sum + Number(op.monto || 0), 0);
  const lines = operations.slice(0, 5).map((op) => {
    const diff = daysUntil(op.fechaVence, now);
    const timing = diff < 0 ? `${Math.abs(diff)} dias vencida` : diff === 0 ? 'vence hoy' : `vence en ${diff} dias`;
    return `- ${op.tipo}: ${money(Number(op.monto || 0))} (${timing})`;
  });

  return [
    `Hola ${clientName}, detectamos pendientes por ${money(total)}:`,
    ...lines,
    'Por favor comparte tu comprobante o confirma fecha estimada de pago.',
  ].join('\n');
}

function groupActionCandidates(operations: any[], now: Date) {
  const grouped = new Map<string, { client: any; operations: any[] }>();

  for (const operation of operations) {
    const diff = daysUntil(operation.fechaVence, now);
    if (diff > 5) continue;
    if (!operation.clientId || !operation.client) continue;

    const existing = grouped.get(operation.clientId);
    if (existing) {
      existing.operations.push(operation);
      continue;
    }

    grouped.set(operation.clientId, {
      client: operation.client,
      operations: [operation],
    });
  }

  return [...grouped.values()];
}

async function countDailyHandoffs(prisma: PrismaLike, tenantId: string, now: Date): Promise<number> {
  const dayStart = startOfDay(now);
  const dayEnd = addDays(dayStart, 1);

  return prisma.agentAction.count({
    where: {
      tenantId,
      type: { in: ['WHATSAPP_MESSAGE', 'WHATSAPP_PDF', 'EMAIL'] },
      status: { in: ['EXECUTING', 'COMPLETED'] },
      updatedAt: { gte: dayStart, lt: dayEnd },
    },
  });
}

export function deriveAgentLifecycle(execution: { status?: string } | null): AgentLifecycleStatus {
  if (!execution) return 'IDLE';
  if (execution.status === 'RUNNING') return 'RUNNING';
  if (execution.status === 'PAUSED') return 'PAUSED';
  if (execution.status === 'STOPPED') return 'STOPPED';
  if (execution.status === 'FAILED') return 'FAILED';
  if (execution.status === 'COMPLETED') return 'COMPLETED';
  return 'IDLE';
}

export async function planAgentExecution({
  prisma,
  now = new Date(),
  tenantId = 'default',
  triggeredBy = 'MANUAL',
  sendAction,
}: {
  prisma: PrismaLike;
  now?: Date;
  tenantId?: string;
  triggeredBy?: 'MANUAL' | 'SCHEDULE' | 'WEBHOOK';
  sendAction?: (action: any) => Promise<unknown>;
}) {
  const config = await getOrCreateConfig(prisma, tenantId);
  const maxDailySends = Number(config.maxDailySends || 0);
  const dailyHandoffs = await countDailyHandoffs(prisma, tenantId, now);
  const remainingDaily = Math.max(0, maxDailySends - dailyHandoffs);

  const execution = await prisma.agentExecution.create({
    data: {
      status: 'RUNNING',
      phase: 'ANALYZE',
      progress: 10,
      triggeredBy,
      tenantId,
      notes: 'Planner started. External sends are disabled until operator approval and Phase 4 stability.',
    },
  });

  const operations = await prisma.operation.findMany({
    where: {
      archived: false,
      fechaPago: null,
      excluir: false,
    },
    include: { client: true },
    orderBy: { fechaVence: 'asc' },
  });

  const candidates = groupActionCandidates(operations, now);
  const actions: any[] = [];
  let skippedDuplicates = 0;
  let skippedRateLimit = 0;

  for (const candidate of candidates) {
    const policy = getPolicy('WHATSAPP_MESSAGE');

    if (actions.length >= remainingDaily) {
      skippedRateLimit++;
      continue;
    }

    const duplicate = await prisma.agentAction.findFirst({
      where: {
        tenantId,
        clientId: candidate.client.id,
        type: policy.actionType,
        status: { in: ['PENDING', 'EXECUTING', 'COMPLETED'] },
        createdAt: { gte: startOfDay(now) },
      },
    });

    if (duplicate) {
      skippedDuplicates++;
      continue;
    }

    const phone = candidate.client.telefono || null;
    if (!phone) {
      continue;
    }

    actions.push({
      executionId: execution.id,
      clientId: candidate.client.id,
      type: policy.actionType,
      status: 'PENDING',
      message: buildMessage(candidate.client.nombre || 'cliente', candidate.operations, now),
      phone,
      tenantId,
    });
  }

  if (actions.length > 0) {
    await prisma.agentAction.createMany({ data: actions, skipDuplicates: true });
    await prisma.agentExecution.update({
      where: { id: execution.id },
      data: {
        phase: 'EXECUTE',
        progress: 35,
        totalActions: actions.length,
        notes: `Planner created ${actions.length} pending action(s). Operator approval required for external delivery handoff.`,
      },
    });
  } else {
    await prisma.agentExecution.update({
      where: { id: execution.id },
      data: {
        status: 'COMPLETED',
        phase: 'MONITOR',
        progress: 100,
        completedAt: now,
        totalActions: 0,
        notes: 'Planner completed without creating actions.',
      },
    });
  }

  if (sendAction) {
    // The planner must never call this during Phase 5. This branch intentionally
    // stays empty so tests can assert no blind send occurs.
  }

  return {
    execution,
    planned: actions.length,
    approvalRequired: actions.filter((action) => getPolicy(action.type).approvalRequired).length,
    automatic: actions.filter((action) => getPolicy(action.type).automatic).length,
    skippedDuplicates,
    skippedRateLimit,
    policies: [getPolicy('FOLLOWUP'), getPolicy('WHATSAPP_MESSAGE'), getPolicy('WHATSAPP_PDF'), getPolicy('EMAIL')],
  };
}

export async function approvePendingAction({
  prisma,
  actionId,
  now = new Date(),
  tenantId = 'default',
  approvedBy = 'operator',
}: {
  prisma: PrismaLike;
  actionId: string;
  now?: Date;
  tenantId?: string;
  approvedBy?: string;
}) {
  const action = await prisma.agentAction.findUnique({
    where: { id: actionId },
    include: { execution: true },
  });

  if (!action) {
    throw new AgentPlannerError('ACTION_NOT_FOUND', 'Accion no encontrada', 404);
  }
  if (action.status !== 'PENDING') {
    throw new AgentPlannerError('ACTION_NOT_PENDING', `Accion ya esta en estado ${action.status}`, 400);
  }
  if (!action.execution || action.execution.status !== 'RUNNING') {
    throw new AgentPlannerError('EXECUTION_NOT_RUNNING', 'La ejecucion no esta corriendo; no se puede aprobar', 409);
  }

  const config = await getOrCreateConfig(prisma, tenantId);
  const dailyHandoffs = await countDailyHandoffs(prisma, tenantId, now);
  if (dailyHandoffs >= Number(config.maxDailySends || 0)) {
    throw new AgentPlannerError('RATE_LIMIT_EXCEEDED', 'Limite diario de envios alcanzado', 429);
  }

  await prisma.logEntry.create({
    data: {
      clientId: action.clientId || null,
      tipo: 'AGENT_ACTION_APPROVED',
      variante: action.type,
      resultado: 'APPROVED',
      mensaje: `Approved by ${approvedBy}. Handoff only; no direct send in Phase 5.`,
      telefono: action.phone || null,
      modo: 'CONTROLLED_OPERATOR',
    },
  });

  return prisma.agentAction.update({
    where: { id: actionId },
    data: {
      status: 'EXECUTING',
      error: null,
    },
  });
}

export function getAgentActionPolicies(): AgentActionPolicy[] {
  return [getPolicy('FOLLOWUP'), getPolicy('WHATSAPP_MESSAGE'), getPolicy('WHATSAPP_PDF'), getPolicy('EMAIL')];
}
