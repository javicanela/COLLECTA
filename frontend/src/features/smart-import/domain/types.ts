export type SmartImportCell = string | number | boolean | Date | null | undefined;

export type SmartImportFileType =
  | 'csv'
  | 'xlsx'
  | 'xls'
  | 'pdf_text'
  | 'pdf_ocr'
  | 'docx'
  | 'image_ocr'
  | 'json'
  | 'xml'
  | 'unknown';

export interface SmartImportSource {
  sourceId: string;
  fileName: string;
  fileType: SmartImportFileType;
  mimeType?: string;
  sizeBytes?: number;
}

export interface WorkbookSheetSummary {
  sheetId: string;
  name: string;
  rows: SmartImportCell[][];
  rowCount?: number;
  columnCount?: number;
  nonEmptyCellCount?: number;
}

export interface HeaderRowCandidate {
  sheetId: string;
  rowIndex: number;
  confidence: number;
  nonEmptyCellCount: number;
  canonicalTermCount: number;
  reasonCodes: string[];
}

export interface DetectedRegion {
  regionId: string;
  sheetId: string;
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
  headerRows: number[];
  dataStartRow: number;
  headerLabels: string[];
  confidence: number;
  reasonCodes: string[];
}

export const CANONICAL_FIELDS = [
  'client.rfc',
  'client.nombre',
  'client.telefono',
  'client.email',
  'client.regimen',
  'client.categoria',
  'client.asesor',
  'operation.tipo',
  'operation.descripcion',
  'operation.monto',
  'operation.fechaVence',
  'operation.fechaPago',
  'operation.estatus',
  'operation.asesor',
  'operation.excluir',
  'operation.archived',
  'ignore',
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export interface DetectorProfile {
  matches: number;
  ratio: number;
  examples: string[];
}

export interface ColumnProfile {
  columnIndex: number;
  sourceHeader: string;
  normalizedHeader: string;
  tokens: string[];
  sampleValues: SmartImportCell[];
  nonEmptyCount: number;
  totalCount: number;
  detectors: {
    rfc: DetectorProfile;
    email: DetectorProfile;
    phone: DetectorProfile;
    money: DetectorProfile;
    date: DetectorProfile;
    sat: DetectorProfile;
    boolean: DetectorProfile;
    longText: DetectorProfile;
  };
  reasonCodes: string[];
}

export interface MappingAlternative {
  field: CanonicalField;
  confidence: number;
  reasonCodes: string[];
}

export interface MappingCandidate {
  columnIndex: number;
  sourceHeader: string;
  field: CanonicalField;
  confidence: number;
  reasonCodes: string[];
  assumptions: string[];
  alternatives: MappingAlternative[];
}

export interface ChallengeRegionSummary {
  regionId: string;
  confidence: number;
  mappedFieldCount: number;
  assumptionCount: number;
  reasonCodes: string[];
}

export interface ChallengeInput {
  initialRegion: ChallengeRegionSummary;
  alternativeRegions: ChallengeRegionSummary[];
  mappings: MappingCandidate[];
}

export interface ChallengeResult {
  status: 'changed' | 'confirmed' | 'downgraded';
  initialRegionId: string;
  selectedRegionId: string;
  confidenceDelta: number;
  findings: string[];
  warnings: string[];
}

export interface CanonicalImportRow {
  rowNumber: number;
  sourceRowIndex: number;
  client: Partial<{
    rfc: string;
    nombre: string;
    telefono: string;
    email: string;
    regimen: string;
    categoria: string;
    asesor: string;
  }>;
  operation: Partial<{
    tipo: string;
    descripcion: string;
    monto: number;
    fechaVence: string;
    fechaPago: string;
    estatus: string;
    asesor: string;
    excluir: boolean;
    archived: boolean;
  }>;
  warnings: string[];
}

export interface SmartImportAnalysis {
  source: SmartImportSource;
  selectedSheet: WorkbookSheetSummary;
  selectedRegion: DetectedRegion;
  detectedRegions: DetectedRegion[];
  columns: ColumnProfile[];
  mappings: MappingCandidate[];
  challengeResult: ChallengeResult;
  canonicalRows: CanonicalImportRow[];
  confidence: number;
  providerUsed: string;
  providersAttempted: string[];
  warnings: string[];
}
