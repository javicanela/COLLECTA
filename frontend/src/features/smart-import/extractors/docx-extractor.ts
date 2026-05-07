import type { ParsedCell, ParsedDocument, ParsedTable } from '../domain/parsed-document';
import type { DocumentExtractor, ExtractorContext } from './types';

const DOCX_EXTRACTOR = 'docx-extractor';
const CANCELLED_ERROR = 'Smart Import extraction cancelled';
const DOCX_PARSE_ERROR = 'Smart Import DOCX parse failed: invalid or unsupported .docx file';

type MammothMessage = {
  type?: string;
  message?: string;
};

type MammothResult = {
  value: string;
  messages?: MammothMessage[];
};

type MammothAdapter = {
  convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<MammothResult>;
  extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<MammothResult>;
};

type LoadMammoth = () => Promise<MammothAdapter>;

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error(CANCELLED_ERROR);
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (_, decimal: string, hex: string, named: string) => {
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return namedEntities[named.toLowerCase()] ?? `&${named};`;
  });
}

function textFromHtml(value: string): string {
  return normalizeWhitespace(decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ')));
}

function toParsedCell(value: string, rowIndex: number, columnIndex: number, fileName: string, tableNumber: number): ParsedCell {
  return {
    value,
    rawValue: value,
    rowIndex,
    columnIndex,
    confidence: 0.9,
    source: {
      fileName,
      sheetName: `table-${tableNumber}`,
      extractor: DOCX_EXTRACTOR,
    },
  };
}

function toParsedTable(rows: string[][], fileName: string, tableNumber: number): ParsedTable {
  return {
    id: `docx-table-${tableNumber}`,
    label: `Table ${tableNumber}`,
    confidence: 0.9,
    source: {
      fileName,
      sheetName: `table-${tableNumber}`,
      extractor: DOCX_EXTRACTOR,
    },
    rows: rows.map((row, rowIndex) => (
      row.map((cell, columnIndex) => toParsedCell(cell, rowIndex, columnIndex, fileName, tableNumber))
    )),
  };
}

function parseTablesWithDom(html: string, fileName: string): ParsedTable[] | undefined {
  if (typeof DOMParser === 'undefined') {
    return undefined;
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(parsed.querySelectorAll('table'))
    .map((table, index) => {
      const rows = Array.from(table.querySelectorAll('tr'))
        .map((row) => Array.from(row.querySelectorAll('th,td')).map((cell) => normalizeWhitespace(cell.textContent ?? '')))
        .filter((row) => row.length > 0);

      return rows.length > 0 ? toParsedTable(rows, fileName, index + 1) : undefined;
    })
    .filter((table): table is ParsedTable => table !== undefined);
}

function parseTablesWithRegex(html: string, fileName: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const tableMatches = html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi);

  for (const tableMatch of tableMatches) {
    const tableHtml = tableMatch[1] ?? '';
    const rows: string[][] = [];
    const rowMatches = tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);

    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1] ?? '';
      const cells = Array.from(rowHtml.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi))
        .map((cellMatch) => textFromHtml(cellMatch[1] ?? ''));

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      tables.push(toParsedTable(rows, fileName, tables.length + 1));
    }
  }

  return tables;
}

export function parseDocxHtmlTables(html: string, fileName: string): ParsedTable[] {
  return parseTablesWithDom(html, fileName) ?? parseTablesWithRegex(html, fileName);
}

function mammothMessagesToWarnings(messages: MammothMessage[] = []): string[] {
  return messages
    .map((message) => {
      const text = message.message?.trim();
      return text ? `${message.type ?? 'message'}: ${text}` : undefined;
    })
    .filter((warning): warning is string => warning !== undefined);
}

async function loadMammoth(): Promise<MammothAdapter> {
  const mammothModule = await import('mammoth') as unknown as MammothAdapter & { default?: MammothAdapter };
  return mammothModule.default ?? mammothModule;
}

export async function extractDocxDocument(
  file: File,
  context: ExtractorContext = {},
  loadAdapter: LoadMammoth = loadMammoth,
): Promise<ParsedDocument> {
  const startedAt = performance.now();
  const documentId = crypto.randomUUID();

  try {
    assertNotAborted(context.signal);
    const arrayBuffer = await file.arrayBuffer();
    assertNotAborted(context.signal);
    const mammoth = await loadAdapter();
    assertNotAborted(context.signal);
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    assertNotAborted(context.signal);
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
    const text = normalizeWhitespace(rawTextResult.value);

    return {
      id: documentId,
      fileName: file.name,
      kind: 'docx',
      mimeType: file.type,
      sizeBytes: file.size,
      tables: parseDocxHtmlTables(htmlResult.value, file.name),
      textBlocks: text ? [
        {
          id: 'docx-text-1',
          text,
          confidence: 0.9,
          source: {
            fileName: file.name,
            extractor: DOCX_EXTRACTOR,
          },
        },
      ] : [],
      warnings: [
        ...mammothMessagesToWarnings(htmlResult.messages),
        ...mammothMessagesToWarnings(rawTextResult.messages),
      ],
      metrics: {
        parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  } catch (error) {
    if (context.signal?.aborted || error instanceof Error && error.message === CANCELLED_ERROR) {
      throw new Error(CANCELLED_ERROR);
    }

    throw new Error(DOCX_PARSE_ERROR);
  }
}

export const docxExtractor: DocumentExtractor = {
  kind: 'docx',
  canHandle: (file) => {
    const lowerName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    return lowerName.endsWith('.docx') || mimeType.includes('wordprocessingml.document');
  },
  extract: extractDocxDocument,
};
