import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AlertCircle, FileSpreadsheet, RefreshCcw, UploadCloud } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { parsedDocumentToWorkbookSheets } from '../domain/parsed-document-to-workbook';
import { runSmartImportEscalation } from '../domain/provider-registry';
import { buildCanonicalRows } from '../domain/super-identifier';
import type { SourceFileKind } from '../domain/parsed-document';
import type { CanonicalField, MappingCandidate, SmartImportAnalysis, SmartImportSource, WorkbookSheetSummary } from '../domain/types';
import { extractDocument } from '../extractors/extract-document';
import { ImportSummary } from './ImportSummary';
import { MappingReviewTable } from './MappingReviewTable';
import { PreviewGrid } from './PreviewGrid';
import { SheetSelector } from './SheetSelector';

type ImportStatus = 'idle' | 'reading' | 'extracting_text' | 'ocr_running' | 'analyzing' | 'ready_for_review' | 'error' | 'cancelled';

const STATUS_LABELS: Record<ImportStatus, string> = {
  idle: 'Arrastra CSV, Excel, PDF, DOCX, JSON, XML o imagen',
  reading: 'Leyendo archivo...',
  extracting_text: 'Extrayendo contenido...',
  ocr_running: 'Ejecutando OCR local...',
  analyzing: 'Analizando datos...',
  ready_for_review: 'Listo para revisar',
  error: 'No se pudo analizar',
  cancelled: 'Analisis cancelado',
};

function correctionsFromMappings(mappings: MappingCandidate[]): Record<number, CanonicalField | ''> {
  return Object.fromEntries(mappings.map((mapping) => [mapping.columnIndex, mapping.field])) as Record<number, CanonicalField | ''>;
}

