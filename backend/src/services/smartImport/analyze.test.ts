import { describe, expect, it } from 'vitest';
import { analyzeSmartImportSamples } from './analyze';

describe('smartImport analyze service', () => {
  it('analyzes normalized samples without raw workbook persistence', () => {
    const result = analyzeSmartImportSamples({
      source: { sourceId: 'sample-1', fileName: 'clientes.csv', fileType: 'csv' },
      sheets: [
        {
          sheetId: 'sample-1:sheet-1',
          name: 'clientes.csv',
          rows: [
            ['RFC', 'Nombre', 'Monto', 'Fecha de Vencimiento', 'Concepto'],
            ['ABC010101ABC', 'Cliente Uno', '$1,250.00', '2026-04-15', 'FISCAL'],
          ],
        },
      ],
    });

    expect(result.analysisId).toMatch(/^sia_/);
    expect(result.providerUsed).toBe('deterministic');
    expect(result.providersAttempted).toEqual(['deterministic']);
    expect(result.challengeResult.status).toMatch(/confirmed|changed|downgraded/);
    expect(result.previewCanonicalRows[0].client.rfc).toBe('ABC010101ABC');
    expect(result.legacyRows[0]).toMatchObject({ rfc: 'ABC010101ABC', concepto: 'FISCAL', monto: 1250 });
  });
});
