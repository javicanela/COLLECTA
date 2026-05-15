import type { CanonicalField, SmartImportAnalysis, SmartImportSource, WorkbookSheetSummary } from '../domain/types';

const IMPORT_DRAFT_KEY = 'collecta.smartImport.draft.v1';

interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SmartImportDraft {
  source: SmartImportSource;
  sheets: WorkbookSheetSummary[];
  analysis: SmartImportAnalysis;
  selectedSheetId: string;
  selectedRegionId: string;
  corrections: Record<number, CanonicalField | ''>;
  documentWarnings: string[];
  savedAt?: string;
}

function getDefaultLocalStorage(): LocalStorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadImportDraft({ localStorageLike = getDefaultLocalStorage() }: { localStorageLike?: LocalStorageLike | null } = {}) {
  if (!localStorageLike) return null;

  try {
    const raw = localStorageLike.getItem(IMPORT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SmartImportDraft;
  } catch {
    localStorageLike.removeItem(IMPORT_DRAFT_KEY);
    return null;
  }
}

export function saveImportDraft({
  draft,
  localStorageLike = getDefaultLocalStorage(),
}: {
  draft: SmartImportDraft;
  localStorageLike?: LocalStorageLike | null;
}) {
  if (!localStorageLike) return;
  localStorageLike.setItem(IMPORT_DRAFT_KEY, JSON.stringify({
    ...draft,
    savedAt: new Date().toISOString(),
  }));
}

export function clearImportDraft({ localStorageLike = getDefaultLocalStorage() }: { localStorageLike?: LocalStorageLike | null } = {}) {
  localStorageLike?.removeItem(IMPORT_DRAFT_KEY);
}
