import { parsedDocumentToWorkbookSheets } from './parsed-document-to-workbook';
import { runSmartImportEscalation } from './provider-registry';
import type { ParsedDocument } from './parsed-document';
import type { SmartImportAnalysis, SmartImportFileType } from './types';
import type { SmartImportEscalationOptions } from './provider-types';

export type MultimodalImportAnalysis = {
  document: ParsedDocument;
  selectedTableId?: string;
  rows: SmartImportAnalysis['canonicalRows'];
  mappings: SmartImportAnalysis['mappings'];
  confidence: number;
  challenge: {
    originalStrategy: string;
    alternativeStrategy: string;
    selectedStrategy: string;
    reasons: string[];
  };
  warnings: string[];
  smartImportAnalysis: SmartImportAnalysis;
};

function toSmartImportFileType(document: ParsedDocument): SmartImportFileType {
  if (document.kind === 'csv' || document.kind === 'xlsx' || document.kind === 'xls') return document.kind;
  return 'unknown';
}

export async function analyzeParsedDocument(
  document: ParsedDocument,
  options: SmartImportEscalationOptions = {},
): Promise<MultimodalImportAnalysis> {
  const sheets = parsedDocumentToWorkbookSheets(document);
  const smartImportAnalysis = await runSmartImportEscalation({
    source: {
      sourceId: document.id,
      fileName: document.fileName,
      fileType: toSmartImportFileType(document),
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    },
    sheets,
  }, options);

  return {
    document,
    selectedTableId: smartImportAnalysis.selectedSheet.sheetId,
    rows: smartImportAnalysis.canonicalRows,
    mappings: smartImportAnalysis.mappings,
    confidence: smartImportAnalysis.confidence,
    challenge: {
      originalStrategy: smartImportAnalysis.challengeResult.initialRegionId,
      alternativeStrategy: smartImportAnalysis.challengeResult.selectedRegionId,
      selectedStrategy: smartImportAnalysis.challengeResult.status,
      reasons: smartImportAnalysis.challengeResult.findings,
    },
    warnings: [...document.warnings, ...smartImportAnalysis.warnings],
    smartImportAnalysis,
  };
}
