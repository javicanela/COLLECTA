import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { extractDocument } from './extract-document';
import { workbookExtractor } from './workbook-extractor';

function makeWorkbookFile(fileName: string, bookType: XLSX.BookType): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Notas'],
    ['Metadata'],
  ]), 'Notas');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['RFC', 'Nombre', 'Monto'],
    ['ABC010101ABC', 'Cliente Uno', 1250],
    ['LOPE8001019Q8', 'Cliente Dos', ''],
  ]), 'Operaciones');

  const buffer = XLSX.write(workbook, { bookType, type: 'array' }) as ArrayBuffer;
  return new File([buffer], fileName, {
    type: bookType === 'xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('workbookExtractor', () => {
  it('converts a multi-sheet XLSX workbook into ParsedDocument tables', async () => {
    const document = await workbookExtractor.extract(makeWorkbookFile('clientes.xlsx', 'xlsx'), {});

    expect(document.kind).toBe('xlsx');
    expect(document.metrics.sheets).toBe(2);
    expect(document.tables.map((table) => table.source.sheetName)).toEqual(['Notas', 'Operaciones']);
    expect(document.tables[1].rows[1][0]).toMatchObject({
      value: 'ABC010101ABC',
      rowIndex: 1,
      columnIndex: 0,
      source: {
        fileName: 'clientes.xlsx',
        sheetName: 'Operaciones',
        extractor: 'workbook-extractor',
      },
    });
  });

  it('preserves empty cells without destroying indices', async () => {
    const document = await workbookExtractor.extract(makeWorkbookFile('clientes.xlsx', 'xlsx'), {});

    expect(document.tables[1].rows[2][2]).toMatchObject({
      value: '',
      rowIndex: 2,
      columnIndex: 2,
    });
  });

  it('routes XLS files through the default extractor router', async () => {
    const document = await extractDocument(makeWorkbookFile('clientes.xls', 'xls'));

    expect(document.kind).toBe('xls');
    expect(document.tables[1].source.sheetName).toBe('Operaciones');
  });
});
