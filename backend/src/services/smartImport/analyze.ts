import crypto from 'crypto';
import { adaptCanonicalRowsToImportRows } from './legacyAdapter';
import { collapseMultilevelHeaders } from './header-collapse';
import { detectBoolean, detectDateLike, detectEmail, detectMoney, detectPhone, detectRfc, detectSatTerm } from './regex-detectors';
import { isBlankCell, normalizeHeaderKey, normalizeText, stringifyCell, tokenizeHeader } from './normalize';
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

type DetectorReason = 'rfc' | 'email' | 'phone' | 'money' | 'date' | 'sat' | 'boolean' | 'longText';

interface AliasConfig {
  reasonKey: string;
  aliases: string[];
  valueReason?: DetectorReason;
}

const FIELD_ALIASES: Record<string, AliasConfig> = {
  'client.rfc': { reasonKey: 'rfc', aliases: ['rfc', 'rfccliente', 'clavefiscal'], valueReason: 'rfc' },
  'client.nombre': { reasonKey: 'nombre', aliases: ['nombre', 'nombrecliente', 'razonsocial', 'cliente', 'contribuyente', 'empresa'] },
  'client.telefono': { reasonKey: 'telefono', aliases: ['telefono', 'celular', 'whatsapp', 'movil', 'contacto'], valueReason: 'phone' },
  'client.email': { reasonKey: 'email', aliases: ['email', 'correo', 'correoelectronico', 'mail'], valueReason: 'email' },
  'client.regimen': { reasonKey: 'regimen', aliases: ['regimen', 'regimenfiscal', 'tiporegimen'], valueReason: 'sat' },
  'client.categoria': { reasonKey: 'categoria', aliases: ['categoria', 'clasificacion', 'segmento'] },
  'client.asesor': { reasonKey: 'asesor', aliases: ['asesorcliente', 'responsablecliente'] },
  'operation.tipo': { reasonKey: 'tipo', aliases: ['tipo', 'tipooperacion', 'operaciontipo', 'concepto', 'servicio'] },
  'operation.descripcion': { reasonKey: 'descripcion', aliases: ['descripcion', 'descripcionoperacion', 'detalle', 'detalleservicio', 'concepto', 'servicio'], valueReason: 'longText' },
  'operation.monto': { reasonKey: 'monto', aliases: ['monto', 'importe', 'adeudo', 'saldo', 'total', 'honorarios', 'cuota'], valueReason: 'money' },
  'operation.fechaVence': { reasonKey: 'fechaVence', aliases: ['fechavence', 'fechavencimiento', 'vencimiento', 'fechalimite', 'limitepago'], valueReason: 'date' },
  'operation.fechaPago': { reasonKey: 'fechaPago', aliases: ['fechapago', 'pagadoel', 'fechacobro'], valueReason: 'date' },
  'operation.estatus': { reasonKey: 'estatus', aliases: ['estatus', 'status', 'estadopago', 'situacion'] },
  'operation.asesor': { reasonKey: 'asesor', aliases: ['asesor', 'responsable', 'contador', 'ejecutivo'] },
  'operation.excluir': { reasonKey: 'excluir', aliases: ['excluir', 'omitir', 'ignorar'], valueReason: 'boolean' },
  'operation.archived': { reasonKey: 'archived', aliases: ['archived', 'archivado', 'archivo'], valueReason: 'boolean' },
};

// ── Helpers ──────────────────────────────────────────────────

function countNonEmpty(row: SmartImportCell[] | undefined): number {
  if (!row) return 0;
  return row.filter(c => !isBlankCell(c)).length;
}

