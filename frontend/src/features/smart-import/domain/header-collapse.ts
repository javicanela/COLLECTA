import { isBlankCell, trimDisplayValue } from './normalize';
import type { SmartImportCell } from './types';

interface CollapseOptions {
  headerRows: number[];
  startColumn: number;
  endColumn: number;
}

export function collapseMultilevelHeaders(rows: SmartImportCell[][], options: CollapseOptions): string[] {
  const carryByHeaderRow = new Map<number, string>();
  const headers: string[] = [];

  for (let columnIndex = options.startColumn; columnIndex <= options.endColumn; columnIndex++) {
    const parts: string[] = [];

    for (const headerRow of options.headerRows) {
      const rawValue = rows[headerRow]?.[columnIndex];
      const displayValue = isBlankCell(rawValue) ? '' : trimDisplayValue(rawValue);

      if (displayValue) {
        carryByHeaderRow.set(headerRow, displayValue);
      }

      const carriedValue = displayValue || carryByHeaderRow.get(headerRow) || '';
      if (carriedValue && parts[parts.length - 1] !== carriedValue) {
        parts.push(carriedValue);
      }
    }

    headers.push(parts.join(' ').trim() || `Column ${columnIndex + 1}`);
  }

  return headers;
}
