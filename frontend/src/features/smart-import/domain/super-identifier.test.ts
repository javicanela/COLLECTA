import { describe, expect, it } from 'vitest';
import { cleanCsvRows, mixedClientOperationRows, titleRowsBeforeHeadersRows } from '../__fixtures__/sample-workbooks';
import { analyzeSmartImport } from './super-identifier';

describe('super identifier deterministic engine', () => {
  it('maps a clean CSV to canonical client and operation rows', () => {
    const analysis = analyzeSmartImport({
      source: { sourceId: 'clean-csv', fileName: 'clean.csv', fileType: 'csv' },
      sheets: [{ sheetId: 'clean', name: 'clean.csv', rows: cleanCsvRows }],
    });

    expect(analysis.providerUsed).toBe('deterministic');
    expect(analysis.providersAttempted).toEqual(['deterministic']);
    expect(analysis.mappings).toContainEqual(expect.objectContaining({
      field: 'client.rfc',
      confidence: expect.any(Number),
      reasonCodes: expect.arrayContaining(['header:alias:rfc', 'values:rfc']),
    }));
    expect(analysis.mappings).toContainEqual(expect.objectContaining({
      field: 'operation.monto',
      reasonCodes: expect.arrayContaining(['values:money']),
    }));
    expect(analysis.canonicalRows[0].client.rfc).toBe('ABC010101ABC');
    expect(analysis.canonicalRows[0].operation.monto).toBe(12450.5);
    expect(analysis.challengeResult.status).toMatch(/confirmed|changed|downgraded/);
  });

  it('skips title rows before selecting the detected table region', () => {
    const analysis = analyzeSmartImport({
      source: { sourceId: 'title-xlsx', fileName: 'title.xlsx', fileType: 'xlsx' },
      sheets: [{ sheetId: 'title-sheet', name: 'Reporte', rows: titleRowsBeforeHeadersRows }],
    });

    expect(analysis.selectedRegion.startRow).toBe(3);
    expect(analysis.selectedRegion.dataStartRow).toBe(4);
    expect(analysis.challengeResult.findings.length).toBeGreaterThan(0);
  });

  it('handles mixed client and operation data without backend persistence', () => {
    const analysis = analyzeSmartImport({
      source: { sourceId: 'mixed-xlsx', fileName: 'mixed.xlsx', fileType: 'xlsx' },
      sheets: [{ sheetId: 'mixed', name: 'Mixed', rows: mixedClientOperationRows }],
    });

    const fields = analysis.mappings.map((mapping) => mapping.field);
    expect(fields).toEqual(expect.arrayContaining([
      'client.rfc',
      'client.nombre',
      'client.regimen',
      'client.email',
      'operation.tipo',
      'operation.descripcion',
      'operation.monto',
      'operation.fechaVence',
      'operation.estatus',
      'operation.excluir',
    ]));
    expect(analysis.canonicalRows).toHaveLength(3);
    expect(analysis.canonicalRows[1].operation.estatus).toBe('PAGADO');
  });
});
