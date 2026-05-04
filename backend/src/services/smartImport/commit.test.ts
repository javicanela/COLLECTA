import { describe, expect, it, vi } from 'vitest';
import { commitSmartImportRows } from './commit';

describe('smartImport commit service', () => {
  it('calls the supplied batch processor with adapted legacy rows', async () => {
    const processor = vi.fn().mockResolvedValue({
      clientesCreados: 1,
      clientesActualizados: 0,
      operacionesCreadas: 1,
      operacionesOmitidas: 0,
      errores: [],
    });

    const result = await commitSmartImportRows({
      confirmedRows: [
        {
          rowNumber: 2,
          sourceRowIndex: 1,
          client: { rfc: 'ABC010101ABC', nombre: 'Cliente Uno' },
          operation: { tipo: 'FISCAL', monto: 1250, fechaVence: '2026-04-15' },
          warnings: [],
        },
      ],
    }, processor);

    expect(processor).toHaveBeenCalledWith([
      {
        rfc: 'ABC010101ABC',
        nombre: 'Cliente Uno',
        monto: 1250,
        concepto: 'FISCAL',
        fechaVence: '2026-04-15',
      },
    ]);
    expect(result.success).toBe(true);
    expect(result.legacyRows).toHaveLength(1);
    expect(result.operacionesCreadas).toBe(1);
  });
});
