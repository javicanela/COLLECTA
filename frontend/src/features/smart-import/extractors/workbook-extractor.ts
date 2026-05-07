import { parseWorkbookFile } from '../utils/parse-workbook';
import { detectFileKind } from './detect-file-kind';
import { workbookSheetsToParsedDocument } from './workbook-to-parsed-document';
import type { SourceFileKind } from '../domain/parsed-document';
import type { DocumentExtractor } from './types';

function workbookKindFor(file: File): Extract<SourceFileKind, 'xlsx' | 'xls'> {
  return detectFileKind(file) === 'xls' ? 'xls' : 'xlsx';
}

export const workbookExtractor: DocumentExtractor = {
  kind: 'xlsx',
  canHandle: (file) => {
    const kind = detectFileKind(file);
    return kind === 'xlsx' || kind === 'xls';
  },
  extract: async (file) => {
    const startedAt = performance.now();
    const documentId = crypto.randomUUID();
    const sheets = await parseWorkbookFile(file, documentId);

    return workbookSheetsToParsedDocument({
      id: documentId,
      file,
      kind: workbookKindFor(file),
      extractor: 'workbook-extractor',
      sheets,
      parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
  },
};
