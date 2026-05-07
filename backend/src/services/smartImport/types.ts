export type SmartImportCell = string | number | boolean | null;
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

export interface WorkbookSheetSample {
  sheetId: string;
  name: string;
  rows: SmartImportCell[][];
}

export type CanonicalField =
  | 'client.rfc'
  | 'client.nombre'
  | 'client.telefono'
  | 'client.email'
  | 'client.regimen'
  | 'client.categoria'
  | 'client.asesor'
  | 'operation.tipo'
  | 'operation.descripcion'
  | 'operation.monto'
  | 'operation.fechaVence'
  | 'operation.fechaPago'
  | 'operation.estatus'
  | 'operation.asesor'
  | 'operation.excluir'
  | 'operation.archived'
  | 'ignore';

export interface MappingCandidate {
  columnIndex: number;
  sourceHeader: string;
  field: CanonicalField;
  confidence: number;
  reasonCodes: string[];
}

export interface DetectedRegion {
  regionId: string;
  sheetId: string;
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
  dataStartRow: number;
  headerLabels: string[];
  confidence: number;
  reasonCodes: string[];
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
  source?: {
    fileName: string;
    sheetName?: string;
    pageNumber?: number;
    regionId?: string;
    extractor: string;
  };
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

export interface SmartImportAnalyzeInput {
  source: SmartImportSource;
  sheets: WorkbookSheetSample[];
}

export interface SmartImportAnalyzeResult {
  analysisId: string;
  source: SmartImportSource;
  selectedSheet: Pick<WorkbookSheetSample, 'sheetId' | 'name'>;
  selectedRegion: DetectedRegion;
  detectedRegions: DetectedRegion[];
  providerUsed: 'deterministic';
  providersAttempted: string[];
  challengeResult: ChallengeResult;
  confidence: number;
  mappings: MappingCandidate[];
  warnings: string[];
  previewCanonicalRows: CanonicalImportRow[];
  legacyRows: import('../importService').ImportRow[];
}

export interface SmartImportCommitInput {
  confirmedRows: CanonicalImportRow[];
}
