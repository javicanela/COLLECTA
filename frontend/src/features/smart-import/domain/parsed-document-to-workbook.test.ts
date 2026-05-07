import { describe, expect, it } from 'vitest';
import { parsedDocumentToWorkbookSheets } from './parsed-document-to-workbook';
import type { ParsedDocument } from './parsed-document';

describe('parsedDocumentToWorkbookSheets', () => {
  it('converts parsed tables into workbook sheet summaries', () => {
    const sheets = parsedDocumentToWorkbookSheets({
      id: 'doc-1',
      fileName: 'clientes.csv',
      kind: 'csv',
      sizeBytes: 100,
      tables: [
        {
          id: 'table-1',
          label: 'Clientes',
          confidence: 1,
          source: { fileName: 'clientes.csv', extractor: 'csv-extractor' },
          rows: [
            [
              { value: 'RFC', rowIndex: 0, columnIndex: 0, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
              { value: 'Monto', rowIndex: 0, columnIndex: 1, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
            ],
            [
              { value: 'ABC010101ABC', rowIndex: 1, columnIndex: 0, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
              { value: '$1,250.00', rowIndex: 1, columnIndex: 1, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
            ],
          ],
        },
      ],
      textBlocks: [],
      warnings: [],
      metrics: { parseMs: 1 },
    });

    expect(sheets[0]).toMatchObject({
      sheetId: 'doc-1:table-1',
      name: 'Clientes',
      rowCount: 2,
      columnCount: 2,
      nonEmptyCellCount: 4,
    });
    expect(sheets[0].rows[1]).toEqual(['ABC010101ABC', '$1,250.00']);
  });

  it('creates a candidate table from text blocks with accounting signals', () => {
    const document: ParsedDocument = {
      id: 'doc-2',
      fileName: 'estado.pdf',
      kind: 'pdf_text',
      sizeBytes: 100,
      tables: [],
      textBlocks: [
        {
          id: 'page-1',
          text: 'Cliente ABC010101ABC debe $1,250.00 con vencimiento 2026-04-30 por Honorarios mensuales',
          confidence: 0.86,
          source: { fileName: 'estado.pdf', pageNumber: 1, extractor: 'pdf-text-extractor' },
        },
      ],
      warnings: [],
      metrics: { parseMs: 1, pages: 1 },
    };

    const sheets = parsedDocumentToWorkbookSheets(document);

    expect(sheets[0].rows[0]).toEqual(['RFC', 'Monto', 'Fecha de Vencimiento', 'Descripcion']);
    expect(sheets[0].rows[1][0]).toBe('ABC010101ABC');
    expect(sheets[0].rows[1][1]).toBe('$1,250.00');
    expect(sheets[0].rows[1][2]).toBe('2026-04-30');
  });
});
