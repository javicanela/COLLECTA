import { processImportBatch, type ImportResult, type ImportRow } from '../importService';
import { adaptCanonicalRowsToImportRows } from './legacyAdapter';
import type { SmartImportCommitInput } from './types';

export type ImportBatchProcessor = (rows: ImportRow[]) => Promise<ImportResult>;

export async function commitSmartImportRows(
  input: SmartImportCommitInput,
  processor: ImportBatchProcessor = processImportBatch,
): Promise<ImportResult & { success: true; legacyRows: ImportRow[] }> {
  const legacyRows = adaptCanonicalRowsToImportRows(input.confirmedRows);
  const result = await processor(legacyRows);

  return {
    success: true,
    legacyRows,
    ...result,
  };
}
