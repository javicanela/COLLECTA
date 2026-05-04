import { detectBoolean, detectDateLike, detectEmail, detectMoney, detectPhone, detectRfc, detectSatTerm } from './regex-detectors';
import { normalizeHeaderKey, normalizeText, stringifyCell, tokenizeHeader } from './normalize';
import type { CanonicalField, ColumnProfile, DetectedRegion, DetectorProfile, MappingAlternative, MappingCandidate, SmartImportCell } from './types';

interface AliasConfig {
  reasonKey: string;
  aliases: string[];
  valueReason?: 'rfc' | 'email' | 'phone' | 'money' | 'date' | 'sat' | 'boolean' | 'longText';
}

const FIELD_ALIASES: Record<CanonicalField, AliasConfig> = {
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
  ignore: { reasonKey: 'ignore', aliases: ['id', 'indice', 'fila', 'consecutivo', 'unnamed', 'sinNombre'] },
};

function makeDetectorProfile(matches: string[], total: number): DetectorProfile {
  return {
    matches: matches.length,
    ratio: total > 0 ? matches.length / total : 0,
    examples: matches.slice(0, 3),
  };
}

function nonEmptyValues(values: SmartImportCell[]): SmartImportCell[] {
  return values.filter((value) => stringifyCell(value).trim() !== '');
}

function scoreHeader(field: CanonicalField, normalizedHeader: string): { score: number; reasonCodes: string[] } {
  const config = FIELD_ALIASES[field];
  if (!config) return { score: 0, reasonCodes: [] };

  for (const alias of config.aliases) {
    const aliasKey = normalizeHeaderKey(alias);
    if (normalizedHeader === aliasKey) {
      return { score: 0.58, reasonCodes: [`header:alias:${config.reasonKey}`] };
    }
  }

  for (const alias of config.aliases) {
    const aliasKey = normalizeHeaderKey(alias);
    if (normalizedHeader.includes(aliasKey) || aliasKey.includes(normalizedHeader)) {
      return { score: 0.42, reasonCodes: [`header:alias:${config.reasonKey}`] };
    }
  }

  return { score: 0, reasonCodes: [] };
}

function detectorScore(profile: ColumnProfile, field: CanonicalField): { score: number; reasonCodes: string[] } {
  const config = FIELD_ALIASES[field];
  if (!config?.valueReason) return { score: 0, reasonCodes: [] };

  const detector = profile.detectors[config.valueReason];
  if (!detector || detector.ratio < 0.34) return { score: 0, reasonCodes: [] };

  const scoreByReason = {
    rfc: 0.42,
    email: 0.4,
    phone: 0.36,
    money: 0.38,
    date: 0.34,
    sat: 0.3,
    boolean: 0.28,
    longText: 0.28,
  };

  return {
    score: scoreByReason[config.valueReason] * detector.ratio,
    reasonCodes: [`values:${config.valueReason === 'longText' ? 'long_text' : config.valueReason}`],
  };
}

function buildCandidateScores(profile: ColumnProfile): MappingCandidate[] {
  const candidates: MappingCandidate[] = [];

  for (const field of Object.keys(FIELD_ALIASES) as CanonicalField[]) {
    const header = scoreHeader(field, profile.normalizedHeader);
    const value = detectorScore(profile, field);
    const assumptions: string[] = [];
    const reasonCodes = [...header.reasonCodes, ...value.reasonCodes];
    let confidence = header.score + value.score;

    if (field === 'operation.tipo' && profile.detectors.longText.ratio >= 0.5) {
      confidence -= 0.08;
      reasonCodes.push('values:long_text');
      assumptions.push('Long descriptions may not be operation type values');
    }

    if (field === 'operation.descripcion' && profile.detectors.longText.ratio >= 0.5) {
      confidence += 0.12;
    }

    if (field === 'client.nombre' && profile.detectors.longText.ratio >= 0.5 && profile.detectors.rfc.ratio === 0) {
      confidence += 0.08;
      reasonCodes.push('values:name_like_text');
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

export function profileColumns(rows: SmartImportCell[][], region: DetectedRegion): ColumnProfile[] {
  const dataRows = rows.slice(region.dataStartRow, region.endRow + 1);

  return region.headerLabels.map((sourceHeader, offset) => {
    const columnIndex = region.startColumn + offset;
    const sampleValues = dataRows.map((row) => row[columnIndex]);
    const filledValues = nonEmptyValues(sampleValues);
    const total = filledValues.length;

    const rfcMatches: string[] = [];
    const emailMatches: string[] = [];
    const phoneMatches: string[] = [];
    const moneyMatches: string[] = [];
    const dateMatches: string[] = [];
    const satMatches: string[] = [];
    const booleanMatches: string[] = [];
    const longTextMatches: string[] = [];

    for (const value of filledValues) {
      const display = stringifyCell(value);
      if (detectRfc(value).matched) rfcMatches.push(display);
      if (detectEmail(value).matched) emailMatches.push(display);
      if (detectPhone(value).matched) phoneMatches.push(display);
      if (detectMoney(value).matched) moneyMatches.push(display);
      if (detectDateLike(value).matched) dateMatches.push(display);
      if (detectSatTerm(value).matched) satMatches.push(display);
      if (detectBoolean(value).matched) booleanMatches.push(display);
      if (normalizeText(value).length >= 16 && !detectEmail(value).matched) longTextMatches.push(display);
    }

    const profile: ColumnProfile = {
      columnIndex,
      sourceHeader,
      normalizedHeader: normalizeHeaderKey(sourceHeader),
      tokens: tokenizeHeader(sourceHeader),
      sampleValues,
      nonEmptyCount: total,
      totalCount: sampleValues.length,
      detectors: {
        rfc: makeDetectorProfile(rfcMatches, total),
        email: makeDetectorProfile(emailMatches, total),
        phone: makeDetectorProfile(phoneMatches, total),
        money: makeDetectorProfile(moneyMatches, total),
        date: makeDetectorProfile(dateMatches, total),
        sat: makeDetectorProfile(satMatches, total),
        boolean: makeDetectorProfile(booleanMatches, total),
        longText: makeDetectorProfile(longTextMatches, total),
      },
      reasonCodes: [],
    };

    profile.reasonCodes = Object.entries(profile.detectors)
      .filter(([, detector]) => detector.matches > 0)
      .map(([key]) => `values:${key === 'longText' ? 'long_text' : key}`);

    return profile;
  });
}

export function scoreMappings(profiles: ColumnProfile[]): MappingCandidate[] {
  return profiles
    .map((profile) => {
      const scored = buildCandidateScores(profile);
      const [best, ...alternatives] = scored;
      if (!best) {
        return {
          columnIndex: profile.columnIndex,
          sourceHeader: profile.sourceHeader,
          field: 'ignore' as const,
          confidence: 0.35,
          reasonCodes: ['mapping:no_signal'],
          assumptions: ['No reliable canonical field detected'],
          alternatives: [],
        };
      }

      const mappedAlternatives: MappingAlternative[] = alternatives.slice(0, 3).map((alternative) => ({
        field: alternative.field,
        confidence: alternative.confidence,
        reasonCodes: alternative.reasonCodes,
      }));

      return { ...best, alternatives: mappedAlternatives };
    })
    .filter((candidate) => candidate.field !== 'ignore' || candidate.confidence >= 0.35);
}
