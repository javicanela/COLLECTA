import { describe, expect, it } from 'vitest';
import { chaotic10ClientWorkbook } from '../__fixtures__/chaotic-10-client-workbook';
import { analyzeSmartImport } from './super-identifier';

describe('Plan 06 chaotic full-cycle import fixture', () => {
  it('maps 10 chaotic client-operation rows into canonical rows with contact warnings', () => {
    const analysis = analyzeSmartImport({
      source: { sourceId: 'plan06-chaotic', fileName: 'plan06-chaotic.xlsx', fileType: 'xlsx' },
      sheets: chaotic10ClientWorkbook,
    });

    const rowsWithRfc = analysis.canonicalRows.filter((row) => row.client.rfc);
    const rowsWithAmountAndDueDate = analysis.canonicalRows.filter((row) => row.operation.monto && row.operation.fechaVence);
    const missingPhoneRow = analysis.canonicalRows.find((row) => row.client.rfc === 'AURL8503157P2');
    const missingEmailRow = analysis.canonicalRows.find((row) => row.client.rfc === 'DOMC910802M6A');

    expect(analysis.selectedSheet.sheetId).toBe('cobranza-caotica');
    expect(analysis.selectedRegion.dataStartRow).toBeGreaterThan(0);
    expect(analysis.canonicalRows).toHaveLength(10);
    expect(rowsWithRfc.length).toBeGreaterThanOrEqual(9);
    expect(rowsWithAmountAndDueDate).toHaveLength(10);
    expect(analysis.mappings).toContainEqual(expect.objectContaining({
      field: 'client.rfc',
      confidence: expect.closeTo(0.99, 2),
    }));
    expect(missingPhoneRow?.warnings).toContain('row:telefono_missing');
    expect(missingEmailRow?.warnings).toContain('row:email_missing');
  });
});
