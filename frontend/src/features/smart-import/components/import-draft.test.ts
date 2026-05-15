import { describe, expect, it } from 'vitest';
import { loadImportDraft, saveImportDraft } from './import-draft';
import type { SmartImportAnalysis, SmartImportSource, WorkbookSheetSummary } from '../domain/types';

const source: SmartImportSource = {
  sourceId: 'src-1',
  fileName: 'clientes.csv',
  fileType: 'csv',
  mimeType: 'text/csv',
  sizeBytes: 128,
};

const sheets: WorkbookSheetSummary[] = [
  {
    sheetId: 'sheet-1',
    name: 'Clientes',
    rows: [['RFC', 'Nombre'], ['ABC010101AAA', 'Cliente Uno']],
  },
];

const analysis: SmartImportAnalysis = {
  source,
  selectedSheet: sheets[0],
  selectedRegion: {
    regionId: 'region-1',
    sheetId: 'sheet-1',
    startRow: 0,
    endRow: 1,
    startColumn: 0,
    endColumn: 1,
    headerRows: [0],
    dataStartRow: 1,
    headerLabels: ['RFC', 'Nombre'],
    confidence: 0.9,
    reasonCodes: [],
  },
  detectedRegions: [],
  columns: [],
  mappings: [],
  challengeResult: {
    status: 'confirmed',
    initialRegionId: 'region-1',
    selectedRegionId: 'region-1',
    confidenceDelta: 0,
    findings: [],
    warnings: [],
  },
  canonicalRows: [],
  confidence: 0.9,
  providerUsed: 'deterministic',
  providersAttempted: ['deterministic'],
  warnings: [],
};

describe('Smart Import draft persistence', () => {
  it('round-trips the editable import preview without a backend', () => {
    const storage = new Map<string, string>();
    const localStorageLike = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    };

    saveImportDraft({
      localStorageLike,
      draft: {
        source,
        sheets,
        analysis,
        selectedSheetId: 'sheet-1',
        selectedRegionId: 'region-1',
        corrections: { 0: 'client.rfc' },
        documentWarnings: ['warning'],
      },
    });

    expect(loadImportDraft({ localStorageLike })?.source.fileName).toBe('clientes.csv');
    expect(loadImportDraft({ localStorageLike })?.corrections[0]).toBe('client.rfc');
  });
});
