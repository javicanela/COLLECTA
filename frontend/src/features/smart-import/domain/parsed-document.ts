export const SOURCE_FILE_KINDS = [
  'csv',
  'xlsx',
  'xls',
  'pdf_text',
  'pdf_ocr',
  'docx',
  'image_ocr',
  'json',
  'xml',
  'unknown',
] as const;

export type SourceFileKind = (typeof SOURCE_FILE_KINDS)[number];

export type ParsedCell = {
  value: string;
  rawValue?: unknown;
  rowIndex: number;
  columnIndex: number;
  confidence: number;
  source: {
    fileName: string;
    sheetName?: string;
    pageNumber?: number;
    regionId?: string;
    extractor: string;
  };
};

export type ParsedTable = {
  id: string;
  label?: string;
  rows: ParsedCell[][];
  confidence: number;
  source: ParsedCell['source'];
};

export type ParsedTextBlock = {
  id: string;
  text: string;
  confidence: number;
  source: ParsedCell['source'];
};

export type ParsedDocument = {
  id: string;
  fileName: string;
  kind: SourceFileKind;
  mimeType?: string;
  sizeBytes: number;
  tables: ParsedTable[];
  textBlocks: ParsedTextBlock[];
  warnings: string[];
  metrics: {
    parseMs: number;
    pages?: number;
    sheets?: number;
    ocrMs?: number;
  };
};
