import { describe, expect, it } from 'vitest';
import { extractDocumentWithExtractors } from './extract-document';
import type { DocumentExtractor } from './types';
import type { ParsedDocument, SourceFileKind } from '../domain/parsed-document';

function makeFile(name: string, type = ''): File {
  return new File(['sample'], name, { type });
}

function makeParsedDocument(file: File, kind: SourceFileKind): ParsedDocument {
  return {
    id: `${kind}-doc`,
    fileName: file.name,
    kind,
    mimeType: file.type,
    sizeBytes: file.size,
    tables: [],
    textBlocks: [],
    warnings: [],
    metrics: {
      parseMs: 1,
    },
  };
}

function fakeExtractor(kind: SourceFileKind): DocumentExtractor {
  return {
    kind,
    canHandle: (file) => file.name.toLowerCase().endsWith(`.${kind}`) || kind === 'pdf_text' && file.name.endsWith('.pdf') || kind === 'image_ocr' && file.type.startsWith('image/'),
    extract: async (file) => makeParsedDocument(file, kind),
  };
}

describe('extractDocumentWithExtractors', () => {
  it.each<[string, string, SourceFileKind]>([
    ['clientes.csv', 'text/csv', 'csv'],
    ['clientes.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
    ['clientes.xls', 'application/vnd.ms-excel', 'xls'],
    ['estado.pdf', 'application/pdf', 'pdf_text'],
    ['reporte.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
    ['clientes.json', 'application/json', 'json'],
    ['clientes.xml', 'application/xml', 'xml'],
    ['scan.png', 'image/png', 'image_ocr'],
  ])('routes %s to the %s extractor', async (fileName, mimeType, expectedKind) => {
    const result = await extractDocumentWithExtractors(
      makeFile(fileName, mimeType),
      {},
      [
        fakeExtractor('csv'),
        fakeExtractor('xlsx'),
        fakeExtractor('xls'),
        fakeExtractor('pdf_text'),
        fakeExtractor('docx'),
        fakeExtractor('json'),
        fakeExtractor('xml'),
        fakeExtractor('image_ocr'),
      ],
    );

    expect(result.kind).toBe(expectedKind);
  });

  it('rejects unknown file types with a controlled error', async () => {
    await expect(extractDocumentWithExtractors(makeFile('notes.txt', 'text/plain'), {}, [])).rejects.toThrow(
      'Unsupported Smart Import file type',
    );
  });

  it('rejects an already aborted extraction', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      extractDocumentWithExtractors(makeFile('clientes.csv', 'text/csv'), { signal: controller.signal }, [fakeExtractor('csv')]),
    ).rejects.toThrow('Smart Import extraction cancelled');
  });
});
