import { describe, expect, it } from 'vitest';
import { docxExtractor, extractDocxDocument, parseDocxHtmlTables } from './docx-extractor';

function makeDocxFile(): File {
  return new File(['not-a-real-docx'], 'reporte.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

describe('docxExtractor', () => {
  it('parses simple Mammoth HTML tables into ParsedDocument tables', () => {
    const tables = parseDocxHtmlTables(
      '<table><tr><th>RFC</th><th>Saldo</th></tr><tr><td>ABC010101ABC</td><td>$1,250.00</td></tr></table>',
      'reporte.docx',
    );

    expect(tables).toHaveLength(1);
    expect(tables[0].rows.map((row) => row.map((cell) => cell.value))).toEqual([
      ['RFC', 'Saldo'],
      ['ABC010101ABC', '$1,250.00'],
    ]);
    expect(tables[0].rows[1][0]).toMatchObject({
      rowIndex: 1,
      columnIndex: 0,
      confidence: 0.9,
      source: {
        fileName: 'reporte.docx',
        sheetName: 'table-1',
        extractor: 'docx-extractor',
      },
    });
  });

  it('extracts raw text and preserves Mammoth messages as warnings', async () => {
    const document = await extractDocxDocument(makeDocxFile(), {}, async () => ({
      convertToHtml: async () => ({
        value: '<table><tr><td>RFC</td></tr><tr><td>ABC010101ABC</td></tr></table>',
        messages: [{ type: 'warning', message: 'Unrecognized paragraph style' }],
      }),
      extractRawText: async () => ({
        value: 'RFC ABC010101ABC adeudo $1,250.00',
        messages: [{ type: 'warning', message: 'Skipped empty run' }],
      }),
    }));

    expect(document).toMatchObject({
      fileName: 'reporte.docx',
      kind: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      warnings: [
        'warning: Unrecognized paragraph style',
        'warning: Skipped empty run',
      ],
    });
    expect(document.tables).toHaveLength(1);
    expect(document.textBlocks).toHaveLength(1);
    expect(document.textBlocks[0]).toMatchObject({
      id: 'docx-text-1',
      text: 'RFC ABC010101ABC adeudo $1,250.00',
      confidence: 0.9,
      source: {
        fileName: 'reporte.docx',
        extractor: 'docx-extractor',
      },
    });
  });

  it('rejects invalid DOCX files with a controlled error', async () => {
    await expect(
      extractDocxDocument(makeDocxFile(), {}, async () => ({
        convertToHtml: async () => {
          throw new Error('zip central directory not found');
        },
        extractRawText: async () => ({
          value: '',
          messages: [],
        }),
      })),
    ).rejects.toThrow('Smart Import DOCX parse failed');
  });

  it('handles DOCX file names and MIME types', () => {
    expect(docxExtractor.canHandle(makeDocxFile())).toBe(true);
    expect(docxExtractor.canHandle(new File(['x'], 'reporte.txt', { type: 'text/plain' }))).toBe(false);
  });
});
