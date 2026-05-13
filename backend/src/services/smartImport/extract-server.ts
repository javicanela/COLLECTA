import * as XLSX from 'xlsx';
import type { SmartImportCell, WorkbookSheetSample } from './types';

function cellToSmartImportCell(cell: XLSX.CellObject | undefined | null): SmartImportCell {
  if (cell === undefined || cell === null) return null;
  if (cell.t === 'n') return cell.v as number;
  if (cell.t === 'b') return cell.v as boolean;
  const text = String(cell.v ?? '').trim();
  return text || null;
}

export function extractWorkbook(buffer: Buffer, fileName: string): WorkbookSheetSample[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheets: WorkbookSheetSample[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const ref = sheet['!ref'];
    if (!ref) {
      sheets.push({ sheetId: `${fileName}:${sheetName}`, name: sheetName, rows: [] });
      continue;
    }

    const range = XLSX.utils.decode_range(ref);
    const rows: SmartImportCell[][] = [];

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
      const row: SmartImportCell[] = [];
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
        const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        row.push(cellToSmartImportCell(sheet[addr]));
      }
      rows.push(row);
    }

    sheets.push({
      sheetId: `${fileName}:${sheetName}`,
      name: sheetName,
      rows,
    });
  }

  return sheets;
}

export function extractCsv(text: string, fileName: string): WorkbookSheetSample[] {
  const workbook = XLSX.read(text, { type: 'string' });
  const sheets: WorkbookSheetSample[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const ref = sheet['!ref'];
    if (!ref) {
      sheets.push({ sheetId: `${fileName}:${sheetName}`, name: sheetName, rows: [] });
      continue;
    }

    const range = XLSX.utils.decode_range(ref);
    const rows: SmartImportCell[][] = [];

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
      const row: SmartImportCell[] = [];
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
        const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        row.push(cellToSmartImportCell(sheet[addr]));
      }
      rows.push(row);
    }

    sheets.push({
      sheetId: `${fileName}:${sheetName}`,
      name: sheetName,
      rows,
    });
  }

  return sheets;
}

export function parseBufferToSheets(buffer: Buffer, fileName: string, mimeType: string): WorkbookSheetSample[] {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'csv' || mimeType === 'text/csv') {
    return extractCsv(buffer.toString('utf-8'), fileName);
  }

  if (['xlsx', 'xls', 'xlsm'].includes(ext) || mimeType.includes('spreadsheetml') || mimeType.includes('excel')) {
    return extractWorkbook(buffer, fileName);
  }

  throw new Error(`Unsupported file type: ${ext || mimeType}. Use the frontend for PDF, DOCX, JSON, XML, and image files.`);
}
