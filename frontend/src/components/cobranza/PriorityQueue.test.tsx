import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PriorityQueue } from './PriorityQueue';
import type { Operation } from '../../types';

const baseOperation: Operation = {
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
  client: {
    id: 'client-1',
    rfc: 'AAA010101AAA',
    nombre: 'Cliente Demo',
    telefono: null,
    email: null,
    estado: 'ACTIVO',
  },
};

function renderQueue(operations: Operation[]) {
  return renderToStaticMarkup(
    <PriorityQueue
      operations={operations}
      activeFilter="all"
      onFilterChange={vi.fn()}
      onInspect={vi.fn()}
      formatCurrency={(amount) => `$${amount.toLocaleString('es-MX')}`}
    />,
  );
}

describe('PriorityQueue', () => {
  it('renders the prioritized buckets and marks missing-contact debtors', () => {
    const html = renderQueue([
      { ...baseOperation, id: 'op-overdue', client: { ...baseOperation.client!, nombre: 'Cliente Vencido' } },
      { ...baseOperation, id: 'op-today', calculatedStatus: 'HOY VENCE', diasRestantes: 0, client: { ...baseOperation.client!, nombre: 'Cliente Hoy', telefono: '555' } },
      { ...baseOperation, id: 'op-soon', calculatedStatus: 'POR VENCER', diasRestantes: 2, client: { ...baseOperation.client!, nombre: 'Cliente Proximo', email: 'proximo@example.com' } },
      { ...baseOperation, id: 'op-missing', calculatedStatus: 'AL CORRIENTE', diasRestantes: 8, client: { ...baseOperation.client!, nombre: 'Cliente Sin Contacto' } },
      { ...baseOperation, id: 'op-rest', calculatedStatus: 'AL CORRIENTE', diasRestantes: 10, client: { ...baseOperation.client!, nombre: 'Cliente Resto', telefono: '555' } },
    ]);

    expect(html).toContain('Cola priorizada');
    expect(html).toContain('VENCIDO');
    expect(html).toContain('HOY VENCE');
    expect(html).toContain('POR VENCER');
    expect(html).toContain('Sin contacto');
    expect(html).toContain('Resto');
    expect(html).toContain('Cliente Vencido');
    expect(html).toContain('Falta contacto');
  });

  it('renders loading, empty and error states', () => {
    expect(renderToStaticMarkup(
      <PriorityQueue
        operations={[]}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onInspect={vi.fn()}
        formatCurrency={(amount) => `$${amount}`}
        isLoading
      />,
    )).toContain('Armando cola');

    expect(renderQueue([])).toContain('Sin operaciones en cola');

    expect(renderToStaticMarkup(
      <PriorityQueue
        operations={[]}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onInspect={vi.fn()}
        formatCurrency={(amount) => `$${amount}`}
        error="No se pudo cargar cartera"
      />,
    )).toContain('No se pudo cargar cartera');
  });

  it('limits each bucket preview and keeps the remaining operations visible in table context', () => {
    const html = renderToStaticMarkup(
      <PriorityQueue
        operations={[
          { ...baseOperation, id: 'op-1', client: { ...baseOperation.client!, nombre: 'Cliente 1' } },
          { ...baseOperation, id: 'op-2', client: { ...baseOperation.client!, nombre: 'Cliente 2' } },
          { ...baseOperation, id: 'op-3', client: { ...baseOperation.client!, nombre: 'Cliente 3' } },
        ]}
        activeFilter="all"
        onFilterChange={vi.fn()}
        onInspect={vi.fn()}
        formatCurrency={(amount) => `$${amount}`}
        maxRowsPerBucket={2}
      />,
    );

    expect(html).toContain('Cliente 1');
    expect(html).toContain('Cliente 2');
    expect(html).not.toContain('Cliente 3');
    expect(html).toContain('1 mas en la tabla');
  });
});
