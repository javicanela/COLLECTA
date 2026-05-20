import { processImportBatch, type ImportResult, type ImportRow } from '../importService';
import { DEFAULT_ORGANIZATION_ID } from '../../lib/tenant';
import { adaptCanonicalRowsToImportRows } from './legacyAdapter';
import type { SmartImportCommitInput } from './types';

export type ImportBatchProcessor = (rows: ImportRow[], organizationId?: string) => Promise<ImportResult>;

export async function commitSmartImportRows(
  input: SmartImportCommitInput,
  processor: ImportBatchProcessor = processImportBatch,
  organizationId = DEFAULT_ORGANIZATION_ID,
): Promise<ImportResult & { success: true; legacyRows: ImportRow[] }> {
  const legacyRows = adaptCanonicalRowsToImportRows(input.confirmedRows);
  const result = await processor(legacyRows, organizationId);

  return {
    success: true,
    legacyRows,
    ...result,
  };
}
