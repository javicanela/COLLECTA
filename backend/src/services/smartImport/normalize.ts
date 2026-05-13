import type { SmartImportCell } from './types';

export function stringifyCell(value: SmartImportCell | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function isBlankCell(value: SmartImportCell | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

export function normalizeText(value: SmartImportCell | undefined): string {
  return stringifyCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\br\s*\.?\s*f\s*\.?\s*c\.?\b/g, 'rfc')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeHeaderKey(value: SmartImportCell | undefined): string {
  return normalizeText(value).replace(/\s+/g, '');
}

export function tokenizeHeader(value: SmartImportCell | undefined): string[] {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}
