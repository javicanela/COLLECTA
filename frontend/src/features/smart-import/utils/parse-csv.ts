import Papa from 'papaparse';
import type { SmartImportCell, WorkbookSheetSummary } from '../domain/types';

interface ParseSourceInfo {
  sourceId: string;
  fileName: string;
}

function summarizeRows(rows: SmartImportCell[][], info: ParseSourceInfo): WorkbookSheetSummary {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const nonEmptyCellCount = rows.reduce((count, row) => (
    count + row.filter((cell) => String(cell ?? '').trim() !== '').length
  ), 0);

  return {
    sheetId: `${info.sourceId}:sheet-1`,
    name: info.fileName,
    rows,
    rowCount: rows.length,
    columnCount,
    nonEmptyCellCount,
  };
}

export async function parseCsvText(text: string, info: ParseSourceInfo): Promise<WorkbookSheetSummary[]> {
  const parsed = Papa.parse<string[]>(text, {
    dynamicTyping: false,
    skipEmptyLines: false,
  });

  if (parsed.errors.some((error) => error.type !== 'Delimiter')) {
    const firstError = parsed.errors[0];
    throw new Error(firstError?.message || 'CSV parse failed');
  }

  const rows = parsed.data.map((row) => row.map((cell) => cell ?? ''));
  return [summarizeRows(rows, info)];
}

export async function parseCsvFile(file: File, sourceId = crypto.randomUUID()): Promise<WorkbookSheetSummary[]> {
  const text = await file.text();
  return parseCsvText(text, { sourceId, fileName: file.name });
}
