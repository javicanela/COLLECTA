import { collapseMultilevelHeaders } from './header-collapse';
import { detectDateLike, detectEmail, detectMoney, detectPhone, detectRfc } from './regex-detectors';
import { isBlankCell, normalizeHeaderKey, normalizeText, stringifyCell } from './normalize';
import type { DetectedRegion, HeaderRowCandidate, SmartImportCell } from './types';

const HEADER_TERMS = [
  'rfc', 'razonsocial', 'nombre', 'cliente', 'telefono', 'celular', 'whatsapp',
  'correo', 'email', 'regimen', 'categoria', 'asesor', 'responsable',
  'monto', 'importe', 'adeudo', 'saldo', 'total', 'vencimiento', 'fechavencimiento',
  'fechalimite', 'fecha', 'concepto', 'descripcion', 'servicio', 'tipo', 'estatus',
  'excluir', 'archivado',
];

const OPERATION_TERMS = [
  'monto', 'importe', 'adeudo', 'saldo', 'total', 'vencimiento', 'fechavencimiento',
  'fechalimite', 'concepto', 'descripcion', 'servicio', 'tipo', 'estatus',
];

function countNonEmpty(row: SmartImportCell[] | undefined): number {
  if (!row) return 0;
  return row.filter((cell) => !isBlankCell(cell)).length;
}

function countCanonicalTerms(row: SmartImportCell[] | undefined): number {
  if (!row) return 0;
  return row.reduce<number>((count, cell) => {
    const key = normalizeHeaderKey(cell);
    if (!key) return count;
    return count + (HEADER_TERMS.some((term) => key.includes(term) || term.includes(key)) ? 1 : 0);
  }, 0);
}

function countPatternData(row: SmartImportCell[] | undefined): number {
  if (!row) return 0;
  return row.reduce<number>((count, cell) => {
    if (detectRfc(cell).matched || detectEmail(cell).matched || detectPhone(cell).matched || detectMoney(cell).matched || detectDateLike(cell).matched) {
      return count + 1;
    }
    return count;
  }, 0);
}

function nonEmptyColumnBounds(rows: SmartImportCell[][], startRow: number, endRow: number): { startColumn: number; endColumn: number } {
  let startColumn = Number.POSITIVE_INFINITY;
  let endColumn = -1;

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const row = rows[rowIndex] || [];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      if (!isBlankCell(row[columnIndex])) {
        startColumn = Math.min(startColumn, columnIndex);
        endColumn = Math.max(endColumn, columnIndex);
      }
    }
  }

  if (!Number.isFinite(startColumn) || endColumn < 0) return { startColumn: 0, endColumn: 0 };
  return { startColumn, endColumn };
}

function hasGroupHeader(rows: SmartImportCell[][], rowIndex: number): boolean {
  if (rowIndex <= 0) return false;
  const previous = rows[rowIndex - 1];
  const current = rows[rowIndex];
  if (!previous || !current) return false;

  const previousNonEmpty = countNonEmpty(previous);
  if (previousNonEmpty === 0 || previousNonEmpty >= countNonEmpty(current)) return false;

  const previousPatternCells = countPatternData(previous);
  const previousText = previous.map((cell) => normalizeText(cell)).filter(Boolean).join(' ');
  return previousPatternCells === 0 && previousText.length > 0;
}

export function detectLikelyHeaderRows(rows: SmartImportCell[][], options: { sheetId: string }): HeaderRowCandidate[] {
  return rows
    .map((row, rowIndex) => {
      const nonEmptyCellCount = countNonEmpty(row);
      const canonicalTermCount = countCanonicalTerms(row);
      const nextRows = rows.slice(rowIndex + 1, rowIndex + 4);
      const nextPatternCount = nextRows.reduce((count, nextRow) => count + countPatternData(nextRow), 0);
      const reasonCodes: string[] = [];

      if (canonicalTermCount >= 2) reasonCodes.push('header:canonical_terms');
      if (nextPatternCount >= 2) reasonCodes.push('header:data_below');
      if (nonEmptyCellCount >= 3) reasonCodes.push('header:wide_row');

      const densityScore = Math.min(nonEmptyCellCount / 8, 0.25);
      const termScore = Math.min(canonicalTermCount * 0.18, 0.55);
      const dataScore = Math.min(nextPatternCount * 0.05, 0.2);
      const confidence = Math.min(0.82, densityScore + termScore + dataScore);

      return {
        sheetId: options.sheetId,
        rowIndex,
        confidence,
        nonEmptyCellCount,
        canonicalTermCount,
        reasonCodes,
      };
    })
    .filter((candidate) => candidate.nonEmptyCellCount >= 2 && candidate.confidence >= 0.32)
    .sort((a, b) => b.confidence - a.confidence || b.canonicalTermCount - a.canonicalTermCount);
}

export function detectTableRegions(sheetId: string, rows: SmartImportCell[][]): DetectedRegion[] {
  const candidates = detectLikelyHeaderRows(rows, { sheetId });
  const regions = candidates.map((candidate) => {
    const headerRows = hasGroupHeader(rows, candidate.rowIndex) ? [candidate.rowIndex - 1, candidate.rowIndex] : [candidate.rowIndex];
    const dataStartRow = headerRows[headerRows.length - 1] + 1;
    let endRow = dataStartRow - 1;

    for (let rowIndex = dataStartRow; rowIndex < rows.length; rowIndex++) {
      if (countNonEmpty(rows[rowIndex]) > 0) endRow = rowIndex;
    }

    const { startColumn, endColumn } = nonEmptyColumnBounds(rows, headerRows[0], Math.max(endRow, dataStartRow));
    const headerLabels = collapseMultilevelHeaders(rows, { headerRows, startColumn, endColumn });
    const headerKeys = headerLabels.map((label) => normalizeHeaderKey(label));
    const operationTermCount = headerKeys.filter((key) => OPERATION_TERMS.some((term) => key.includes(term))).length;
    const dataRowCount = Math.max(0, endRow - dataStartRow + 1);
    const reasonCodes = [...candidate.reasonCodes];

    if (operationTermCount >= 2) reasonCodes.push('region:operation_fields');
    if (dataRowCount >= 2) reasonCodes.push('region:data_rows');
    if (headerRows.length > 1) reasonCodes.push('region:multilevel_headers');

    const operationScore = Math.min(operationTermCount * 0.04, 0.18);
    const dataScore = Math.min(dataRowCount * 0.03, 0.12);
    const confidence = Math.min(0.99, candidate.confidence + operationScore + dataScore);
    const regionId = `${sheetId}!R${headerRows[0] + 1}C${startColumn + 1}:R${endRow + 1}C${endColumn + 1}`;

    return {
      regionId,
      sheetId,
      startRow: headerRows[0],
      endRow,
      startColumn,
      endColumn,
      headerRows,
      dataStartRow,
      headerLabels: headerLabels.map((label) => stringifyCell(label)),
      confidence,
      reasonCodes,
    };
  });

  return regions.sort((a, b) => b.confidence - a.confidence || b.headerLabels.length - a.headerLabels.length);
}
