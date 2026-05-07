import { describe, expect, it } from 'vitest';
import { extractPdfTextDocument, pdfTextExtractor, pdfTextItemsToText } from './pdf-text-extractor';

type FakePdfPage = {
  extractTextContent: () => Promise<{ items: Array<{ str: string } | { type: string }> }>;
};

type FakePdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<FakePdfPage>;
  destroy?: () => Promise<void>;
};

function makePdfFile(): File {
  return new File(['%PDF-1.7 synthetic'], 'estado.pdf', { type: 'application/pdf' });
}

function fakePdfjs(pages: string[]) {
  const document: FakePdfDocument = {
    numPages: pages.length,
    getPage: async (pageNumber) => ({
      extractTextContent: async () => ({
        items: pages[pageNumber - 1].split(/\s+/).filter(Boolean).map((str) => ({ str })),
      }),
    }),
    destroy: async () => undefined,
  };

  return {
    getDocument: () => ({
      promise: Promise.resolve(document),
      destroy: async () => undefined,
    }),
  };
}

describe('pdfTextExtractor', () => {
  it('joins PDF.js text items into readable page text', () => {
    expect(pdfTextItemsToText([
      { str: 'RFC' },
      { type: 'beginMarkedContent' },
      { str: 'ABC010101ABC' },
    ])).toBe('RFC ABC010101ABC');
  });

  it('extracts text blocks per page from embedded PDF text', async () => {
    const document = await extractPdfTextDocument(
      makePdfFile(),
      {},
      async () => fakePdfjs([
        'RFC ABC010101ABC adeudo $1,250.00',
        'Cliente Dos LOPE8001019Q8 saldo $2,400.00',
      ]),
    );

    expect(document.kind).toBe('pdf_text');
    expect(document.metrics.pages).toBe(2);
    expect(document.warnings).toEqual([]);
    expect(document.textBlocks.map((block) => block.text)).toEqual([
      'RFC ABC010101ABC adeudo $1,250.00',
      'Cliente Dos LOPE8001019Q8 saldo $2,400.00',
    ]);
    expect(document.textBlocks[1]).toMatchObject({
      id: 'pdf-page-2',
      confidence: 0.85,
      source: {
        fileName: 'estado.pdf',
        pageNumber: 2,
        extractor: 'pdf-text-extractor',
      },
    });
  });

  it('warns when embedded PDF text is insufficient for deterministic import', async () => {
    const document = await extractPdfTextDocument(makePdfFile(), {}, async () => fakePdfjs(['RFC']));

    expect(document.textBlocks).toHaveLength(1);
    expect(document.warnings).toContain('PDF_REQUIRES_OCR');
  });

  it('rejects corrupt PDFs with a controlled error', async () => {
    await expect(
      extractPdfTextDocument(makePdfFile(), {}, async () => ({
        getDocument: () => ({
          promise: Promise.reject(new Error('Invalid PDF structure')),
          destroy: async () => undefined,
        }),
      })),
    ).rejects.toThrow('Smart Import PDF parse failed');
  });

  it('handles PDF file names and MIME types', () => {
    expect(pdfTextExtractor.canHandle(makePdfFile())).toBe(true);
    expect(pdfTextExtractor.canHandle(new File(['x'], 'estado.txt', { type: 'text/plain' }))).toBe(false);
  });
});
