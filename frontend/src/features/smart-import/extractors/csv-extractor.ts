import { parseCsvFile } from '../utils/parse-csv';
import { workbookSheetsToParsedDocument } from './workbook-to-parsed-document';
import type { DocumentExtractor } from './types';

export const csvExtractor: DocumentExtractor = {
  kind: 'csv',
  canHandle: (file) => {
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith('.csv') || file.type.toLowerCase().includes('csv');
  },
  extract: async (file) => {
    const startedAt = performance.now();
    const documentId = crypto.randomUUID();
    const sheets = await parseCsvFile(file, documentId);

    return workbookSheetsToParsedDocument({
      id: documentId,
      file,
      kind: 'csv',
      extractor: 'csv-extractor',
      sheets,
      parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
  },
};
