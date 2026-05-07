import type { ParsedCell, ParsedTable } from '../domain/parsed-document';
import { stringifyCell } from '../domain/normalize';
import type { SmartImportCell } from '../domain/types';

export type StructuredRecord = Record<string, unknown>;

type BuildStructuredTableOptions = {
  id: string;
  label: string;
  file: File;
  extractor: string;
  records: StructuredRecord[];
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

export function stringifyStructuredValue(value: unknown): string {
  if (isObjectLike(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return stringifyCell(value as SmartImportCell);
}

function toParsedCell(
  value: unknown,
  rowIndex: number,
  columnIndex: number,
  file: File,
  sheetName: string,
  extractor: string,
): ParsedCell {
  return {
    value: stringifyStructuredValue(value),
    rawValue: value,
    rowIndex,
    columnIndex,
    confidence: 1,
    source: {
      fileName: file.name,
      sheetName,
      extractor,
    },
  };
}

export function isStructuredRecord(value: unknown): value is StructuredRecord {
  return isObjectLike(value);
}

export function flattenStructuredRecord(record: StructuredRecord, prefix = ''): StructuredRecord {
  return Object.entries(record).reduce<StructuredRecord>((flattened, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isStructuredRecord(value)) {
      Object.assign(flattened, flattenStructuredRecord(value, path));
      return flattened;
    }

    flattened[path] = value;
    return flattened;
  }, {});
}

export function buildStructuredTable(options: BuildStructuredTableOptions): ParsedTable {
  const flattenedRows = options.records.map((record) => flattenStructuredRecord(record));
  const columns: string[] = [];

  for (const row of flattenedRows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) {
        columns.push(key);
      }
    }
  }

  const headerRow = columns.map((column, columnIndex) => (
    toParsedCell(column, 0, columnIndex, options.file, options.label, options.extractor)
  ));
  const dataRows = flattenedRows.map((row, rowIndex) => (
    columns.map((column, columnIndex) => (
      toParsedCell(row[column], rowIndex + 1, columnIndex, options.file, options.label, options.extractor)
    ))
  ));

  return {
    id: options.id,
    label: options.label,
    confidence: 1,
    source: {
      fileName: options.file.name,
      sheetName: options.label,
      extractor: options.extractor,
    },
    rows: [headerRow, ...dataRows],
  };
}
