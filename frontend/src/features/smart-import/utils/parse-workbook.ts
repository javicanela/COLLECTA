import * as XLSX from 'xlsx';
import { parseCsvFile } from './parse-csv';
import type { SmartImportCell, WorkbookSheetSummary } from '../domain/types';

interface ParseSourceInfo {
  sourceId: string;
  fileName: string;
}

function summarizeRows(rows: SmartImportCell[][], info: ParseSourceInfo, sheetName: string, sheetIndex: number): WorkbookSheetSummary {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const nonEmptyCellCount = rows.reduce((count, row) => (
    count + row.filter((cell) => String(cell ?? '').trim() !== '').length
  ), 0);

  return {
    sheetId: `${info.sourceId}:sheet-${sheetIndex + 1}`,
    name: sheetName,
    rows,
    rowCount: rows.length,
    columnCount,
    nonEmptyCellCount,
  };
}

export async function parseWorkbookArrayBuffer(buffer: ArrayBuffer, info: ParseSourceInfo): Promise<WorkbookSheetSummary[]> {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  return workbook.SheetNames.map((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<SmartImportCell[]>(worksheet, {
      header: 1,
      blankrows: true,
      defval: '',
      raw: true,
    });

    return summarizeRows(rows, info, sheetName, sheetIndex);
  });
}

export async function parseWorkbookFile(file: File, sourceId = crypto.randomUUID()): Promise<WorkbookSheetSummary[]> {
  const buffer = await file.arrayBuffer();
  return parseWorkbookArrayBuffer(buffer, { sourceId, fileName: file.name });
}

export async function parseSmartImportFile(file: File, sourceId = crypto.randomUUID()): Promise<WorkbookSheetSummary[]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv') || file.type.includes('csv')) {
    return parseCsvFile(file, sourceId);
  }
  return parseWorkbookFile(file, sourceId);
}
