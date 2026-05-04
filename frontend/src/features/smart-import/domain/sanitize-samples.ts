import { detectDateLike, detectEmail, detectMoney, detectPhone, detectRfc } from './regex-detectors';
import { stringifyCell } from './normalize';
import type { SmartImportCell, SmartImportSource, WorkbookSheetSummary } from './types';

interface SanitizeInput {
  source: SmartImportSource;
  sheets: WorkbookSheetSummary[];
}

interface SanitizeOptions {
  maxRowsPerSheet?: number;
  maxColumnsPerSheet?: number;
}

function redactRfc(value: string): string {
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

function redactEmail(value: string): string {
  const [localPart, domain] = value.split('@');
  return `${localPart.slice(0, 1)}***@${domain}`;
}

function redactPhone(value: string): string {
  return `******${value.slice(-4)}`;
}

function sanitizeCell(value: SmartImportCell): SmartImportCell {
  const raw = stringifyCell(value).trim();
  if (!raw) return value ?? '';

  const rfc = detectRfc(raw);
  if (rfc.matched) return redactRfc(rfc.normalized);

  const email = detectEmail(raw);
  if (email.matched) return redactEmail(email.normalized);

  const phone = detectPhone(raw);
  if (phone.matched) return redactPhone(phone.normalized);

  if (detectMoney(raw).matched || detectDateLike(raw).matched) return value;

  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (raw.length > 7 && /[a-zA-Z]/.test(raw)) return `TEXT_${raw.length}`;
  return value;
}

export function sanitizeSmartImportSamples(input: SanitizeInput, options: SanitizeOptions = {}): SanitizeInput {
  const maxRowsPerSheet = options.maxRowsPerSheet ?? 25;
  const maxColumnsPerSheet = options.maxColumnsPerSheet ?? 30;

  return {
    source: input.source,
    sheets: input.sheets.map((sheet) => ({
      ...sheet,
      rows: sheet.rows
        .slice(0, maxRowsPerSheet)
        .map((row, rowIndex) => row.slice(0, maxColumnsPerSheet).map((cell) => (
          rowIndex === 0 ? cell : sanitizeCell(cell)
        ))),
    })),
  };
}
