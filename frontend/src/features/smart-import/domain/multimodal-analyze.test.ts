import { describe, expect, it } from 'vitest';
import { analyzeParsedDocument } from './multimodal-analyze';
import type { ParsedDocument } from './parsed-document';

describe('analyzeParsedDocument', () => {
  it('preserves parsed CSV behavior through the existing deterministic engine', async () => {
    const document: ParsedDocument = {
      id: 'doc-csv',
      fileName: 'clientes.csv',
      kind: 'csv',
      sizeBytes: 100,
      tables: [
        {
          id: 'table-1',
          label: 'clientes.csv',
          confidence: 1,
          source: { fileName: 'clientes.csv', extractor: 'csv-extractor' },
          rows: [
            [
              { value: 'RFC', rowIndex: 0, columnIndex: 0, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
              { value: 'Nombre', rowIndex: 0, columnIndex: 1, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
              { value: 'Monto', rowIndex: 0, columnIndex: 2, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
            ],
            [
              { value: 'ABC010101ABC', rowIndex: 1, columnIndex: 0, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
              { value: 'Cliente Uno', rowIndex: 1, columnIndex: 1, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
              { value: '$1,250.00', rowIndex: 1, columnIndex: 2, confidence: 1, source: { fileName: 'clientes.csv', extractor: 'csv-extractor' } },
            ],
          ],
        },
      ],
      textBlocks: [],
      warnings: [],
      metrics: { parseMs: 1 },
    };

    const analysis = await analyzeParsedDocument(document, {
      capabilities: { webGpu: false, webAssembly: true, webWorker: true, secureContext: true },
      config: {},
    });

    expect(analysis.document).toBe(document);
    expect(analysis.selectedTableId).toBe('doc-csv:table-1');
    expect(analysis.rows[0].client.rfc).toBe('ABC010101ABC');
    expect(analysis.mappings).toContainEqual(expect.objectContaining({ field: 'client.rfc' }));
    expect(analysis.challenge.selectedStrategy).toMatch(/confirmed|changed|downgraded/);
  });

  it('analyzes text-only PDF content by synthesizing a candidate table', async () => {
    const document: ParsedDocument = {
      id: 'doc-pdf',
      fileName: 'estado.pdf',
      kind: 'pdf_text',
      sizeBytes: 100,
      tables: [],
      textBlocks: [
        {
          id: 'page-1',
          text: 'RFC ABC010101ABC monto $1,250.00 vencimiento 2026-04-30 Honorarios mensuales',
          confidence: 0.86,
          source: { fileName: 'estado.pdf', pageNumber: 1, extractor: 'pdf-text-extractor' },
        },
      ],
      warnings: [],
      metrics: { parseMs: 1, pages: 1 },
    };

    const analysis = await analyzeParsedDocument(document, {
      capabilities: { webGpu: false, webAssembly: true, webWorker: true, secureContext: true },
      config: {},
    });

    expect(analysis.rows[0].client.rfc).toBe('ABC010101ABC');
    expect(analysis.rows[0].operation.monto).toBe(1250);
    expect(analysis.warnings).toContain('provider:fallback_deterministic_no_advanced_engine');
  });
});
