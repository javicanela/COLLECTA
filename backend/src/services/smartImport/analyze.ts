import crypto from 'crypto';
import { adaptCanonicalRowsToImportRows } from './legacyAdapter';
import type {
  CanonicalField,
  CanonicalImportRow,
  DetectedRegion,
  MappingCandidate,
  SmartImportAnalyzeInput,
  SmartImportAnalyzeResult,
  SmartImportCell,
  WorkbookSheetSample,
} from './types';

const RFC_REGEX = /^[A-Z\u00d1&]{3,4}\d{6}[A-Z0-9]{2,3}$/;

function stringifyCell(value: SmartImportCell | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeText(value: SmartImportCell | undefined): string {
  return stringifyCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\br\s*\.?\s*f\s*\.?\s*c\.?\b/g, 'rfc')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeKey(value: SmartImportCell | undefined): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function detectRfc(value: SmartImportCell | undefined): string | null {
  const normalized = stringifyCell(value).trim().toUpperCase().replace(/[\s.\-_/]/g, '');
  return RFC_REGEX.test(normalized) ? normalized : null;
}

function detectMoney(value: SmartImportCell | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = stringifyCell(value).replace(/\b(mxn|usd|m\.n\.)\b/gi, '').replace(/[,$\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectBoolean(value: SmartImportCell | undefined): boolean | null {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeText(value);
  if (['si', 's', 'true', '1', 'yes'].includes(normalized)) return true;
  if (['no', 'n', 'false', '0'].includes(normalized)) return false;
  return null;
}

function countHeaderTerms(row: SmartImportCell[]): number {
  const terms = ['rfc', 'nombre', 'cliente', 'razonsocial', 'email', 'correo', 'telefono', 'regimen', 'categoria', 'asesor', 'monto', 'importe', 'adeudo', 'fecha', 'vencimiento', 'concepto', 'descripcion', 'tipo', 'estatus', 'excluir'];
  return row.reduce<number>((count, cell) => {
    const key = normalizeKey(cell);
    return count + (terms.some((term) => key.includes(term)) ? 1 : 0);
  }, 0);
}

function detectRegion(sheet: WorkbookSheetSample): DetectedRegion {
  const rankedRows = sheet.rows
    .map((row, rowIndex) => ({ rowIndex, terms: countHeaderTerms(row), width: row.filter((cell) => stringifyCell(cell).trim()).length }))
    .filter((row) => row.width >= 2)
    .sort((a, b) => b.terms - a.terms || b.width - a.width);

  const headerRow = rankedRows[0] || { rowIndex: 0, terms: 0, width: sheet.rows[0]?.length || 0 };
  const header = sheet.rows[headerRow.rowIndex] || [];
  const startColumn = 0;
  const endColumn = Math.max(0, header.length - 1);
  const dataStartRow = headerRow.rowIndex + 1;
  const endRow = Math.max(dataStartRow, sheet.rows.length - 1);
  const confidence = Math.min(0.95, 0.35 + (headerRow.terms * 0.1) + (Math.max(0, endRow - dataStartRow + 1) * 0.04));

  return {
    regionId: `${sheet.sheetId}!R${headerRow.rowIndex + 1}C1:R${endRow + 1}C${endColumn + 1}`,
    sheetId: sheet.sheetId,
    startRow: headerRow.rowIndex,
    endRow,
    startColumn,
    endColumn,
    dataStartRow,
    headerLabels: header.map((cell, index) => stringifyCell(cell).trim() || `Column ${index + 1}`),
    confidence,
    reasonCodes: headerRow.terms >= 2 ? ['header:canonical_terms', 'region:data_rows'] : ['region:weak_header'],
  };
}

function mapHeader(header: string, sampleValues: SmartImportCell[]): MappingCandidate {
  const key = normalizeKey(header);
  const values = sampleValues.filter((value) => stringifyCell(value).trim() !== '');
  const rfcMatches = values.filter((value) => detectRfc(value)).length;
  const moneyMatches = values.filter((value) => detectMoney(value) !== null).length;
  const reasonCodes: string[] = [];
  let field: CanonicalField = 'ignore';
  let confidence = 0.35;

  const assign = (nextField: CanonicalField, nextConfidence: number, reason: string) => {
    field = nextField;
    confidence = nextConfidence;
    reasonCodes.push(reason);
  };

  if (key.includes('rfc') || rfcMatches > 0) assign('client.rfc', 0.92, 'header:alias:rfc');
  else if (key.includes('razonsocial') || key.includes('nombre') || key.includes('cliente')) assign('client.nombre', 0.82, 'header:alias:nombre');
  else if (key.includes('correo') || key.includes('email')) assign('client.email', 0.84, 'header:alias:email');
  else if (key.includes('telefono') || key.includes('whatsapp') || key.includes('celular')) assign('client.telefono', 0.78, 'header:alias:telefono');
  else if (key.includes('regimen')) assign('client.regimen', 0.78, 'header:alias:regimen');
  else if (key.includes('categoria') || key.includes('clasificacion')) assign('client.categoria', 0.72, 'header:alias:categoria');
  else if (key.includes('monto') || key.includes('importe') || key.includes('adeudo') || moneyMatches > 0) assign('operation.monto', 0.88, 'header:alias:monto');
  else if ((key.includes('fecha') && key.includes('venc')) || key.includes('fechalimite') || key.includes('vencimiento')) assign('operation.fechaVence', 0.84, 'header:alias:fechaVence');
  else if (key.includes('fechapago')) assign('operation.fechaPago', 0.78, 'header:alias:fechaPago');
  else if (key.includes('estatus') || key.includes('status')) assign('operation.estatus', 0.76, 'header:alias:estatus');
  else if (key.includes('excluir') || key.includes('omitir')) assign('operation.excluir', 0.76, 'header:alias:excluir');
  else if (key.includes('descripcion') || key.includes('detalle')) assign('operation.descripcion', 0.78, 'header:alias:descripcion');
  else if (key.includes('concepto') || key.includes('tipo') || key.includes('servicio')) assign('operation.tipo', 0.74, 'header:alias:tipo');
  else if (key.includes('asesor') || key.includes('responsable')) assign('operation.asesor', 0.68, 'header:alias:asesor');

  if (rfcMatches > 0) reasonCodes.push('values:rfc');
  if (moneyMatches > 0) reasonCodes.push('values:money');

  return {
    columnIndex: 0,
    sourceHeader: header,
    field,
    confidence,
    reasonCodes: [...new Set(reasonCodes)],
  };
}

function buildMappings(sheet: WorkbookSheetSample, region: DetectedRegion): MappingCandidate[] {
  const dataRows = sheet.rows.slice(region.dataStartRow, region.endRow + 1);
  return region.headerLabels.map((header, offset) => {
    const columnIndex = region.startColumn + offset;
    const candidate = mapHeader(header, dataRows.map((row) => row[columnIndex]));
    return { ...candidate, columnIndex };
  });
}

function setCanonicalValue(row: CanonicalImportRow, field: CanonicalField, value: SmartImportCell | undefined): void {
  const raw = stringifyCell(value).trim();
  if (!raw || field === 'ignore') return;

  if (field === 'client.rfc') {
    const rfc = detectRfc(value);
    if (rfc) row.client.rfc = rfc;
    return;
  }
  if (field === 'operation.monto') {
    const money = detectMoney(value);
    if (money !== null) row.operation.monto = money;
    return;
  }
  if (field === 'operation.excluir' || field === 'operation.archived') {
    const bool = detectBoolean(value) ?? false;
    row.operation[field.split('.')[1] as 'excluir' | 'archived'] = bool;
    return;
  }

  const [scope, property] = field.split('.') as ['client' | 'operation', string];
  if (scope === 'client') {
    row.client[property as keyof CanonicalImportRow['client']] = raw;
  } else {
    row.operation[property as keyof CanonicalImportRow['operation']] = raw as never;
  }
}

function buildCanonicalRows(sheet: WorkbookSheetSample, region: DetectedRegion, mappings: MappingCandidate[]): CanonicalImportRow[] {
  return sheet.rows.slice(region.dataStartRow, region.endRow + 1).map((sourceRow, offset) => {
    const sourceRowIndex = region.dataStartRow + offset;
    const row: CanonicalImportRow = {
      rowNumber: sourceRowIndex + 1,
      sourceRowIndex,
      client: {},
      operation: {},
      warnings: [],
    };
    for (const mapping of mappings) {
      setCanonicalValue(row, mapping.field, sourceRow[mapping.columnIndex]);
    }
    return row;
  });
}

export function analyzeSmartImportSamples(input: SmartImportAnalyzeInput): SmartImportAnalyzeResult {
  const regions = input.sheets.map((sheet) => ({ sheet, region: detectRegion(sheet) }));
  const selected = regions.sort((a, b) => b.region.confidence - a.region.confidence)[0];
  const mappings = buildMappings(selected.sheet, selected.region);
  const previewCanonicalRows = buildCanonicalRows(selected.sheet, selected.region, mappings);
  const challengeResult = {
    status: 'confirmed' as const,
    initialRegionId: selected.region.regionId,
    selectedRegionId: selected.region.regionId,
    confidenceDelta: 0,
    findings: ['challenge:initial_region_confirmed'],
    warnings: [],
  };

  return {
    analysisId: `sia_${crypto.randomUUID()}`,
    source: input.source,
    selectedSheet: { sheetId: selected.sheet.sheetId, name: selected.sheet.name },
    selectedRegion: selected.region,
    detectedRegions: regions.map((item) => item.region),
    providerUsed: 'deterministic',
    providersAttempted: ['deterministic'],
    challengeResult,
    confidence: selected.region.confidence,
    mappings,
    warnings: [],
    previewCanonicalRows,
    legacyRows: adaptCanonicalRowsToImportRows(previewCanonicalRows),
  };
}
