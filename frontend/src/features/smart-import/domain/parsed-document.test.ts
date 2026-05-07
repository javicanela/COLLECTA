import { describe, expect, it } from 'vitest';
import { SOURCE_FILE_KINDS } from './parsed-document';
import type { ParsedDocument } from './parsed-document';

describe('ParsedDocument contract', () => {
  it('lists supported source file kinds in runtime order', () => {
    expect(SOURCE_FILE_KINDS).toEqual([
      'csv',
      'xlsx',
      'xls',
      'pdf_text',
      'pdf_ocr',
      'docx',
      'image_ocr',
      'json',
      'xml',
      'unknown',
    ]);
  });

  it('allows tables with cell-level traceability', () => {
    const document: ParsedDocument = {
      id: 'doc-1',
      fileName: 'clientes.csv',
      kind: 'csv',
      mimeType: 'text/csv',
      sizeBytes: 128,
      tables: [
        {
          id: 'table-1',
          label: 'Clientes',
          confidence: 0.94,
          source: {
            fileName: 'clientes.csv',
            sheetName: 'clientes.csv',
            extractor: 'csv-extractor',
          },
          rows: [
            [
              {
                value: 'RFC',
                rowIndex: 0,
                columnIndex: 0,
                confidence: 1,
                source: {
                  fileName: 'clientes.csv',
                  sheetName: 'clientes.csv',
                  extractor: 'csv-extractor',
                },
              },
            ],
          ],
        },
      ],
      textBlocks: [],
      warnings: [],
      metrics: {
        parseMs: 12,
        sheets: 1,
      },
    };

    expect(document.tables[0].rows[0][0].source.sheetName).toBe('clientes.csv');
    expect(document.tables[0].rows[0][0].confidence).toBe(1);
  });

  it('allows a document with text blocks and no tables', () => {
    const document: ParsedDocument = {
      id: 'doc-2',
      fileName: 'estado.pdf',
      kind: 'pdf_text',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
      tables: [],
      textBlocks: [
        {
          id: 'page-1',
          text: 'RFC ABC010101ABC adeudo $1,250.00',
          confidence: 0.88,
          source: {
            fileName: 'estado.pdf',
            pageNumber: 1,
            extractor: 'pdf-text-extractor',
          },
        },
      ],
      warnings: [],
      metrics: {
        parseMs: 35,
        pages: 1,
      },
    };

    expect(document.tables).toHaveLength(0);
    expect(document.textBlocks[0].source.pageNumber).toBe(1);
  });

  it('preserves parse warnings', () => {
    const document: ParsedDocument = {
      id: 'doc-3',
      fileName: 'scan.pdf',
      kind: 'pdf_text',
      sizeBytes: 2048,
      tables: [],
      textBlocks: [],
      warnings: ['PDF_REQUIRES_OCR'],
      metrics: {
        parseMs: 18,
        pages: 1,
      },
    };

    expect(document.warnings).toEqual(['PDF_REQUIRES_OCR']);
  });
});
