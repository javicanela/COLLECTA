import { describe, expect, it } from 'vitest';
import { titleRowsBeforeHeadersRows, xlsxThreeSheets } from '../__fixtures__/sample-workbooks';
import { detectLikelyHeaderRows, detectTableRegions } from './table-detection';

describe('table detection', () => {
  it('finds the real header row after title and metadata rows', () => {
    const headers = detectLikelyHeaderRows(titleRowsBeforeHeadersRows, { sheetId: 'title-sheet' });

    expect(headers[0]).toMatchObject({ rowIndex: 3 });
    expect(headers[0].reasonCodes).toContain('header:canonical_terms');
  });

  it('detects a bounded data region from header through populated rows', () => {
    const regions = detectTableRegions('title-sheet', titleRowsBeforeHeadersRows);

    expect(regions[0]).toMatchObject({
      sheetId: 'title-sheet',
      startRow: 3,
      dataStartRow: 4,
      startColumn: 0,
      endColumn: 4,
      endRow: 6,
    });
    expect(regions[0].headerLabels).toEqual(['RFC', 'Nombre del Cliente', 'Monto total', 'Fecha de Vencimiento', 'Descripcion']);
  });

  it('ranks the operation sheet above note-only sheets in a workbook', () => {
    const ranked = xlsxThreeSheets
      .flatMap((sheet) => detectTableRegions(sheet.sheetId, sheet.rows).map((region) => ({ sheetName: sheet.name, region })))
      .sort((a, b) => b.region.confidence - a.region.confidence);

    expect(ranked[0].sheetName).toBe('Operaciones');
    expect(ranked[0].region.reasonCodes).toContain('region:operation_fields');
  });
});