export function ImportWizard() {
  const [source, setSource] = useState<SmartImportSource | null>(null);
  const [sheets, setSheets] = useState<WorkbookSheetSummary[]>([]);
  const [analysis, setAnalysis] = useState<SmartImportAnalysis | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [corrections, setCorrections] = useState<Record<number, CanonicalField | ''>>({});
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [documentWarnings, setDocumentWarnings] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const runAnalysis = useCallback(async (
    nextSource: SmartImportSource,
    nextSheets: WorkbookSheetSummary[],
    preferredSheetId?: string,
    preferredRegionId?: string,
  ) => {
    const nextAnalysis = await runSmartImportEscalation({
      source: nextSource,
      sheets: nextSheets,
      preferredSheetId,
      preferredRegionId,
    });
    setAnalysis(nextAnalysis);
    setSelectedSheetId(nextAnalysis.selectedSheet.sheetId);
    setSelectedRegionId(nextAnalysis.selectedRegion.regionId);
    setCorrections(correctionsFromMappings(nextAnalysis.mappings));
    setStatus('ready_for_review');
  }, []);

  const processFile = useCallback(async (file: File) => {
    const controller = new AbortController();
    setAbortController(controller);
    setStatus(file.type.startsWith('image/') ? 'ocr_running' : 'reading');
    setError(null);
    setDocumentWarnings([]);

    try {
      setStatus(file.type.startsWith('image/') ? 'ocr_running' : 'extracting_text');
      const parsedDocument = await extractDocument(file, {
        enableOcr: true,
        signal: controller.signal,
      });
      const nextSheets = parsedDocumentToWorkbookSheets(parsedDocument);

      if (nextSheets.length === 0) {
        throw new Error('No se detectaron tablas o texto contable suficiente para previsualizar.');
      }

      const nextSource: SmartImportSource = {
        sourceId: parsedDocument.id,
        fileName: parsedDocument.fileName,
        fileType: parsedDocument.kind as SourceFileKind,
        mimeType: parsedDocument.mimeType,
        sizeBytes: parsedDocument.sizeBytes,
      };
      setStatus('analyzing');
      setSource(nextSource);
      setSheets(nextSheets);
      setDocumentWarnings(parsedDocument.warnings);
      await runAnalysis(nextSource, nextSheets);
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus('cancelled');
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo analizar el archivo.');
      setStatus('error');
    } finally {
      setAbortController(null);
    }
  }, [runAnalysis]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const [selectedFile] = acceptedFiles;
    if (selectedFile) void processFile(selectedFile);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv', '.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    multiple: false,
  });

  const effectiveMappings = useMemo(() => {
    if (!analysis) return [];
    return analysis.mappings.map((mapping) => ({
      ...mapping,
      field: (corrections[mapping.columnIndex] === '' ? 'ignore' : corrections[mapping.columnIndex] ?? mapping.field) as CanonicalField,
    }));
  }, [analysis, corrections]);

  const previewRows = useMemo(() => {
    if (!analysis) return [];
    return buildCanonicalRows(analysis.selectedSheet, analysis.selectedRegion, effectiveMappings);
  }, [analysis, effectiveMappings]);

  const lowConfidenceCount = useMemo(() => (
    effectiveMappings.filter((mapping) => mapping.field !== 'ignore' && mapping.confidence < 0.65).length
  ), [effectiveMappings]);

  const handleSelectSheet = useCallback((sheetId: string) => {
    if (!source) return;
    setStatus('analyzing');
    void runAnalysis(source, sheets, sheetId);
  }, [runAnalysis, sheets, source]);

  const handleSelectRegion = useCallback((regionId: string) => {
    if (!source) return;
    setStatus('analyzing');
    void runAnalysis(source, sheets, selectedSheetId, regionId);
  }, [runAnalysis, selectedSheetId, sheets, source]);

  const handleMappingChange = useCallback((columnIndex: number, field: CanonicalField | '') => {
    setCorrections((current) => ({ ...current, [columnIndex]: field }));
  }, []);

  const reset = useCallback(() => {
    setSource(null);
    setSheets([]);
    setAnalysis(null);
    setSelectedSheetId('');
    setSelectedRegionId('');
    setCorrections({});
    setStatus('idle');
    setError(null);
    setDocumentWarnings([]);
    abortController?.abort();
    setAbortController(null);
  }, [abortController]);

  const cancelExtraction = useCallback(() => {
    abortController?.abort();
    setStatus('cancelled');
    setAbortController(null);
  }, [abortController]);

  return (
    <Card variant="solid" padding="normal" className="overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Smart Import</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>Preview local editable. Sin commit automatico.</p>
        </div>
        {abortController && (
          <button type="button" onClick={cancelExtraction} className="btn btn-ghost btn-sm self-start md:self-auto">
            Cancelar
          </button>
        )}
        {analysis && (
          <button type="button" onClick={reset} className="btn btn-ghost btn-sm self-start md:self-auto">
            <RefreshCcw size={14} />
            Reiniciar
          </button>
        )}
      </div>

      {!analysis && (
        <div
          {...getRootProps()}
          className="rounded-xl p-8 text-center transition-all cursor-pointer"
          style={{
            border: `2px dashed ${isDragActive ? 'var(--brand-primary)' : 'var(--c-border)'}`,
            background: isDragActive ? 'var(--brand-primary-dim)' : 'var(--c-surface-raised)',
          }}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-primary-dim)' }}>
              {status === 'reading' || status === 'extracting_text' || status === 'ocr_running' || status === 'analyzing'
                ? <FileSpreadsheet className="animate-pulse" size={24} style={{ color: 'var(--brand-primary)' }} />
                : <UploadCloud size={24} style={{ color: 'var(--brand-primary)' }} />}
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--c-text)' }}>
                {STATUS_LABELS[status]}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>El analisis ocurre en el navegador. OCR no envia datos a cloud.</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border px-4 py-3 flex items-center gap-2 text-sm" style={{ borderColor: 'rgba(239,63,63,0.24)', color: 'var(--brand-danger)', background: 'rgba(239,63,63,0.08)' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-5">
          <SheetSelector
            sheets={sheets}
            regions={analysis.detectedRegions}
            selectedSheetId={selectedSheetId}
            selectedRegionId={selectedRegionId}
            onSelectSheet={handleSelectSheet}
            onSelectRegion={handleSelectRegion}
          />

          <ImportSummary analysis={{ ...analysis, canonicalRows: previewRows }} lowConfidenceCount={lowConfidenceCount} />

          {documentWarnings.length > 0 && (
            <div className="rounded-lg border px-4 py-3 flex items-center gap-2 text-sm" style={{ borderColor: 'rgba(245,158,11,0.28)', color: 'var(--brand-warn)', background: 'rgba(245,158,11,0.08)' }}>
              <AlertCircle size={16} />
              {documentWarnings.join(', ')}
            </div>
          )}

          {analysis.challengeResult.warnings.length > 0 && (
            <div className="rounded-lg border px-4 py-3 flex items-center gap-2 text-sm" style={{ borderColor: 'rgba(245,158,11,0.28)', color: 'var(--brand-warn)', background: 'rgba(245,158,11,0.08)' }}>
              <AlertCircle size={16} />
              {analysis.challengeResult.warnings.join(', ')}
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--c-text)' }}>Mapeo editable</h3>
            <MappingReviewTable mappings={analysis.mappings} corrections={corrections} onChange={handleMappingChange} />
          </div>

          <div>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--c-text)' }}>Preview canonico</h3>
            <PreviewGrid rows={previewRows} />
          </div>
        </div>
      )}
    </Card>
  );
}
