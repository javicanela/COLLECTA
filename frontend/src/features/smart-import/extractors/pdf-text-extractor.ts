import type { ParsedDocument, ParsedTextBlock } from '../domain/parsed-document';
import type { DocumentExtractor, ExtractorContext } from './types';

const PDF_TEXT_EXTRACTOR = 'pdf-text-extractor';
const CANCELLED_ERROR = 'Smart Import extraction cancelled';
const PDF_PARSE_ERROR = 'Smart Import PDF parse failed: invalid or unsupported PDF file';
const MIN_EMBEDDED_TEXT_CHARS = 24;

type PdfTextItem = {
  str: string;
};

type PdfMarkedContent = {
  type: string;
};

export type PdfTextContentItem = PdfTextItem | PdfMarkedContent;

type PdfPage = {
  extractTextContent: () => Promise<{ items: PdfTextContentItem[] }>;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void> | void;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocument>;
  destroy?: () => Promise<void> | void;
};

type PdfJsAdapter = {
  GlobalWorkerOptions?: {
    workerSrc: string;
  };
  getDocument: (input: {
    data: Uint8Array;
    isEvalSupported: boolean;
    useWorkerFetch: boolean;
  }) => PdfLoadingTask;
};

type LoadPdfjs = () => Promise<PdfJsAdapter>;

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error(CANCELLED_ERROR);
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isTextItem(item: PdfTextContentItem): item is PdfTextItem {
  return 'str' in item;
}

export function pdfTextItemsToText(items: PdfTextContentItem[]): string {
  return normalizeWhitespace(items.filter(isTextItem).map((item) => item.str).join(' '));
}

async function loadPdfjsDist(): Promise<PdfJsAdapter> {
  return await import('pdfjs-dist') as unknown as PdfJsAdapter;
}

function configurePdfWorker(pdfjs: PdfJsAdapter): void {
  if (!pdfjs.GlobalWorkerOptions || pdfjs.GlobalWorkerOptions.workerSrc || typeof Worker === 'undefined') {
    return;
  }

  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
}

async function safeDestroy(target?: { destroy?: () => Promise<void> | void }): Promise<void> {
  try {
    await target?.destroy?.();
  } catch {
    // Best-effort cleanup should not hide the extraction result or controlled parse error.
  }
}

function toTextBlock(fileName: string, pageNumber: number, text: string): ParsedTextBlock {
  return {
    id: `pdf-page-${pageNumber}`,
    text,
    confidence: 0.85,
    source: {
      fileName,
      pageNumber,
      extractor: PDF_TEXT_EXTRACTOR,
    },
  };
}

export async function extractPdfTextDocument(
  file: File,
  context: ExtractorContext = {},
  loadAdapter: LoadPdfjs = loadPdfjsDist,
): Promise<ParsedDocument> {
  const startedAt = performance.now();
  const documentId = crypto.randomUUID();
  let loadingTask: PdfLoadingTask | undefined;
  let pdfDocument: PdfDocument | undefined;

  try {
    assertNotAborted(context.signal);
    const pdfjs = await loadAdapter();
    configurePdfWorker(pdfjs);
    const arrayBuffer = await file.arrayBuffer();
    assertNotAborted(context.signal);
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    pdfDocument = await loadingTask.promise;

    const textBlocks: ParsedTextBlock[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      assertNotAborted(context.signal);
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.extractTextContent();
      const text = pdfTextItemsToText(textContent.items);

      if (text) {
        textBlocks.push(toTextBlock(file.name, pageNumber, text));
      }
    }

    const extractedTextLength = textBlocks.reduce((sum, block) => sum + block.text.length, 0);

    return {
      id: documentId,
      fileName: file.name,
      kind: 'pdf_text',
      mimeType: file.type,
      sizeBytes: file.size,
      tables: [],
      textBlocks,
      warnings: extractedTextLength < MIN_EMBEDDED_TEXT_CHARS ? ['PDF_REQUIRES_OCR'] : [],
      metrics: {
        parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
        pages: pdfDocument.numPages,
      },
    };
  } catch (error) {
    if (context.signal?.aborted || error instanceof Error && error.message === CANCELLED_ERROR) {
      throw new Error(CANCELLED_ERROR);
    }

    throw new Error(PDF_PARSE_ERROR);
  } finally {
    await safeDestroy(pdfDocument);
    await safeDestroy(loadingTask);
  }
}

export const pdfTextExtractor: DocumentExtractor = {
  kind: 'pdf_text',
  canHandle: (file) => {
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith('.pdf') || file.type.toLowerCase() === 'application/pdf';
  },
  extract: extractPdfTextDocument,
};
