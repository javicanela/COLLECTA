import { describe, expect, it } from 'vitest';
import { adaptCanonicalRowsToImportRows } from './legacyAdapter';

describe('smartImport legacyAdapter', () => {
  it('maps confirmed canonical rows to processImportBatch rows', () => {
    const rows = adaptCanonicalRowsToImportRows([
      {
        rowNumber: 2,
        sourceRowIndex: 1,
        client: {
          rfc: 'abc010101abc',
          nombre: 'Cliente Uno',
          telefono: '6641234567',
          email: 'uno@example.com',
        },
        operation: {
          tipo: 'FISCAL',
          descripcion: 'Honorarios mensuales',
          monto: 1250.5,
          fechaVence: '2026-04-15T00:00:00.000Z',
        },
        warnings: [],
      },
    ]);

    expect(rows).toEqual([
      {
        rfc: 'ABC010101ABC',
        nombre: 'Cliente Uno',
        telefono: '6641234567',
        email: 'uno@example.com',
        monto: 1250.5,
        concepto: 'FISCAL',
        fechaVence: '2026-04-15T00:00:00.000Z',
      },
    ]);
  });

  it('omits rows without enough client or amount data', () => {
    const rows = adaptCanonicalRowsToImportRows([
      {
        rowNumber: 3,
        sourceRowIndex: 2,
        client: { nombre: 'Sin RFC' },
        operation: { tipo: 'FISCAL', monto: 2000 },
        warnings: [],
      },
      {
        rowNumber: 4,
        sourceRowIndex: 3,
        client: { rfc: 'LOPE8001019Q8', nombre: 'Sin monto' },
        operation: { tipo: 'FISCAL' },
        warnings: [],
      },
    ]);

    expect(rows).toEqual([]);
  });
});
