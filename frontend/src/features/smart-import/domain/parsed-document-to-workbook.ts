import type { ParsedDocument, ParsedTable } from './parsed-document';
import type { SmartImportCell, WorkbookSheetSummary } from './types';

const RFC_REGEX = /[A-Z\u00d1&]{3,4}\d{6}[A-Z0-9]{2,3}/gi;
const MONEY_REGEX = /\$\s?-?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:MXN|M\.N\.|USD))?/gi;
const DATE_REGEX = /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/gi;

function summarizeRows(sheetId: string, name: string, rows: SmartImportCell[][]): WorkbookSheetSummary {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const nonEmptyCellCount = rows.reduce((count, row) => (
    count + row.filter((cell) => String(cell ?? '').trim() !== '').length
  ), 0);

  return {
    sheetId,
    name,
    rows,
    rowCount: rows.length,
    columnCount,
    nonEmptyCellCount,
  };
}

function tableToSheet(document: ParsedDocument, table: ParsedTable): WorkbookSheetSummary {
  const rows = table.rows.map((row) => row.map((cell) => cell.value));
  const name = table.label || table.source.sheetName || table.id;

  return summarizeRows(`${document.id}:${table.id}`, name, rows);
}

function firstMatch(text: string, regex: RegExp): string {
  regex.lastIndex = 0;
  return regex.exec(text)?.[0]?.trim() ?? '';
}

function descriptionFromText(text: string): string {
  return text
    .replace(RFC_REGEX, '')
    .replace(MONEY_REGEX, '')
    .replace(DATE_REGEX, '')
    .replace(/\b(rfc|monto|adeudo|vencimiento|vence|fecha|cliente|debe|por)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function textBlocksToCandidateSheet(document: ParsedDocument): WorkbookSheetSummary | null {
  const rows = document.textBlocks
    .map((block) => {
      const text = block.text.replace(/\s+/g, ' ').trim();
      const rfc = firstMatch(text, RFC_REGEX).toUpperCase();
      const money = firstMatch(text, MONEY_REGEX);
      const date = firstMatch(text, DATE_REGEX);

      if (!rfc && !money && !date) return null;

      const row: SmartImportCell[] = [
        rfc,
        money,
        date,
        descriptionFromText(text),
      ];
      return row;
    })
    .filter((row): row is SmartImportCell[] => row !== null);

  if (rows.length === 0) return null;

  return summarizeRows(
    `${document.id}:text-candidates`,
    `${document.fileName} text candidates`,
    [['RFC', 'Monto', 'Fecha de Vencimiento', 'Descripcion'], ...rows],
  );
}

export function parsedDocumentToWorkbookSheets(document: ParsedDocument): WorkbookSheetSummary[] {
  const tableSheets = document.tables.map((table) => tableToSheet(document, table));
  if (tableSheets.length > 0) return tableSheets;

  const textSheet = textBlocksToCandidateSheet(document);
  return textSheet ? [textSheet] : [];
}
