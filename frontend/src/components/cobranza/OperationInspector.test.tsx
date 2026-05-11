import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OperationInspector } from './OperationInspector';
import type { Operation } from '../../types';

const operation: Operation = {
  id: 'op-1',
  clientId: 'client-1',
  tipo: 'Declaracion',
  descripcion: 'IVA mensual',
  monto: 1500,
  fechaVence: '2026-05-01T00:00:00.000Z',
  estatus: 'PENDIENTE',
  calculatedStatus: 'VENCIDO',
  diasRestantes: -10,
  excluir: false,
  archived: false,
  createdAt: '2026-04-01T00:00:00.000Z',
  client: {
    id: 'client-1',
    rfc: 'AAA010101AAA',
    nombre: 'Cliente Demo',
    telefono: null,
    email: 'demo@example.com',
    asesor: 'Ana',
    estado: 'ACTIVO',
  },
};

const requiredProps = {
  open: true,
  activeTab: 'activas' as const,
  sendingStatement: false,
  clientOperations: [operation, { ...operation, id: 'op-2', monto: 200, calculatedStatus: 'POR VENCER' as const }],
  onClose: vi.fn(),
  onMarkPaid: vi.fn(),
  onUnmarkPaid: vi.fn(),
  onSendWA: vi.fn(),
  onGeneratePDF: vi.fn(),
  onSendStatement: vi.fn(),
  onArchive: vi.fn(),
  onUnarchive: vi.fn(),
  onToggleExclude: vi.fn(),
  onDelete: vi.fn(),
};

describe('OperationInspector', () => {
  it('renders operation context, balance and disabled action reasons', () => {
    const html = renderToStaticMarkup(
      <OperationInspector
        operation={operation}
        {...requiredProps}
      />,
    );

    expect(html).toContain('Cliente Demo');
    expect(html).toContain('Atencion inmediata');
    expect(html).toContain('Saldo del cliente');
    expect(html).toContain('$1,700.00');
    expect(html).toContain('Falta telefono del cliente');
  });

  it('does not render when there is no selected operation', () => {
    const html = renderToStaticMarkup(
      <OperationInspector
        operation={null}
        {...requiredProps}
      />,
    );

    expect(html).toBe('');
  });
});

