import { describe, expect, it } from 'vitest';
import { extractOcrDocument, ocrExtractor, pdfOcrExtractor } from './ocr-extractor';

function makeImageFile(): File {
  return new File(['fake-image'], 'scan.png', { type: 'image/png' });
}

function makePdfFile(): File {
  return new File(['%PDF-1.7 synthetic'], 'scan.pdf', { type: 'application/pdf' });
}

describe('ocrExtractor', () => {
  it('keeps OCR behind an explicit enableOcr boundary', async () => {
    let calls = 0;
    const document = await extractOcrDocument(makeImageFile(), {}, async () => {
      calls += 1;
      return { text: 'RFC ABC010101ABC', confidence: 82 };
    });

    expect(calls).toBe(0);
    expect(document.kind).toBe('image_ocr');
    expect(document.textBlocks).toEqual([]);
    expect(document.warnings).toEqual(['OCR_DISABLED']);
  });

  it('extracts text from images when OCR is enabled', async () => {
    const document = await extractOcrDocument(makeImageFile(), { enableOcr: true }, async () => ({
      text: 'RFC ABC010101ABC adeudo $1,250.00',
      confidence: 87,
    }));

    expect(document.kind).toBe('image_ocr');
    expect(document.warnings).toEqual([]);
    expect(document.metrics.ocrMs).toBeGreaterThanOrEqual(0);
    expect(document.textBlocks[0]).toMatchObject({
      id: 'ocr-text-1',
      text: 'RFC ABC010101ABC adeudo $1,250.00',
      confidence: 0.87,
      source: {
        fileName: 'scan.png',
        pageNumber: 1,
        extractor: 'ocr-extractor',
      },
    });
  });

  it('supports cancellation before invoking local OCR', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    await expect(
      extractOcrDocument(makeImageFile(), { enableOcr: true, signal: controller.signal }, async () => {
        calls += 1;
        return { text: 'should not run', confidence: 1 };
      }),
    ).rejects.toThrow('Smart Import extraction cancelled');
    expect(calls).toBe(0);
  });

  it('defers PDF OCR with a clear warning', async () => {
    const document = await extractOcrDocument(makePdfFile(), { enableOcr: true }, async () => ({
      text: 'should not run',
      confidence: 1,
    }));

    expect(document.kind).toBe('pdf_ocr');
    expect(document.textBlocks).toEqual([]);
    expect(document.warnings).toEqual(['PDF_OCR_DEFERRED']);
  });

  it('handles image and PDF OCR candidates', () => {
    expect(ocrExtractor.canHandle(makeImageFile())).toBe(true);
    expect(pdfOcrExtractor.canHandle(makePdfFile())).toBe(true);
    expect(ocrExtractor.canHandle(new File(['x'], 'scan.txt', { type: 'text/plain' }))).toBe(false);
  });
});
