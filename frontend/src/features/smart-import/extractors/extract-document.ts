import { detectFileKind } from './detect-file-kind';
import { csvExtractor } from './csv-extractor';
import { docxExtractor } from './docx-extractor';
import { jsonExtractor } from './json-extractor';
import { ocrExtractor, pdfOcrExtractor } from './ocr-extractor';
import { pdfTextExtractor } from './pdf-text-extractor';
import { workbookExtractor } from './workbook-extractor';
import { xmlExtractor } from './xml-extractor';
import type { ParsedDocument } from '../domain/parsed-document';
import type { DocumentExtractor, ExtractorContext } from './types';

const DEFAULT_EXTRACTORS: DocumentExtractor[] = [
  csvExtractor,
  workbookExtractor,
  jsonExtractor,
  xmlExtractor,
  docxExtractor,
  pdfTextExtractor,
  ocrExtractor,
  pdfOcrExtractor,
];

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Smart Import extraction cancelled');
  }
}

export function selectDocumentExtractor(file: File, extractors: DocumentExtractor[]): DocumentExtractor {
  const kind = detectFileKind(file);

  if (kind === 'unknown') {
    throw new Error('Unsupported Smart Import file type');
  }

  const extractor = extractors.find((candidate) => candidate.canHandle(file) && (
    candidate.kind === kind || kind === 'xls' && candidate.kind === 'xlsx' || kind === 'pdf_text' && candidate.kind === 'pdf_ocr'
  ));

  if (!extractor) {
    throw new Error(`No Smart Import extractor registered for ${kind}`);
  }

  return extractor;
}

export async function extractDocumentWithExtractors(
  file: File,
  context: ExtractorContext = {},
  extractors: DocumentExtractor[] = DEFAULT_EXTRACTORS,
): Promise<ParsedDocument> {
  assertNotAborted(context.signal);
  const extractor = selectDocumentExtractor(file, extractors);
  const startedAt = performance.now();
  const document = await extractor.extract(file, context);
  const parseMs = document.metrics.parseMs || Math.max(0, Math.round(performance.now() - startedAt));

  return {
    ...document,
    metrics: {
      ...document.metrics,
      parseMs,
    },
  };
}

export async function extractDocument(
  file: File,
  context: ExtractorContext = {},
): Promise<ParsedDocument> {
  return extractDocumentWithExtractors(file, context, DEFAULT_EXTRACTORS);
}
