import { runChallenge } from './challenge';
import { detectBoolean, detectEmail, detectMoney, detectPhone, detectRfc } from './regex-detectors';
import { profileColumns, scoreMappings } from './semantic-profiles';
import { detectTableRegions } from './table-detection';
import { stringifyCell } from './normalize';
import type {
  CanonicalField,
  CanonicalImportRow,
  ChallengeRegionSummary,
  ColumnProfile,
  DetectedRegion,
  MappingCandidate,
  SmartImportAnalysis,
  SmartImportCell,
  SmartImportSource,
  WorkbookSheetSummary,
} from './types';

interface AnalyzeInput {
  source: SmartImportSource;
  sheets: WorkbookSheetSummary[];
  preferredSheetId?: string;
  preferredRegionId?: string;
}

interface RegionBundle {
  sheet: WorkbookSheetSummary;
  region: DetectedRegion;
  columns: ColumnProfile[];
  mappings: MappingCandidate[];
  summary: ChallengeRegionSummary;
  confidence: number;
}

function summarizeSheet(sheet: WorkbookSheetSummary): WorkbookSheetSummary {
  const rowCount = sheet.rowCount ?? sheet.rows.length;
  const columnCount = sheet.columnCount ?? sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  const nonEmptyCellCount = sheet.nonEmptyCellCount ?? sheet.rows.reduce((count, row) => (
    count + row.filter((cell) => stringifyCell(cell).trim() !== '').length
  ), 0);

  return { ...sheet, rowCount, columnCount, nonEmptyCellCount };
}

function createRegionBundle(sheet: WorkbookSheetSummary, region: DetectedRegion): RegionBundle {
  const columns = profileColumns(sheet.rows, region);
  const mappings = scoreMappings(columns);
  const mappedCandidates = mappings.filter((mapping) => mapping.field !== 'ignore' && mapping.confidence >= 0.42);
  const averageMappingConfidence = mappedCandidates.length > 0
    ? mappedCandidates.reduce((sum, mapping) => sum + mapping.confidence, 0) / mappedCandidates.length
    : 0;
  const assumptionCount = mappings.reduce((sum, mapping) => sum + mapping.assumptions.length + (mapping.confidence < 0.65 ? 1 : 0), 0);
  const confidence = Math.min(0.99, Number(((region.confidence * 0.5) + (averageMappingConfidence * 0.5)).toFixed(3)));

  return {
    sheet,
    region,
    columns,
    mappings,
    confidence,
    summary: {
      regionId: region.regionId,
      confidence,
      mappedFieldCount: mappedCandidates.length,
      assumptionCount,
      reasonCodes: region.reasonCodes,
    },
  };
}

function setCanonicalValue(row: CanonicalImportRow, field: CanonicalField, value: SmartImportCell): void {
  const raw = stringifyCell(value).trim();
  if (!raw || field === 'ignore') return;

  if (field === 'client.rfc') {
    const detected = detectRfc(value);
    if (detected.matched) row.client.rfc = detected.normalized;
    else row.warnings.push('row:rfc_unparsed');
    return;
  }

  if (field === 'client.email') {
    const detected = detectEmail(value);
    row.client.email = detected.matched ? detected.normalized : raw;
    return;
  }

  if (field === 'client.telefono') {
    const detected = detectPhone(value);
    row.client.telefono = detected.matched ? detected.normalized : raw;
    return;
  }

  if (field === 'operation.monto') {
    const detected = detectMoney(value);
    if (detected.matched) row.operation.monto = detected.value;
    else row.warnings.push('row:monto_unparsed');
    return;
  }

  if (field === 'operation.excluir' || field === 'operation.archived') {
    const detected = detectBoolean(value);
    const target = field.split('.')[1] as 'excluir' | 'archived';
    row.operation[target] = detected.matched ? detected.value : false;
    return;
  }

  if (field === 'operation.estatus') {
    row.operation.estatus = raw.toUpperCase();
    return;
  }

  const [scope, property] = field.split('.') as ['client' | 'operation', string];
  if (scope === 'client') {
    row.client[property as keyof CanonicalImportRow['client']] = raw;
  } else {
    row.operation[property as keyof CanonicalImportRow['operation']] = raw as never;
  }
}

export function buildCanonicalRows(sheet: WorkbookSheetSummary, region: DetectedRegion, mappings: MappingCandidate[]): CanonicalImportRow[] {
  const activeMappings = mappings.filter((mapping) => mapping.field !== 'ignore' && mapping.confidence >= 0.38);
  const rows: CanonicalImportRow[] = [];

  for (let sourceRowIndex = region.dataStartRow; sourceRowIndex <= region.endRow; sourceRowIndex++) {
    const sourceRow = sheet.rows[sourceRowIndex] || [];
    const canonicalRow: CanonicalImportRow = {
      rowNumber: sourceRowIndex + 1,
      sourceRowIndex,
      client: {},
      operation: {},
      warnings: [],
    };

    for (const mapping of activeMappings) {
      setCanonicalValue(canonicalRow, mapping.field, sourceRow[mapping.columnIndex]);
    }

    if (Object.keys(canonicalRow.client).length > 0 || Object.keys(canonicalRow.operation).length > 0) {
      rows.push(canonicalRow);
    }
  }

  return rows;
}

export function analyzeSmartImport(input: AnalyzeInput): SmartImportAnalysis {
  const sheets = input.sheets.map(summarizeSheet);
  const bundles = sheets.flatMap((sheet) => detectTableRegions(sheet.sheetId, sheet.rows).map((region) => createRegionBundle(sheet, region)));

  if (bundles.length === 0) {
    throw new Error('No table regions detected');
  }

  const scopedBundles = input.preferredSheetId
    ? bundles.filter((bundle) => bundle.sheet.sheetId === input.preferredSheetId)
    : bundles;
  const rankedBundles = (scopedBundles.length > 0 ? scopedBundles : bundles)
    .sort((a, b) => b.confidence - a.confidence || b.summary.mappedFieldCount - a.summary.mappedFieldCount);
  const preferredBundle = input.preferredRegionId
    ? rankedBundles.find((bundle) => bundle.region.regionId === input.preferredRegionId)
    : undefined;
  const initialBundle = preferredBundle || rankedBundles[0];
  const challengeResult = runChallenge({
    initialRegion: initialBundle.summary,
    alternativeRegions: rankedBundles.filter((bundle) => bundle.region.regionId !== initialBundle.region.regionId).map((bundle) => bundle.summary),
    mappings: initialBundle.mappings,
  });

  const selectedBundle = input.preferredRegionId
    ? initialBundle
    : rankedBundles.find((bundle) => bundle.region.regionId === challengeResult.selectedRegionId) || initialBundle;
  const canonicalRows = buildCanonicalRows(selectedBundle.sheet, selectedBundle.region, selectedBundle.mappings);
  const warnings = [...challengeResult.warnings];

  if (canonicalRows.length === 0) warnings.push('analysis:no_canonical_rows');

  return {
    source: input.source,
    selectedSheet: selectedBundle.sheet,
    selectedRegion: selectedBundle.region,
    detectedRegions: rankedBundles.map((bundle) => bundle.region),
    columns: selectedBundle.columns,
    mappings: selectedBundle.mappings,
    challengeResult,
    canonicalRows,
    confidence: selectedBundle.confidence,
    providerUsed: 'deterministic',
    providersAttempted: ['deterministic'],
    warnings,
  };
}
