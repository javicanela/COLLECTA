import { describe, expect, it } from 'vitest';
import {
  buildPriorityQueue,
  filterOperationsForWorkbench,
  getClientOpenBalance,
  getOperationPriority,
} from './operationWorkbench';
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
    nombre: 'Cliente Prueba',
    telefono: null,
    email: 'prueba@collecta.test',
    estado: 'ACTIVO',
  },
};

describe('operationWorkbench', () => {
  it('classifies vencida operations as urgent and explains the reason', () => {
    const priority = getOperationPriority(baseOperation);

    expect(priority.level).toBe('urgent');
    expect(priority.label).toBe('Atencion inmediata');
    expect(priority.reason).toContain('10 dias vencida');
  });

  it('calculates client open balance excluding paid and excluded operations', () => {
    const balance = getClientOpenBalance([
      baseOperation,
      { ...baseOperation, id: 'op-2', monto: 700, calculatedStatus: 'PAGADO', estatus: 'PAGADO' },
      { ...baseOperation, id: 'op-3', monto: 300, excluir: true },
      { ...baseOperation, id: 'op-4', monto: 200, calculatedStatus: 'POR VENCER', fechaPago: null },
    ]);

    expect(balance.total).toBe(1700);
    expect(balance.count).toBe(2);
  });

  it('builds an ordered priority queue without hiding urgent missing-contact operations', () => {
    const operations: Operation[] = [
      { ...baseOperation, id: 'op-overdue', monto: 900, calculatedStatus: 'VENCIDO', diasRestantes: -4, client: { ...baseOperation.client!, nombre: 'Cliente Vencido', telefono: null, email: null } },
      { ...baseOperation, id: 'op-today', monto: 800, calculatedStatus: 'HOY VENCE', diasRestantes: 0, client: { ...baseOperation.client!, nombre: 'Cliente Hoy', telefono: '555', email: null } },
      { ...baseOperation, id: 'op-soon', monto: 700, calculatedStatus: 'POR VENCER', diasRestantes: 2, client: { ...baseOperation.client!, nombre: 'Cliente Proximo', telefono: null, email: 'proximo@example.com' } },
      { ...baseOperation, id: 'op-missing', monto: 600, calculatedStatus: 'AL CORRIENTE', diasRestantes: 12, client: { ...baseOperation.client!, nombre: 'Cliente Sin Contacto', telefono: null, email: null } },
      { ...baseOperation, id: 'op-rest', monto: 500, calculatedStatus: 'AL CORRIENTE', diasRestantes: 8, client: { ...baseOperation.client!, nombre: 'Cliente Resto', telefono: '555', email: null } },
      { ...baseOperation, id: 'op-paid', monto: 400, calculatedStatus: 'PAGADO', estatus: 'PAGADO', fechaPago: '2026-05-02T00:00:00.000Z' },
      { ...baseOperation, id: 'op-excluded', monto: 300, calculatedStatus: 'EXCLUIDO', estatus: 'EXCLUIDO', excluir: true },
    ];

    const buckets = buildPriorityQueue(operations);

    expect(buckets.map(bucket => bucket.id)).toEqual([
      'overdue',
      'dueToday',
      'dueSoon',
      'missingContact',
      'other',
    ]);
    expect(buckets[0].operations.map(operation => operation.id)).toEqual(['op-overdue']);
    expect(buckets[0].missingContactCount).toBe(1);
    expect(buckets[3].operations.map(operation => operation.id)).toEqual(['op-missing']);
    expect(buckets[4].operations.map(operation => operation.id)).toEqual(['op-rest', 'op-paid', 'op-excluded']);
  });

  it('filters the workbench by missing contact, excluded and paid states', () => {
    const operations: Operation[] = [
      { ...baseOperation, id: 'op-open-missing', calculatedStatus: 'AL CORRIENTE', diasRestantes: 9, client: { ...baseOperation.client!, telefono: null, email: null } },
      { ...baseOperation, id: 'op-open-contact', calculatedStatus: 'AL CORRIENTE', diasRestantes: 9, client: { ...baseOperation.client!, telefono: '555', email: null } },
      { ...baseOperation, id: 'op-paid-missing', calculatedStatus: 'PAGADO', estatus: 'PAGADO', fechaPago: '2026-05-02T00:00:00.000Z', client: { ...baseOperation.client!, telefono: null, email: null } },
      { ...baseOperation, id: 'op-excluded-missing', calculatedStatus: 'EXCLUIDO', estatus: 'EXCLUIDO', excluir: true, client: { ...baseOperation.client!, telefono: null, email: null } },
    ];

    expect(filterOperationsForWorkbench(operations, 'missingContact').map(operation => operation.id)).toEqual(['op-open-missing']);
    expect(filterOperationsForWorkbench(operations, 'paid').map(operation => operation.id)).toEqual(['op-paid-missing']);
    expect(filterOperationsForWorkbench(operations, 'excluded').map(operation => operation.id)).toEqual(['op-excluded-missing']);
    expect(filterOperationsForWorkbench(operations, 'all')).toEqual(operations);
  });

  it('keeps paid and excluded operations out of urgent buckets even with stale due data', () => {
    const buckets = buildPriorityQueue([
      { ...baseOperation, id: 'op-paid-stale', calculatedStatus: 'VENCIDO', diasRestantes: -30, fechaPago: '2026-05-02T00:00:00.000Z' },
      { ...baseOperation, id: 'op-excluded-stale', calculatedStatus: 'VENCIDO', diasRestantes: -20, excluir: true },
    ]);

    expect(buckets.find(bucket => bucket.id === 'overdue')?.operations).toEqual([]);
    expect(buckets.find(bucket => bucket.id === 'other')?.operations.map(operation => operation.id)).toEqual([
      'op-paid-stale',
      'op-excluded-stale',
    ]);
  });

  it('treats blank phone and email values as missing contact', () => {
    const operations: Operation[] = [
      { ...baseOperation, id: 'op-blank-contact', calculatedStatus: 'AL CORRIENTE', diasRestantes: 7, client: { ...baseOperation.client!, telefono: '   ', email: '' } },
      { ...baseOperation, id: 'op-no-client', calculatedStatus: 'AL CORRIENTE', diasRestantes: 7, client: undefined },
      { ...baseOperation, id: 'op-email-contact', calculatedStatus: 'AL CORRIENTE', diasRestantes: 7, client: { ...baseOperation.client!, telefono: '   ', email: 'conta@example.com' } },
    ];

    expect(filterOperationsForWorkbench(operations, 'missingContact').map(operation => operation.id)).toEqual([
      'op-blank-contact',
      'op-no-client',
    ]);
  });
});
