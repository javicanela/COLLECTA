import type { ParsedDocument } from '../domain/parsed-document';
import { buildStructuredTable, isStructuredRecord } from './structured-data';
import type { DocumentExtractor } from './types';

const EXTRACTOR_NAME = 'json-extractor';

type JsonTableCandidate = {
  path: string;
  records: Record<string, unknown>[];
};

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown parse error';
    throw new Error(`Smart Import JSON parse error: ${detail}`);
  }
}

function findJsonTableCandidates(value: unknown, path = ''): JsonTableCandidate[] {
  if (Array.isArray(value)) {
    const records = value.filter(isStructuredRecord);
    return records.length > 0 ? [{ path, records }] : [];
  }

  if (!isStructuredRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => (
    findJsonTableCandidates(child, path ? `${path}.${key}` : key)
  ));
}

export const jsonExtractor: DocumentExtractor = {
  kind: 'json',
  canHandle: (file) => {
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith('.json') || file.type.toLowerCase() === 'application/json';
  },
  extract: async (file): Promise<ParsedDocument> => {
    const startedAt = performance.now();
    const documentId = crypto.randomUUID();
    const parsed = parseJson(await file.text());
    const tables = findJsonTableCandidates(parsed).map((candidate, tableIndex) => (
      buildStructuredTable({
        id: `${documentId}-table-${tableIndex + 1}`,
        label: candidate.path || file.name,
        file,
        extractor: EXTRACTOR_NAME,
        records: candidate.records,
      })
    ));

    return {
      id: documentId,
      fileName: file.name,
      kind: 'json',
      mimeType: file.type,
      sizeBytes: file.size,
      tables,
      textBlocks: [],
      warnings: [],
      metrics: {
        parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  },
};
