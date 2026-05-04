import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  AgentPlannerError,
  approvePendingAction,
  deriveAgentLifecycle,
  getAgentActionPolicies,
  planAgentExecution,
} from '../services/agentPlanner';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────

function nextScheduledRun(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Schedule: 1st and 15th at 9:00 AM
  let next: Date;
  if (day < 1 || (day === 1 && now.getHours() < 9)) {
    next = new Date(year, month, 1, 9, 0, 0);
  } else if (day < 15 || (day === 15 && now.getHours() < 9)) {
    next = new Date(year, month, 15, 9, 0, 0);
  } else {
    // Next month 1st
    next = new Date(year, month + 1, 1, 9, 0, 0);
  }
  return next.toISOString();
}

async function getOrCreateConfig() {
  let cfg = await prisma.agentConfig.findFirst({
    where: { tenantId: 'default' },
  });
  if (!cfg) {
    cfg = await prisma.agentConfig.create({
      data: { tenantId: 'default' },
    });
  }
  return cfg;
}

// ─── GET /api/agent/dashboard ─────────────────────────────────────────────
/**
 * Returns a full snapshot of the agent state for the frontend Panel del Agente.
 */
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const today = new Date();

    // Current running execution (if any)
    const activeExecution = await prisma.agentExecution.findFirst({
      where: { status: { in: ['RUNNING', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
    });
    const latestExecution = activeExecution || await prisma.agentExecution.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    // Portfolio stats
    const allOps = await prisma.operation.findMany({
      where: { archived: false },
    });

    let totalPending = 0;
    let vencidas = 0;
    let hoyVence = 0;
    let porVencer = 0;
    let pagadasHoy = 0;

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    for (const op of allOps) {
      if (op.fechaPago) {
        if (op.fechaPago >= todayStart && op.fechaPago < todayEnd) pagadasHoy++;
        continue;
      }
      if (op.excluir) continue;
      totalPending++;
      const diff = Math.ceil(
        (new Date(op.fechaVence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff < 0) vencidas++;
      else if (diff === 0) hoyVence++;
      else if (diff <= 5) porVencer++;
    }

    const pendingAmount = allOps
      .filter((op) => !op.fechaPago && !op.excluir)
      .reduce((sum, op) => sum + op.monto, 0);

    // Pending actions (not yet executed)
    const pendingActions = await prisma.agentAction.findMany({
      where: { status: 'PENDING' },
      include: { client: { select: { nombre: true } } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Recent completed/failed actions (last 20)
    const recentActions = await prisma.agentAction.findMany({
      where: { status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
      include: { client: { select: { nombre: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const actionPolicies = getAgentActionPolicies();
    const policyByType = new Map(actionPolicies.map((policy) => [policy.actionType, policy]));
    const agentStatus = deriveAgentLifecycle(activeExecution || latestExecution);

    res.json({
      status: agentStatus,
      currentExecution: latestExecution
        ? {
            id: latestExecution.id,
            startedAt: latestExecution.startedAt,
            phase: latestExecution.phase,
            progress: latestExecution.progress,
            triggeredBy: latestExecution.triggeredBy,
            status: latestExecution.status,
            totalActions: latestExecution.totalActions,
            completedActions: latestExecution.completedActions,
            failedActions: latestExecution.failedActions,
            cancelledActions: latestExecution.cancelledActions,
            notes: latestExecution.notes,
          }
        : null,
      nextScheduledRun: nextScheduledRun(),
      stats: {
        totalClients: await prisma.client.count({ where: { estado: 'ACTIVO' } }),
        totalOperations: allOps.length,
        pendingAmount,
        vencidas,
        hoyVence,
        porVencer,
        pagadasHoy,
      },
      pendingActions: pendingActions.map((a) => ({
        id: a.id,
        executionId: a.executionId,
        clientId: a.clientId,
        clientName: a.client?.nombre || '—',
        action: a.type,
        status: a.status,
        scheduledAt: a.createdAt,
        messagePreview: a.message?.substring(0, 120),
        approvalRequired: policyByType.get(a.type)?.approvalRequired ?? true,
        risk: policyByType.get(a.type)?.risk ?? 'MEDIUM',
        policyReason: policyByType.get(a.type)?.reason ?? 'Requiere aprobacion del operador',
      })),
      recentActions: recentActions.map((a) => ({
        id: a.id,
        executionId: a.executionId,
        clientId: a.clientId,
        clientName: a.client?.nombre || '—',
        action: a.type,
        status: a.status,
        sentAt: a.sentAt || a.updatedAt,
        error: a.error,
      })),
      actionPolicies,
    });
  } catch (error) {
    console.error('[agent/dashboard]', error);
    res.status(500).json({ error: 'Error loading agent dashboard' });
  }
});

// ─── GET /api/agent/execution/status ─────────────────────────────────────
router.get('/execution/status', async (_req: Request, res: Response) => {
  try {
    const execution = await prisma.agentExecution.findFirst({
      where: { status: { in: ['RUNNING', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
      include: { actions: { where: { status: 'PENDING' }, take: 5 } },
    });
    if (!execution) {
      return res.json({ status: 'IDLE', execution: null });
    }
    res.json({ status: execution.status, execution });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching execution status' });
  }
});

// ─── GET /api/agent/execution/history ────────────────────────────────────
router.get('/execution/history', async (_req: Request, res: Response) => {
  try {
    const executions = await prisma.agentExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: 30,
    });
    res.json({ executions });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching execution history' });
  }
});

// ─── GET /api/agent/execution/:id ────────────────────────────────────────
router.get('/execution/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const execution = await prisma.agentExecution.findUnique({
      where: { id },
      include: {
        actions: {
          include: { client: { select: { nombre: true, rfc: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json({ execution });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching execution' });
  }
});

// ─── POST /api/agent/execution/start ─────────────────────────────────────
router.post('/execution/start', async (_req: Request, res: Response) => {
  try {
    // Check if there's already a running execution
    const existing = await prisma.agentExecution.findFirst({
      where: { status: { in: ['RUNNING', 'PAUSED'] } },
    });
    if (existing) {
      return res.status(409).json({
        error: 'El agente ya tiene una ejecución activa',
        executionId: existing.id,
        status: existing.status,
      });
    }

    const result = await planAgentExecution({
      prisma,
      triggeredBy: 'MANUAL',
      tenantId: 'default',
    });

    res.status(201).json({
      message: result.planned > 0
        ? `Ejecucion planificada con ${result.planned} accion(es) pendientes de aprobacion`
        : 'Ejecucion completada sin acciones nuevas',
      execution: {
        id: result.execution.id,
        status: result.planned > 0 ? 'RUNNING' : 'COMPLETED',
      },
      summary: {
        planned: result.planned,
        approvalRequired: result.approvalRequired,
        automatic: result.automatic,
        skippedDuplicates: result.skippedDuplicates,
        skippedRateLimit: result.skippedRateLimit,
      },
      actionPolicies: result.policies,
    });
  } catch (error) {
    console.error('[agent/start]', error);
    res.status(500).json({ error: 'Error starting execution' });
  }
});

// ─── POST /api/agent/execution/stop ──────────────────────────────────────
router.post('/execution/stop', async (_req: Request, res: Response) => {
  try {
    const execution = await prisma.agentExecution.findFirst({
      where: { status: { in: ['RUNNING', 'PAUSED'] } },
      orderBy: { startedAt: 'desc' },
    });
    if (!execution) {
      return res.status(404).json({ error: 'No hay ejecución activa para detener' });
    }

    // Cancel queued and handoff-ready actions in this execution.
    const cancelled = await prisma.agentAction.updateMany({
      where: { executionId: execution.id, status: { in: ['PENDING', 'EXECUTING'] } },
      data: { status: 'CANCELLED' },
    });

    const updated = await prisma.agentExecution.update({
      where: { id: execution.id },
      data: {
        status: 'STOPPED',
        completedAt: new Date(),
        cancelledActions: { increment: cancelled.count },
        notes: `Detenido manualmente por el operador. ${cancelled.count} accion(es) cancelada(s).`,
      },
    });

    res.json({ message: 'Agente detenido', execution: { id: updated.id, status: updated.status } });
  } catch (error) {
    res.status(500).json({ error: 'Error stopping execution' });
  }
});

// ─── POST /api/agent/execution/pause ─────────────────────────────────────
router.post('/execution/pause', async (_req: Request, res: Response) => {
  try {
    const execution = await prisma.agentExecution.findFirst({
      where: { status: 'RUNNING' },
      orderBy: { startedAt: 'desc' },
    });
    if (!execution) {
      return res.status(404).json({ error: 'No hay ejecución en curso para pausar' });
    }

    const updated = await prisma.agentExecution.update({
      where: { id: execution.id },
      data: { status: 'PAUSED' },
    });

    res.json({ message: 'Agente pausado', execution: { id: updated.id, status: updated.status } });
  } catch (error) {
    res.status(500).json({ error: 'Error pausing execution' });
  }
});

// ─── POST /api/agent/execution/resume ────────────────────────────────────
router.post('/execution/resume', async (_req: Request, res: Response) => {
  try {
    const execution = await prisma.agentExecution.findFirst({
      where: { status: 'PAUSED' },
      orderBy: { startedAt: 'desc' },
    });
    if (!execution) {
      return res.status(404).json({ error: 'No hay ejecución pausada para reanudar' });
    }

    const updated = await prisma.agentExecution.update({
      where: { id: execution.id },
      data: { status: 'RUNNING' },
    });

    res.json({ message: 'Agente reanudado', execution: { id: updated.id, status: updated.status } });
  } catch (error) {
    res.status(500).json({ error: 'Error resuming execution' });
  }
});

// ─── GET /api/agent/actions/pending ──────────────────────────────────────
router.get('/actions/pending', async (_req: Request, res: Response) => {
  try {
    const actions = await prisma.agentAction.findMany({
      where: { status: 'PENDING' },
      include: { client: { select: { nombre: true, telefono: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ total: actions.length, actions });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching pending actions' });
  }
});

// ─── POST /api/agent/actions/cancel/:id ──────────────────────────────────
router.post('/actions/cancel/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const action = await prisma.agentAction.findUnique({ where: { id } });
    if (!action) {
      return res.status(404).json({ error: 'Acción no encontrada' });
    }
    if (!['PENDING', 'EXECUTING'].includes(action.status)) {
      return res.status(400).json({ error: `No se puede cancelar una acción en estado ${action.status}` });
    }

    const updated = await prisma.agentAction.update({
      where: { id },
      data: { status: 'CANCELLED', error: 'Cancelada por el operador' },
    });

    await prisma.logEntry.create({
      data: {
        clientId: action.clientId || null,
        tipo: 'AGENT_ACTION_CANCELLED',
        variante: action.type,
        resultado: 'CANCELLED',
        mensaje: `Accion ${id} cancelada por el operador`,
        telefono: action.phone || null,
        modo: 'CONTROLLED_OPERATOR',
      },
    });

    res.json({ message: 'Acción cancelada', action: { id: updated.id, status: updated.status } });
  } catch (error) {
    res.status(500).json({ error: 'Error cancelling action' });
  }
});

// ─── POST /api/agent/actions/cancel-all ──────────────────────────────────
router.post('/actions/cancel-all', async (_req: Request, res: Response) => {
  try {
    const result = await prisma.agentAction.updateMany({
      where: { status: { in: ['PENDING', 'EXECUTING'] } },
      data: { status: 'CANCELLED', error: 'Cancelada por el operador' },
    });
    res.json({ message: `${result.count} acciones canceladas`, count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Error cancelling actions' });
  }
});

// ─── POST /api/agent/actions/approve/:id ─────────────────────────────────
router.post('/actions/approve/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    const updated = await approvePendingAction({
      prisma,
      actionId: id,
      tenantId: 'default',
      approvedBy: user?.email || user?.userId || 'operator',
    });

    res.json({
      message: 'Accion aprobada para handoff controlado; no se envio directamente',
      action: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    if (error instanceof AgentPlannerError) {
      return res.status(error.httpStatus).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: 'Error approving action' });
  }
});

// ─── GET /api/agent/config ────────────────────────────────────────────────
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching agent config' });
  }
});

// ─── PUT /api/agent/config ────────────────────────────────────────────────
router.put('/config', async (req: Request, res: Response) => {
  try {
    const {
      scheduleEnabled,
      scheduleCron,
      maxDailySends,
      rateLimitMs,
      sendPdfEnabled,
      notifyOnFail,
    } = req.body;

    const existing = await getOrCreateConfig();

    const updated = await prisma.agentConfig.update({
      where: { id: existing.id },
      data: {
        ...(scheduleEnabled !== undefined && { scheduleEnabled }),
        ...(scheduleCron !== undefined && { scheduleCron }),
        ...(maxDailySends !== undefined && { maxDailySends }),
        ...(rateLimitMs !== undefined && { rateLimitMs }),
        ...(sendPdfEnabled !== undefined && { sendPdfEnabled }),
        ...(notifyOnFail !== undefined && { notifyOnFail }),
      },
    });

    res.json({ message: 'Configuración actualizada', config: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error updating agent config' });
  }
});

// ─── Endpoints para n8n (solo-lectura, usados por los workflows) ──────────

// GET /api/agent/operations/pending
router.get('/operations/pending', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const ops = await prisma.operation.findMany({
      where: { archived: false, fechaPago: null, excluir: false },
      include: { client: true },
      orderBy: { fechaVence: 'asc' },
    });

    const classified = ops.map((op) => {
      const diff = Math.ceil(
        (new Date(op.fechaVence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      let urgency: string;
      if (diff < 0) urgency = 'VENCIDA';
      else if (diff === 0) urgency = 'HOY_VENCE';
      else if (diff <= 5) urgency = 'POR_VENCER';
      else urgency = 'AL_CORRIENTE';

      return {
        id: op.id,
        clientId: op.clientId,
        clienteNombre: op.client?.nombre || '',
        clienteRfc: op.client?.rfc || '',
        clienteTelefono: (op.client as any)?.telefono || '',
        tipo: op.tipo,
        monto: op.monto,
        fechaVence: op.fechaVence,
        diasDiferencia: diff,
        urgency,
      };
    });

    res.json({
      total: classified.length,
      byUrgency: {
        vencidas: classified.filter((o) => o.urgency === 'VENCIDA').length,
        hoyVence: classified.filter((o) => o.urgency === 'HOY_VENCE').length,
        porVencer: classified.filter((o) => o.urgency === 'POR_VENCER').length,
        alCorriente: classified.filter((o) => o.urgency === 'AL_CORRIENTE').length,
      },
      operations: classified,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching pending operations' });
  }
});

// GET /api/agent/clients/active
router.get('/clients/active', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        id: true,
        nombre: true,
        rfc: true,
        telefono: true,
        email: true,
        asesor: true,
        _count: { select: { operations: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json({ total: clients.length, clients });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching active clients' });
  }
});

export default router;
