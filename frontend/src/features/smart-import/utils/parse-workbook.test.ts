import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseWorkbookArrayBuffer } from './parse-workbook';

describe('parse workbook', () => {
  it('returns summaries for every worksheet in order', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Notas'], ['Solo metadata']]), 'Notas');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['RFC', 'Nombre', 'Monto'],
      ['ABC010101ABC', 'Cliente Uno', 1250],
      ['LOPE8001019Q8', 'Cliente Dos', 3200],
    ]), 'Operaciones');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const sheets = await parseWorkbookArrayBuffer(buffer, {
      sourceId: 'xlsx-1',
      fileName: 'multi.xlsx',
    });

    expect(sheets.map((sheet) => sheet.name)).toEqual(['Notas', 'Operaciones']);
    expect(sheets[1]).toMatchObject({
      sheetId: 'xlsx-1:sheet-2',
      rowCount: 3,
      columnCount: 3,
      nonEmptyCellCount: 9,
    });
    expect(sheets[1].rows[1]).toEqual(['ABC010101ABC', 'Cliente Uno', 1250]);
  });
});
