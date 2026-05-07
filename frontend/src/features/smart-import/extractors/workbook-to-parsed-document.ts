import type { ParsedCell, ParsedDocument, ParsedTable, SourceFileKind } from '../domain/parsed-document';
import { stringifyCell } from '../domain/normalize';
import type { SmartImportCell, WorkbookSheetSummary } from '../domain/types';

type WorkbookParsedDocumentOptions = {
  id: string;
  file: File;
  kind: SourceFileKind;
  extractor: string;
  sheets: WorkbookSheetSummary[];
  parseMs: number;
};

function toParsedCell(
  value: SmartImportCell,
  rowIndex: number,
  columnIndex: number,
  file: File,
  sheet: WorkbookSheetSummary,
  extractor: string,
): ParsedCell {
  return {
    value: stringifyCell(value),
    rawValue: value,
    rowIndex,
    columnIndex,
    confidence: 1,
    source: {
      fileName: file.name,
      sheetName: sheet.name,
      extractor,
    },
  };
}

function toParsedTable(file: File, sheet: WorkbookSheetSummary, extractor: string): ParsedTable {
  return {
    id: sheet.sheetId,
    label: sheet.name,
    confidence: 1,
    source: {
      fileName: file.name,
      sheetName: sheet.name,
      extractor,
    },
    rows: sheet.rows.map((row, rowIndex) => (
      row.map((cell, columnIndex) => toParsedCell(cell, rowIndex, columnIndex, file, sheet, extractor))
    )),
  };
}

export function workbookSheetsToParsedDocument(options: WorkbookParsedDocumentOptions): ParsedDocument {
  return {
    id: options.id,
    fileName: options.file.name,
    kind: options.kind,
    mimeType: options.file.type,
    sizeBytes: options.file.size,
    tables: options.sheets.map((sheet) => toParsedTable(options.file, sheet, options.extractor)),
    textBlocks: [],
    warnings: [],
    metrics: {
      parseMs: options.parseMs,
      sheets: options.sheets.length,
    },
  };
}
