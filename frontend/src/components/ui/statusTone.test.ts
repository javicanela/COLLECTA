import { describe, expect, it } from 'vitest';
import { getOperationStatusTone, getToneClasses, normalizeStatusKey } from './statusTone';

describe('status tone helpers', () => {
  it('normalizes accented and spaced status values', () => {
    expect(normalizeStatusKey('Producción')).toBe('PRODUCCION');
    expect(normalizeStatusKey(' hoy vence ')).toBe('HOY VENCE');
  });

  it('maps operation statuses to operational tones', () => {
    expect(getOperationStatusTone('VENCIDO')).toBe('danger');
    expect(getOperationStatusTone('HOY VENCE')).toBe('warning');
    expect(getOperationStatusTone('PAGADO')).toBe('success');
    expect(getOperationStatusTone('ARCHIVADO')).toBe('neutral');
  });

  it('exposes stable classes for shared UI primitives', () => {
    const classes = getToneClasses('danger', 'soft');

    expect(classes).toContain('text-[var(--brand-danger)]');
    expect(classes).toContain('border-[var(--brand-danger)]/25');
  });
});
