import { isBlankCell, stringifyCell } from './normalize';
import type { SmartImportCell } from './types';

export function collapseMultilevelHeaders(
  rows: SmartImportCell[][],
  options: { headerRows: number[]; startColumn: number; endColumn: number },
): string[] {
  const { headerRows, startColumn, endColumn } = options;
  if (headerRows.length <= 1) {
    const row = rows[headerRows[0]];
    if (!row) return [];
    const labels: string[] = [];
    for (let col = startColumn; col <= endColumn; col++) {
      labels.push(stringifyCell(row[col]).trim());
    }
    return labels;
  }

  const labels: string[] = [];
  for (let col = startColumn; col <= endColumn; col++) {
    const parts: string[] = [];
    for (const rowIndex of headerRows) {
      const cell = rows[rowIndex]?.[col];
      if (!isBlankCell(cell)) {
        parts.push(stringifyCell(cell).trim());
      }
    }
    labels.push(parts.join(' ') || `Column ${col + 1}`);
  }
  return labels;
}