function countCanonicalTerms(row: SmartImportCell[] | undefined): number {
  if (!row) return 0;
  return row.reduce<number>((count, cell) => {
    const key = normalizeHeaderKey(cell);
    if (!key) return count;
    return count + (HEADER_TERMS.some(t => key.includes(t) || t.includes(key)) ? 1 : 0);
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
  for (let ri = startRow; ri <= endRow; ri++) {
    const row = rows[ri] || [];
    for (let ci = 0; ci < row.length; ci++) {
      if (!isBlankCell(row[ci])) {
        startColumn = Math.min(startColumn, ci);
        endColumn = Math.max(endColumn, ci);
      }
    }
  }
  if (!Number.isFinite(startColumn) || endColumn < 0) return { startColumn: 0, endColumn: 0 };
  return { startColumn, endColumn };
}

function hasGroupHeader(rows: SmartImportCell[][], rowIndex: number): boolean {
  if (rowIndex <= 0) return false;
  const prev = rows[rowIndex - 1];
  const curr = rows[rowIndex];
  if (!prev || !curr) return false;
  const prevNonEmpty = countNonEmpty(prev);
  if (prevNonEmpty === 0 || prevNonEmpty >= countNonEmpty(curr)) return false;
  const prevPattern = countPatternData(prev);
  const prevText = prev.map(c => normalizeText(c)).filter(Boolean).join(' ');
  return prevPattern === 0 && prevText.length > 0;
}

function detectLikelyHeaderRows(rows: SmartImportCell[][], sheetId: string) {
  return rows.map((row, rowIndex) => {
    const nonEmptyCellCount = countNonEmpty(row);
    const canonicalTermCount = countCanonicalTerms(row);
    const nextRows = rows.slice(rowIndex + 1, rowIndex + 4);
    const nextPatternCount = nextRows.reduce((s, r) => s + countPatternData(r), 0);
    const reasonCodes: string[] = [];
    if (canonicalTermCount >= 2) reasonCodes.push('header:canonical_terms');
    if (nextPatternCount >= 2) reasonCodes.push('header:data_below');
    if (nonEmptyCellCount >= 3) reasonCodes.push('header:wide_row');
    const confidence = Math.min(0.82, Math.min(nonEmptyCellCount / 8, 0.25) + Math.min(canonicalTermCount * 0.18, 0.55) + Math.min(nextPatternCount * 0.05, 0.2));
    return { sheetId, rowIndex, confidence, nonEmptyCellCount, canonicalTermCount, reasonCodes };
  }).filter(c => c.nonEmptyCellCount >= 2 && c.confidence >= 0.32)
    .sort((a, b) => b.confidence - a.confidence || b.canonicalTermCount - a.canonicalTermCount);
}

function detectTableRegions(sheetId: string, rows: SmartImportCell[][]): DetectedRegion[] {
  const candidates = detectLikelyHeaderRows(rows, sheetId);
  return candidates.map(candidate => {
    const headerRows = hasGroupHeader(rows, candidate.rowIndex) ? [candidate.rowIndex - 1, candidate.rowIndex] : [candidate.rowIndex];
    const dataStartRow = headerRows[headerRows.length - 1] + 1;
    let endRow = dataStartRow - 1;
    for (let ri = dataStartRow; ri < rows.length; ri++) {
      if (countNonEmpty(rows[ri]) > 0) endRow = ri;
    }
    const { startColumn, endColumn } = nonEmptyColumnBounds(rows, headerRows[0], Math.max(endRow, dataStartRow));
    const headerLabels = collapseMultilevelHeaders(rows, { headerRows, startColumn, endColumn });
    const headerKeys = headerLabels.map(l => normalizeHeaderKey(l));
    const operationTermCount = headerKeys.filter(k => OPERATION_TERMS.some(t => k.includes(t))).length;
    const dataRowCount = Math.max(0, endRow - dataStartRow + 1);
    const reasonCodes = [...candidate.reasonCodes];
    if (operationTermCount >= 2) reasonCodes.push('region:operation_fields');
    if (dataRowCount >= 2) reasonCodes.push('region:data_rows');
    if (headerRows.length > 1) reasonCodes.push('region:multilevel_headers');
    const confidence = Math.min(0.99, candidate.confidence + Math.min(operationTermCount * 0.04, 0.18) + Math.min(dataRowCount * 0.03, 0.12));
    const regionId = `${sheetId}!R${headerRows[0] + 1}C${startColumn + 1}:R${endRow + 1}C${endColumn + 1}`;
    return {
      regionId, sheetId,
      startRow: headerRows[0], endRow, startColumn, endColumn,
      headerRows, dataStartRow,
      headerLabels: headerLabels.map(l => stringifyCell(l)),
      confidence, reasonCodes,
    } as DetectedRegion;
  }).sort((a, b) => b.confidence - a.confidence || b.headerLabels.length - a.headerLabels.length);
}

// ── Column profiling ─────────────────────────────────────────

interface ColumnProfile {
  columnIndex: number;
  sourceHeader: string;
  normalizedHeader: string;
  tokens: string[];
  nonEmptyCount: number;
  totalCount: number;
  detectors: Record<string, { matches: number; ratio: number }>;
  reasonCodes: string[];
}

interface ChallengeRegionSummary {
  regionId: string;
  confidence: number;
  mappedFieldCount: number;
  assumptionCount: number;
  reasonCodes: string[];
}

interface RegionBundle {
  sheet: WorkbookSheetSample;
  region: DetectedRegion;
  columns: ColumnProfile[];
  mappings: MappingCandidate[];
  confidence: number;
  summary: ChallengeRegionSummary;
}

function profileColumns(rows: SmartImportCell[][], region: DetectedRegion): ColumnProfile[] {
  const dataRows = rows.slice(region.dataStartRow, region.endRow + 1);
  return region.headerLabels.map((sourceHeader, offset) => {
    const columnIndex = region.startColumn + offset;
    const sampleValues = dataRows.map(r => r[columnIndex]).filter(v => !isBlankCell(v));
    const total = sampleValues.length;

    const counts: Record<string, string[]> = { rfc: [], email: [], phone: [], money: [], date: [], sat: [], boolean: [], longText: [] };
    for (const value of sampleValues) {
      const display = stringifyCell(value);
      if (detectRfc(value).matched) counts.rfc.push(display);
      if (detectEmail(value).matched) counts.email.push(display);
      if (detectPhone(value).matched) counts.phone.push(display);
      if (detectMoney(value).matched) counts.money.push(display);
      if (detectDateLike(value).matched) counts.date.push(display);
      if (detectSatTerm(value).matched) counts.sat.push(display);
      if (detectBoolean(value).matched) counts.boolean.push(display);
      if (normalizeText(value).length >= 16) counts.longText.push(display);
    }

    const detectors: Record<string, { matches: number; ratio: number }> = {};
    const reasonCodes: string[] = [];
    for (const [key, matches] of Object.entries(counts)) {
      const ratio = total > 0 ? matches.length / total : 0;
      detectors[key] = { matches: matches.length, ratio };
      if (matches.length > 0) reasonCodes.push(`values:${key === 'longText' ? 'long_text' : key}`);
    }

    return { columnIndex, sourceHeader, normalizedHeader: normalizeHeaderKey(sourceHeader), tokens: tokenizeHeader(sourceHeader), nonEmptyCount: total, totalCount: sampleValues.length, detectors, reasonCodes };
  });
}

function scoreHeader(field: CanonicalField, normalizedHeader: string): { score: number; reasonCodes: string[] } {
  const config = FIELD_ALIASES[field];
  if (!config) return { score: 0, reasonCodes: [] };
  for (const alias of config.aliases) {
    const aliasKey = normalizeHeaderKey(alias);
    if (normalizedHeader === aliasKey) return { score: 0.58, reasonCodes: [`header:alias:${config.reasonKey}`] };
  }
  for (const alias of config.aliases) {
    const aliasKey = normalizeHeaderKey(alias);
    if (normalizedHeader.includes(aliasKey) || aliasKey.includes(normalizedHeader)) return { score: 0.42, reasonCodes: [`header:alias:${config.reasonKey}`] };
  }
  return { score: 0, reasonCodes: [] };
}

function detectorScore(profile: ColumnProfile, field: CanonicalField): { score: number; reasonCodes: string[] } {
  const config = FIELD_ALIASES[field];
  if (!config?.valueReason) return { score: 0, reasonCodes: [] };

  const detector = profile.detectors[config.valueReason];
  if (!detector || detector.ratio < 0.34) return { score: 0, reasonCodes: [] };

  const scoreMap: Record<DetectorReason, number> = {
    rfc: 0.42,
    email: 0.4,
    phone: 0.36,
    money: 0.38,
    date: 0.34,
    sat: 0.3,
    boolean: 0.28,
    longText: 0.3,
  };

  return {
    score: scoreMap[config.valueReason] * detector.ratio,
    reasonCodes: [`values:${config.valueReason === 'longText' ? 'long_text' : config.valueReason}`],
  };
}

function scoreMappings(profiles: ColumnProfile[]): MappingCandidate[] {
  const canonicalFields = Object.keys(FIELD_ALIASES) as CanonicalField[];

  function buildCandidates(profile: ColumnProfile): MappingCandidate[] {
    const candidates: MappingCandidate[] = [];
    for (const field of canonicalFields) {
      const header = scoreHeader(field, profile.normalizedHeader);
      const value = detectorScore(profile, field);
      const assumptions: string[] = [];
      const reasonCodes = [...header.reasonCodes, ...value.reasonCodes];
      let confidence = header.score + value.score;

      if (field === 'operation.descripcion' && profile.detectors.longText?.ratio >= 0.5) confidence += 0.12;
      if (field === 'client.nombre' && profile.detectors.longText?.ratio >= 0.5 && profile.detectors.rfc?.ratio === 0) {
        confidence += 0.08;
        reasonCodes.push('values:name_like_text');
      }
      if (field === 'operation.tipo' && profile.detectors.longText?.ratio >= 0.5) {
        confidence -= 0.08;
        reasonCodes.push('values:long_text');
        assumptions.push('Long descriptions may not be operation type values');
      }
      if (confidence <= 0.18) continue;

      candidates.push({
        columnIndex: profile.columnIndex,
        sourceHeader: profile.sourceHeader,
        field,
        confidence: Math.max(0.01, Math.min(0.99, Number(confidence.toFixed(3)))),
        reasonCodes: [...new Set(reasonCodes)],
        assumptions,
        alternatives: [],
      });
    }
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  return profiles.map(profile => {
    const [best, ...alternatives] = buildCandidates(profile);
    if (!best) {
      return {
        columnIndex: profile.columnIndex,
        sourceHeader: profile.sourceHeader,
        field: 'ignore' as CanonicalField,
        confidence: 0.35,
        reasonCodes: ['mapping:no_signal'],
        assumptions: ['No reliable canonical field detected'],
        alternatives: [],
      };
    }
    return {
      ...best,
      alternatives: alternatives.slice(0, 3).map(alternative => ({
        field: alternative.field,
        confidence: alternative.confidence,
        reasonCodes: alternative.reasonCodes,
      })),
    };
  });
}

// ── Challenge ─────────────────────────────────────────────────

function runChallenge(
  initialBundle: ChallengeRegionSummary,
  alternativeBundles: ChallengeRegionSummary[],
  mappings: MappingCandidate[],
) {
  const bestAlt = alternativeBundles.sort((a, b) => b.confidence - a.confidence)[0];
  let selectedRegionId = initialBundle.regionId;
  let selectedConfidence = initialBundle.confidence;
  let status: 'confirmed' | 'changed' | 'downgraded' = 'confirmed';
  const findings: string[] = [];
  const warnings: string[] = [];

  if (
    bestAlt &&
    bestAlt.confidence >= initialBundle.confidence + 0.08 &&
    bestAlt.mappedFieldCount >= initialBundle.mappedFieldCount &&
    bestAlt.assumptionCount <= initialBundle.assumptionCount
  ) {
    status = 'changed';
    selectedRegionId = bestAlt.regionId;
    selectedConfidence = bestAlt.confidence;
    findings.push('challenge:alternative_region_stronger');
  }

  for (const mapping of mappings) {
    const descriptionAlternative = mapping.alternatives?.find(alternative => alternative.field === 'operation.descripcion');
    const hasTipoDescriptionConflict =
      mapping.field === 'operation.tipo' &&
      descriptionAlternative &&
      Math.abs(mapping.confidence - descriptionAlternative.confidence) <= 0.15 &&
      mapping.reasonCodes.includes('values:long_text');

    if (hasTipoDescriptionConflict) {
      warnings.push('conflict:tipo_vs_descripcion');
      findings.push('challenge:mapping_conflict_detected');
    }
  }

  if (warnings.length > 0 && status === 'confirmed') {
    status = 'downgraded';
    selectedConfidence = Math.max(0, selectedConfidence - 0.08);
  }

  if (findings.length === 0) findings.push('challenge:initial_region_confirmed');

  return {
    status,
    initialRegionId: initialBundle.regionId,
    selectedRegionId,
    confidenceDelta: Number((selectedConfidence - initialBundle.confidence).toFixed(3)),
    findings,
    warnings,
  };
}

// ── Canonical row builder ────────────────────────────────────

function setCanonicalValue(row: CanonicalImportRow, field: CanonicalField, value: SmartImportCell | undefined): void {
  const raw = stringifyCell(value).trim();
  if (!raw || field === 'ignore') return;

  if (field === 'client.rfc') { const r = detectRfc(value); if (r.matched) row.client.rfc = r.normalized; return; }
  if (field === 'client.email') { const r = detectEmail(value); row.client.email = r.matched ? r.normalized : raw; return; }
  if (field === 'client.telefono') { const r = detectPhone(value); row.client.telefono = r.matched ? r.normalized : raw; return; }
  if (field === 'operation.monto') { const r = detectMoney(value); if (r.matched) row.operation.monto = r.value; return; }
  if (field === 'operation.excluir' || field === 'operation.archived') { const r = detectBoolean(value); const t = field.split('.')[1] as 'excluir' | 'archived'; row.operation[t] = r.matched ? r.value : false; return; }
  if (field === 'operation.estatus') { row.operation.estatus = raw.toUpperCase(); return; }

  const [scope, property] = field.split('.') as ['client' | 'operation', string];
  if (scope === 'client') (row.client as any)[property] = raw;
  else (row.operation as any)[property] = raw as never;
}

function buildCanonicalRows(
  sheet: WorkbookSheetSample,
  region: DetectedRegion,
  mappings: MappingCandidate[],
  inputSource: SmartImportAnalyzeInput['source'],
): CanonicalImportRow[] {
  const active = mappings.filter(m => m.field !== 'ignore' && m.confidence >= 0.38);
  const rows: CanonicalImportRow[] = [];
  for (let sri = region.dataStartRow; sri <= region.endRow; sri++) {
    const sourceRow = sheet.rows[sri] || [];
    const row: CanonicalImportRow = {
      rowNumber: sri + 1,
      sourceRowIndex: sri,
      source: {
        fileName: inputSource.fileName,
        sheetName: sheet.name,
        regionId: region.regionId,
        extractor: 'backend-deterministic',
      },
      client: {},
      operation: {},
      warnings: [],
    };
    for (const mapping of active) setCanonicalValue(row, mapping.field, sourceRow[mapping.columnIndex]);
    if (row.client.rfc || row.client.nombre) {
      if (!row.client.telefono) row.warnings.push('row:telefono_missing');
      if (!row.client.email) row.warnings.push('row:email_missing');
    }
    if (Object.keys(row.client).length > 0 || Object.keys(row.operation).length > 0) rows.push(row);
  }
  return rows;
}

function createRegionBundle(sheet: WorkbookSheetSample, region: DetectedRegion): RegionBundle {
  const columns = profileColumns(sheet.rows, region);
  const mappings = scoreMappings(columns);
  const mappedCandidates = mappings.filter(mapping => mapping.field !== 'ignore' && mapping.confidence >= 0.42);
  const averageMappingConfidence = mappedCandidates.length > 0
    ? mappedCandidates.reduce((sum, mapping) => sum + mapping.confidence, 0) / mappedCandidates.length
    : 0;
  const assumptionCount = mappings.reduce((sum, mapping) => (
    sum + (mapping.assumptions?.length || 0) + (mapping.confidence < 0.65 ? 1 : 0)
  ), 0);
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

// ── Main entry ───────────────────────────────────────────────

export function analyzeSmartImportSamples(input: SmartImportAnalyzeInput): SmartImportAnalyzeResult {
  const regionBundles = input.sheets.flatMap(sheet =>
    detectTableRegions(sheet.sheetId, sheet.rows).map(region => createRegionBundle(sheet, region))
  );

  if (regionBundles.length === 0) {
    // Fallback: use old method
    const firstSheet = input.sheets[0];
    const region: DetectedRegion = {
      regionId: `${firstSheet.sheetId}!R1C1:R${firstSheet.rows.length}C${(firstSheet.rows[0] || []).length}`,
      sheetId: firstSheet.sheetId,
      startRow: 0, endRow: firstSheet.rows.length - 1, startColumn: 0,
      endColumn: Math.max(0, (firstSheet.rows[0] || []).length - 1),
      dataStartRow: 1, headerRows: [0],
      headerLabels: (firstSheet.rows[0] || []).map(c => stringifyCell(c)),
      confidence: 0.35, reasonCodes: ['region:fallback_no_header_detected'],
    };
    return buildResult(firstSheet, region, input);
  }

  const initialBundle = [...regionBundles]
    .sort((a, b) => b.region.confidence - a.region.confidence || a.region.startRow - b.region.startRow)[0];
  const rankedBundles = [...regionBundles].sort((a, b) => b.confidence - a.confidence || b.summary.mappedFieldCount - a.summary.mappedFieldCount);
  const challengeResult = runChallenge(
    initialBundle.summary,
    rankedBundles.filter(bundle => bundle.region.regionId !== initialBundle.region.regionId).map(bundle => bundle.summary),
    initialBundle.mappings,
  );

  const selected = challengeResult.status === 'changed'
    ? rankedBundles.find(r => r.region.regionId === challengeResult.selectedRegionId) || initialBundle
    : initialBundle;

  const previewCanonicalRows = buildCanonicalRows(selected.sheet, selected.region, selected.mappings, input.source);
  const warnings = [...challengeResult.warnings];
  if (previewCanonicalRows.length === 0) warnings.push('analysis:no_canonical_rows');

  return {
    analysisId: `sia_${crypto.randomUUID()}`,
    source: input.source,
    selectedSheet: { sheetId: selected.sheet.sheetId, name: selected.sheet.name },
    selectedRegion: selected.region,
    detectedRegions: rankedBundles.map(r => r.region),
    providerUsed: 'deterministic',
    providersAttempted: ['deterministic'],
    challengeResult,
    confidence: selected.confidence,
    mappings: selected.mappings,
    warnings,
    previewCanonicalRows,
    legacyRows: adaptCanonicalRowsToImportRows(previewCanonicalRows),
  };
}

function buildResult(sheet: WorkbookSheetSample, region: DetectedRegion, input: SmartImportAnalyzeInput): SmartImportAnalyzeResult {
  const columns = profileColumns(sheet.rows, region);
  const mappings = scoreMappings(columns);
  const previewCanonicalRows = buildCanonicalRows(sheet, region, mappings, input.source);
  return {
    analysisId: `sia_${crypto.randomUUID()}`,
    source: input.source,
    selectedSheet: { sheetId: sheet.sheetId, name: sheet.name },
    selectedRegion: region,
    detectedRegions: [region],
    providerUsed: 'deterministic',
    providersAttempted: ['deterministic'],
    challengeResult: { status: 'confirmed', initialRegionId: region.regionId, selectedRegionId: region.regionId, confidenceDelta: 0, findings: ['challenge:initial_region_confirmed'], warnings: [] },
    confidence: region.confidence,
    mappings,
    warnings: previewCanonicalRows.length === 0 ? ['analysis:no_canonical_rows'] : [],
    previewCanonicalRows,
    legacyRows: adaptCanonicalRowsToImportRows(previewCanonicalRows),
  };
}
