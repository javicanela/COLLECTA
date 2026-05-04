import { normalizeText, stringifyCell } from './normalize';
import type { SmartImportCell } from './types';

export type BooleanDetection = { matched: true; value: boolean } | { matched: false };
export type DateDetection = { matched: true; kind: 'excel-serial' | 'date-string'; normalized: string } | { matched: false };
export type EmailDetection = { matched: true; normalized: string } | { matched: false };
export type MoneyDetection = { matched: true; value: number } | { matched: false };
export type PhoneDetection = { matched: true; normalized: string } | { matched: false };
export type RfcDetection = { matched: true; normalized: string } | { matched: false };
export type SatDetection = { matched: true; reason: 'sat:regimen' | 'sat:cfdi' } | { matched: false };

const RFC_REGEX = /^[A-Z\u00d1&]{3,4}\d{6}[A-Z0-9]{2,3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGIMEN_CODES = new Set(['601', '603', '605', '606', '607', '608', '610', '611', '612', '614', '616', '620', '621', '622', '623', '624', '625', '626']);
const MONTHS = new Set([
  'ene', 'enero', 'jan', 'january',
  'feb', 'febrero',
  'mar', 'marzo', 'march',
  'abr', 'abril', 'apr', 'april',
  'may', 'mayo',
  'jun', 'junio', 'june',
  'jul', 'julio', 'july',
  'ago', 'agosto', 'aug', 'august',
  'sep', 'sept', 'septiembre',
  'oct', 'octubre',
  'nov', 'noviembre',
  'dic', 'diciembre', 'dec', 'december',
]);

export function detectRfc(value: SmartImportCell): RfcDetection {
  const normalized = stringifyCell(value).trim().toUpperCase().replace(/[\s.\-_/]/g, '');
  if (RFC_REGEX.test(normalized)) return { matched: true, normalized };
  return { matched: false };
}

export function detectEmail(value: SmartImportCell): EmailDetection {
  const normalized = stringifyCell(value).trim().toLowerCase();
  if (EMAIL_REGEX.test(normalized)) return { matched: true, normalized };
  return { matched: false };
}

export function detectPhone(value: SmartImportCell): PhoneDetection {
  const digits = stringifyCell(value).replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits.slice(-10);
  if (normalized.length === 10 && !/^(\d)\1{9}$/.test(normalized)) {
    return { matched: true, normalized };
  }
  return { matched: false };
}

export function detectMoney(value: SmartImportCell): MoneyDetection {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 ? { matched: true, value } : { matched: false };
  }

  const raw = stringifyCell(value).trim();
  if (!raw) return { matched: false };

  const withoutCurrency = raw.replace(/\b(mxn|usd|m\.n\.)\b/gi, '').trim();
  if (/[a-z]/i.test(withoutCurrency)) return { matched: false };

  const normalized = withoutCurrency
    .replace(/[,$\s]/g, '')
    .replace(/^\((.*)\)$/, '-$1');

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return { matched: false };

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { matched: false };
  return { matched: true, value: parsed };
}

export function detectDateLike(value: SmartImportCell): DateDetection {
  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 80000) {
    return { matched: true, kind: 'excel-serial', normalized: String(value) };
  }

  const raw = stringifyCell(value).trim();
  if (!raw) return { matched: false };

  const normalized = normalizeText(raw);
  if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(raw)) {
    return { matched: true, kind: 'date-string', normalized: raw };
  }
  if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(raw)) {
    return { matched: true, kind: 'date-string', normalized: raw };
  }

  const tokens = normalized.split(' ');
  if (tokens.length === 3 && /^\d{1,2}$/.test(tokens[0]) && MONTHS.has(tokens[1]) && /^\d{2,4}$/.test(tokens[2])) {
    return { matched: true, kind: 'date-string', normalized: raw };
  }

  return { matched: false };
}

export function detectSatTerm(value: SmartImportCell): SatDetection {
  const normalized = normalizeText(value);
  if (!normalized) return { matched: false };

  if (normalized.includes('cfdi') || normalized.includes('usocfdi') || normalized.includes('uso cfdi')) {
    return { matched: true, reason: 'sat:cfdi' };
  }

  const tokens = normalized.split(' ');
  if (normalized.includes('regimen') || normalized.includes('resico') || tokens.some((token) => REGIMEN_CODES.has(token))) {
    return { matched: true, reason: 'sat:regimen' };
  }

  return { matched: false };
}

export function detectBoolean(value: SmartImportCell): BooleanDetection {
  if (typeof value === 'boolean') return { matched: true, value };
  const normalized = normalizeText(value);
  if (['si', 's', 'true', '1', 'yes', 'y'].includes(normalized)) return { matched: true, value: true };
  if (['no', 'n', 'false', '0'].includes(normalized)) return { matched: true, value: false };
  return { matched: false };
}
