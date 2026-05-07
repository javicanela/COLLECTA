import type { ParsedDocument, SourceFileKind } from '../domain/parsed-document';
import type { DocumentExtractor, ExtractorContext } from './types';

const OCR_EXTRACTOR = 'ocr-extractor';
const CANCELLED_ERROR = 'Smart Import extraction cancelled';
const OCR_PARSE_ERROR = 'Smart Import OCR failed: local OCR engine could not read the file';

export type OcrRecognition = {
  text: string;
  confidence?: number;
};

export type OcrRecognizer = (file: File, context: ExtractorContext) => Promise<OcrRecognition>;

type TesseractAdapter = {
  recognize: (image: File, langs?: string) => Promise<{
    data: {
      text?: string;
      confidence?: number;
    };
  }>;
};

type OcrWorkerResponse = {
  type: 'result' | 'error';
  jobId: string;
  text?: string;
  confidence?: number;
  errorMessage?: string;
};

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error(CANCELLED_ERROR);
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extensionOf(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  const dotIndex = lowerName.lastIndexOf('.');
  return dotIndex >= 0 ? lowerName.slice(dotIndex + 1) : '';
}

function isImageFile(file: File): boolean {
  return file.type.toLowerCase().startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extensionOf(file.name));
}

function isPdfFile(file: File): boolean {
  return file.type.toLowerCase() === 'application/pdf' || extensionOf(file.name) === 'pdf';
}

function kindFor(file: File): Extract<SourceFileKind, 'image_ocr' | 'pdf_ocr'> {
  return isPdfFile(file) ? 'pdf_ocr' : 'image_ocr';
}

function confidenceToUnit(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) {
    return 0.75;
  }

  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, Math.round(normalized * 100) / 100));
}

function emptyOcrDocument(
  file: File,
  kind: Extract<SourceFileKind, 'image_ocr' | 'pdf_ocr'>,
  documentId: string,
  startedAt: number,
  warnings: string[],
): ParsedDocument {
  return {
    id: documentId,
    fileName: file.name,
    kind,
    mimeType: file.type,
    sizeBytes: file.size,
    tables: [],
    textBlocks: [],
    warnings,
    metrics: {
      parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
    },
  };
}

async function loadTesseract(): Promise<TesseractAdapter> {
  const tesseractModule = await import('tesseract.js') as unknown as TesseractAdapter & { default?: TesseractAdapter };
  return tesseractModule.default ?? tesseractModule;
}

async function recognizeWithTesseract(file: File): Promise<OcrRecognition> {
  const tesseract = await loadTesseract();
  const result = await tesseract.recognize(file, 'spa+eng');

  return {
    text: result.data.text ?? '',
    confidence: result.data.confidence,
  };
}

export async function recognizeWithOcrWorker(file: File, signal?: AbortSignal): Promise<OcrRecognition> {
  if (typeof Worker === 'undefined') {
    return recognizeWithTesseract(file);
  }

  const worker = new Worker(new URL('../workers/ocr.worker.ts', import.meta.url), { type: 'module' });
  const jobId = crypto.randomUUID();

  return new Promise<OcrRecognition>((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener('abort', abort);
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(new Error(CANCELLED_ERROR));
    };

    worker.onmessage = (event: MessageEvent<OcrWorkerResponse>) => {
      if (event.data.jobId !== jobId) {
        return;
      }

      cleanup();

      if (event.data.type === 'error') {
        reject(new Error(event.data.errorMessage ?? OCR_PARSE_ERROR));
        return;
      }

      resolve({
        text: event.data.text ?? '',
        confidence: event.data.confidence,
      });
    };

    worker.onerror = () => {
      cleanup();
      reject(new Error(OCR_PARSE_ERROR));
    };

    signal?.addEventListener('abort', abort, { once: true });
    worker.postMessage({ type: 'recognize', jobId, file });
  });
}

async function recognizeWithLocalOcr(file: File, context: ExtractorContext): Promise<OcrRecognition> {
  return recognizeWithOcrWorker(file, context.signal);
}

export async function extractOcrDocument(
  file: File,
  context: ExtractorContext = {},
  recognize: OcrRecognizer = recognizeWithLocalOcr,
): Promise<ParsedDocument> {
  const startedAt = performance.now();
  const ocrStartedAt = performance.now();
  const documentId = crypto.randomUUID();
  const kind = kindFor(file);

  assertNotAborted(context.signal);

  if (!context.enableOcr) {
    return emptyOcrDocument(file, kind, documentId, startedAt, ['OCR_DISABLED']);
  }

  if (kind === 'pdf_ocr') {
    return emptyOcrDocument(file, kind, documentId, startedAt, ['PDF_OCR_DEFERRED']);
  }

  try {
    const recognition = await recognize(file, context);
    assertNotAborted(context.signal);
    const text = normalizeWhitespace(recognition.text);

    return {
      id: documentId,
      fileName: file.name,
      kind,
      mimeType: file.type,
      sizeBytes: file.size,
      tables: [],
      textBlocks: text ? [
        {
          id: 'ocr-text-1',
          text,
          confidence: confidenceToUnit(recognition.confidence),
          source: {
            fileName: file.name,
            pageNumber: 1,
            extractor: OCR_EXTRACTOR,
          },
        },
      ] : [],
      warnings: text ? [] : ['OCR_NO_TEXT'],
      metrics: {
        parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
        pages: 1,
        ocrMs: Math.max(0, Math.round(performance.now() - ocrStartedAt)),
      },
    };
  } catch (error) {
    if (context.signal?.aborted || error instanceof Error && error.message === CANCELLED_ERROR) {
      throw new Error(CANCELLED_ERROR);
    }

    throw new Error(OCR_PARSE_ERROR);
  }
}

export const ocrExtractor: DocumentExtractor = {
  kind: 'image_ocr',
  canHandle: isImageFile,
  extract: extractOcrDocument,
};

export const pdfOcrExtractor: DocumentExtractor = {
  kind: 'pdf_ocr',
  canHandle: isPdfFile,
  extract: extractOcrDocument,
};
