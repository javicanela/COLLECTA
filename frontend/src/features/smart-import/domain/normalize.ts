import type { SmartImportCell } from './types';

export function stringifyCell(value: SmartImportCell): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(value: SmartImportCell): string {
  return stripDiacritics(stringifyCell(value))
    .toLowerCase()
    .replace(/\br\s*\.?\s*f\s*\.?\s*c\.?\b/g, 'rfc')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeHeaderKey(value: SmartImportCell): string {
  return normalizeText(value).replace(/\s+/g, '');
}

export function tokenizeHeader(value: SmartImportCell): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

export function isBlankCell(value: SmartImportCell): boolean {
  return stringifyCell(value).trim() === '';
}

export function trimDisplayValue(value: SmartImportCell): string {
  return stringifyCell(value).trim().replace(/\s+/g, ' ');
}
