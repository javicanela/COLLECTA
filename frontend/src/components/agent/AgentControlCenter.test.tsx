import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AgentControlCenter, getAgentStatusCopy, getAvailableAgentCommands } from './AgentControlCenter';
import { ApprovalQueue, buildCancelConfirmationMessage } from './ApprovalQueue';
import { ActionPolicyMatrix } from './ActionPolicyMatrix';
import { AgentExecutionSummary } from './AgentExecutionSummary';
import { AgentRunTimeline } from './AgentRunTimeline';

const execution = {
  id: 'exec-17',
  status: 'RUNNING',
  phase: 'PLAN_APPROVALS',
  progress: 62,
  startedAt: '2026-05-11T16:00:00.000Z',
  triggeredBy: 'MANUAL',
  totalActions: 9,
  completedActions: 3,
  failedActions: 1,
  cancelledActions: 2,
  notes: 'Operador revisando cartera critica',
};

const pendingAction = {
  id: 'act-1',
  executionId: 'exec-17',
  clientId: 'client-1',
  clientName: 'Despacho Norte',
  action: 'WHATSAPP_MESSAGE',
  status: 'PENDING',
  scheduledAt: '2026-05-11T16:05:00.000Z',
  messagePreview: 'Hola, detectamos una factura vencida por $18,240.',
  approvalRequired: true,
  risk: 'HIGH' as const,
  policyReason: 'Saldo vencido y contacto directo por WhatsApp',
};

const policy = {
  actionType: 'WHATSAPP_MESSAGE',
  automatic: false,
  approvalRequired: true,
  risk: 'HIGH' as const,
  channel: 'WHATSAPP' as const,
  reason: 'Mensajes al cliente requieren validacion del operador',
};

describe('agent control center helpers', () => {
  it('maps lifecycle states to operational language', () => {
    expect(getAgentStatusCopy('PENDING').label).toBe('Pendiente de operador');
    expect(getAgentStatusCopy('RUNNING').description).toContain('orquestando');
    expect(getAgentStatusCopy('PAUSED').label).toBe('Pausado');
    expect(getAgentStatusCopy('COMPLETED').label).toBe('Completado');
    expect(getAgentStatusCopy('STOPPED').description).toContain('detuvo');
    expect(getAgentStatusCopy('FAILED').label).toBe('Fallido');
  });

  it('exposes only safe commands for each lifecycle state', () => {
    expect(getAvailableAgentCommands('PENDING').map((cmd) => cmd.endpoint)).toEqual([
      '/agent/execution/start',
    ]);
    expect(getAvailableAgentCommands('RUNNING').map((cmd) => cmd.endpoint)).toEqual([
      '/agent/execution/pause',
      '/agent/execution/stop',
    ]);
    expect(getAvailableAgentCommands('PAUSED').map((cmd) => cmd.endpoint)).toEqual([
      '/agent/execution/resume',
      '/agent/execution/stop',
    ]);
  });
});

describe('agent component rendering', () => {
  it('renders the control center as an operative command surface', () => {
    const html = renderToStaticMarkup(
      <AgentControlCenter
        status="RUNNING"
        currentExecution={execution}
        nextScheduledRun="2026-06-01T16:00:00.000Z"
        pendingApprovals={1}
        failedActions={1}
        loadingCommand="/agent/execution/pause"
        onCommand={() => undefined}
        onRefresh={() => undefined}
      />,
    );

    expect(html).toContain('Centro de control operativo');
    expect(html).toContain('Ejecucion en curso');
    expect(html).toContain('Pausar');
    expect(html).toContain('Detener');
    expect(html).toContain('1 aprobacion pendiente');
  });

  it('renders approval queue details required by operators', () => {
    const html = renderToStaticMarkup(
      <ApprovalQueue
        actions={[pendingAction]}
        selectedIds={new Set(['act-1'])}
        loadingActionId={null}
        onApprove={() => undefined}
        onCancel={() => undefined}
        onCancelAll={() => undefined}
        onCancelSelected={() => undefined}
        onToggleSelect={() => undefined}
      />,
    );

    expect(html).toContain('Cola de aprobaciones');
    expect(html).toContain('Ver detalle');
    expect(html).toContain('Riesgo alto');
    expect(html).toContain('Razon de aprobacion');
    expect(html).toContain('Hola, detectamos una factura vencida');
  });

  it('requires explicit confirmation copy for destructive queue actions', () => {
    expect(buildCancelConfirmationMessage('single', 1)).toContain('cancelar esta accion');
    expect(buildCancelConfirmationMessage('selected', 3)).toContain('3 acciones seleccionadas');
    expect(buildCancelConfirmationMessage('all', 12)).toContain('cancelar las 12 acciones pendientes');
  });

  it('renders policy matrix, execution summary, and run timeline with status language', () => {
    const html = renderToStaticMarkup(
      <div>
        <ActionPolicyMatrix policies={[policy]} />
        <AgentExecutionSummary
          stats={{
            totalClients: 24,
            totalOperations: 43,
            pendingAmount: 18240,
            vencidas: 6,
            hoyVence: 3,
            porVencer: 9,
            pagadasHoy: 2,
          }}
          currentExecution={execution}
          recentActions={[{ ...pendingAction, status: 'FAILED', sentAt: pendingAction.scheduledAt, error: 'Proveedor sin respuesta' }]}
        />
        <AgentRunTimeline
          executions={[execution, { ...execution, id: 'exec-18', status: 'FAILED', phase: 'SEND' }]}
          expandedExecutionId="exec-17"
          loading={false}
          onLoadHistory={() => undefined}
          onToggleExecution={() => undefined}
        />
      </div>,
    );

    expect(html).toContain('Matriz de politica');
    expect(html).toContain('Resumen ejecutivo');
    expect(html).toContain('$18,240');
    expect(html).toContain('Linea de ejecuciones');
    expect(html).toContain('Fallido');
  });
});
