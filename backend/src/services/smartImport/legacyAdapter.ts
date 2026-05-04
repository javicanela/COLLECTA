import type { ImportRow } from '../importService';
import type { CanonicalImportRow } from './types';

export function adaptCanonicalRowsToImportRows(rows: CanonicalImportRow[]): ImportRow[] {
  return rows.flatMap((row) => {
    const rfc = row.client.rfc?.trim().toUpperCase();
    const monto = row.operation.monto;
    const concepto = row.operation.tipo?.trim() || row.operation.descripcion?.trim() || 'FISCAL';

    if (!rfc || typeof monto !== 'number' || !Number.isFinite(monto)) {
      return [];
    }

    return [{
      rfc,
      nombre: row.client.nombre?.trim() || undefined,
      telefono: row.client.telefono?.trim() || undefined,
      email: row.client.email?.trim() || undefined,
      monto,
      concepto,
      fechaVence: row.operation.fechaVence,
    }];
  });
}
