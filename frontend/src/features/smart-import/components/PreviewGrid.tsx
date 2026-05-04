import type { CanonicalImportRow } from '../domain/types';

interface PreviewGridProps {
  rows: CanonicalImportRow[];
}

const PREVIEW_COLUMNS = [
  ['client.rfc', 'RFC'],
  ['client.nombre', 'Cliente'],
  ['client.email', 'Email'],
  ['client.telefono', 'Telefono'],
  ['operation.tipo', 'Tipo'],
  ['operation.descripcion', 'Descripcion'],
  ['operation.monto', 'Monto'],
  ['operation.fechaVence', 'Fecha vence'],
  ['operation.estatus', 'Estatus'],
] as const;

function getValue(row: CanonicalImportRow, path: (typeof PREVIEW_COLUMNS)[number][0]): string {
  const [scope, key] = path.split('.') as ['client' | 'operation', string];
  const value = scope === 'client'
    ? row.client[key as keyof CanonicalImportRow['client']]
    : row.operation[key as keyof CanonicalImportRow['operation']];

  if (typeof value === 'number') return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return value ? String(value) : '';
}

export function PreviewGrid({ rows }: PreviewGridProps) {
  const previewRows = rows.slice(0, 25);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--c-border)]">
      <table className="w-full text-left border-collapse">
        <thead style={{ background: 'var(--c-surface-raised)' }}>
          <tr>
            {PREVIEW_COLUMNS.map(([, label]) => (
              <th key={label} className="px-4 py-3 text-[11px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--c-text-muted)' }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row) => (
            <tr key={row.sourceRowIndex} style={{ borderTop: '1px solid var(--c-border-subtle)' }}>
              {PREVIEW_COLUMNS.map(([path]) => (
                <td key={path} className="px-4 py-3 text-sm min-w-[130px] max-w-[240px] truncate" style={{ color: 'var(--c-text-2)' }}>
                  {getValue(row, path)}
                </td>
              ))}
            </tr>
          ))}
          {previewRows.length === 0 && (
            <tr>
              <td colSpan={PREVIEW_COLUMNS.length} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>
                Sin filas canonicas para previsualizar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length > previewRows.length && (
        <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
          Mostrando {previewRows.length} de {rows.length} filas.
        </div>
      )}
    </div>
  );
}
