import { describe, expect, it } from 'vitest';
import { smartImportAnalyzeSchema, smartImportCommitSchema } from './schemas';

describe('smartImport schemas', () => {
  it('accepts multimodal analyze source metadata without requiring binary files', () => {
    const result = smartImportAnalyzeSchema.safeParse({
      source: {
        sourceId: 'pdf-1',
        fileName: 'estado.pdf',
        fileType: 'pdf_text',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
      },
      sheets: [
        {
          sheetId: 'pdf-1:text-candidates',
          name: 'estado.pdf text candidates',
          rows: [
            ['RFC', 'Monto'],
            ['ABC010101ABC', '$1,250.00'],
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('accepts optional source metadata on confirmed rows', () => {
    const result = smartImportCommitSchema.safeParse({
      confirmedRows: [
        {
          rowNumber: 2,
          sourceRowIndex: 1,
          source: {
            fileName: 'estado.pdf',
            pageNumber: 1,
            extractor: 'pdf-text-extractor',
          },
          client: {
            rfc: 'ABC010101ABC',
            nombre: 'Cliente Uno',
          },
          operation: {
            tipo: 'FISCAL',
            monto: 1250,
            fechaVence: '2026-04-30',
          },
          warnings: [],
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
