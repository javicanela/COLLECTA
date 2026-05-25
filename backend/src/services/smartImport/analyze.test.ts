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

  it('keeps the challenge decision when a stronger alternative region replaces the initial interpretation', () => {
    const result = analyzeSmartImportSamples({
      source: { sourceId: 'multi-region', fileName: 'cartera.xlsx', fileType: 'xlsx' },
      sheets: [
        {
          sheetId: 'multi-region:sheet-1',
          name: 'Cartera',
          rows: [
            ['RFC', 'Nombre', 'Monto', 'Fecha de Vencimiento', 'Concepto'],
            ['Esto parece encabezado', 'pero no contiene datos validos', '', '', ''],
            ['', '', '', '', ''],
            ['RFC', 'Nombre', 'Monto', 'Fecha de Vencimiento', 'Concepto', 'Email'],
            ['ABC010101ABC', 'Cliente Uno', '$1,250.00', '2026-04-15', 'FISCAL', 'uno@example.com'],
            ['LOPE8001019Q8', 'Cliente Dos', '$2,500.00', '2026-04-30', 'SEGURIDAD_SOCIAL', 'dos@example.com'],
          ],
        },
      ],
    });

    expect(result.challengeResult.status).toBe('changed');
    expect(result.challengeResult.findings).toContain('challenge:alternative_region_stronger');
    expect(result.selectedRegion.regionId).toBe(result.challengeResult.selectedRegionId);
    expect(result.previewCanonicalRows).toHaveLength(2);
  });

  it('adds row-level source trace metadata to preview rows', () => {
    const result = analyzeSmartImportSamples({
      source: { sourceId: 'pdf-1', fileName: 'estado.pdf', fileType: 'pdf_text' },
      sheets: [
        {
          sheetId: 'pdf-1:text-candidates',
          name: 'PDF text candidates',
          rows: [
            ['RFC', 'Nombre', 'Monto', 'Fecha de Vencimiento'],
            ['ABC010101ABC', 'Cliente Uno', '$1,250.00', '2026-04-15'],
          ],
        },
      ],
    });

    expect(result.previewCanonicalRows[0].source).toEqual({
      fileName: 'estado.pdf',
      sheetName: 'PDF text candidates',
      regionId: result.selectedRegion.regionId,
      extractor: 'backend-deterministic',
    });
  });

  it('downgrades ambiguous long text concept mappings during the mandatory challenge', () => {
    const result = analyzeSmartImportSamples({
      source: { sourceId: 'ambiguous', fileName: 'conceptos.csv', fileType: 'csv' },
      sheets: [
        {
          sheetId: 'ambiguous:sheet-1',
          name: 'conceptos.csv',
          rows: [
            ['RFC', 'Nombre', 'Monto', 'Tipo'],
            ['ABC010101ABC', 'Cliente Uno', '$1,250.00', 'Honorarios contables mensuales con revision fiscal completa'],
            ['LOPE8001019Q8', 'Cliente Dos', '$2,500.00', 'Regularizacion anual y seguimiento de seguridad social'],
          ],
        },
      ],
    });

    expect(result.challengeResult.status).toBe('downgraded');
    expect(result.challengeResult.findings).toContain('challenge:mapping_conflict_detected');
    expect(result.challengeResult.warnings).toContain('conflict:tipo_vs_descripcion');
    expect(result.mappings.find(mapping => mapping.sourceHeader === 'Tipo')?.alternatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'operation.descripcion' }),
      ]),
    );
  });
});
