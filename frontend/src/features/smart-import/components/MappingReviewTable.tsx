import { CANONICAL_FIELDS } from '../domain/types';
import type { CanonicalField, MappingCandidate } from '../domain/types';
import { ConfidenceBadge } from './ConfidenceBadge';

interface MappingReviewTableProps {
  mappings: MappingCandidate[];
  corrections: Record<number, CanonicalField | ''>;
  onChange: (columnIndex: number, field: CanonicalField | '') => void;
}

const FIELD_LABELS: Record<CanonicalField, string> = {
  'client.rfc': 'Cliente RFC',
  'client.nombre': 'Cliente nombre',
  'client.telefono': 'Cliente telefono',
  'client.email': 'Cliente email',
  'client.regimen': 'Cliente regimen',
  'client.categoria': 'Cliente categoria',
  'client.asesor': 'Cliente asesor',
  'operation.tipo': 'Operacion tipo',
  'operation.descripcion': 'Operacion descripcion',
  'operation.monto': 'Operacion monto',
  'operation.fechaVence': 'Operacion fecha vence',
  'operation.fechaPago': 'Operacion fecha pago',
  'operation.estatus': 'Operacion estatus',
  'operation.asesor': 'Operacion asesor',
  'operation.excluir': 'Operacion excluir',
  'operation.archived': 'Operacion archived',
  ignore: 'Ignorar',
};

export function MappingReviewTable({ mappings, corrections, onChange }: MappingReviewTableProps) {
  const selectableFields = CANONICAL_FIELDS.filter((field) => field !== 'ignore');

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--c-border)]">
      <table className="w-full text-left border-collapse">
        <thead style={{ background: 'var(--c-surface-raised)' }}>
          <tr>
            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Columna</th>
            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Destino</th>
            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Confianza</th>
            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Evidencia</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => {
            const currentField = corrections[mapping.columnIndex] ?? mapping.field;
            return (
              <tr key={mapping.columnIndex} style={{ borderTop: '1px solid var(--c-border-subtle)' }}>
                <td className="px-4 py-3 min-w-[180px]">
                  <div className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{mapping.sourceHeader}</div>
                  <div className="text-xs" style={{ color: 'var(--c-text-muted)' }}>Columna {mapping.columnIndex + 1}</div>
                </td>
                <td className="px-4 py-3 min-w-[220px]">
                  <select
                    value={currentField}
                    onChange={(event) => onChange(mapping.columnIndex, event.target.value as CanonicalField | '')}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                  >
                    <option value="">Ignorar</option>
                    {selectableFields.map((field) => (
                      <option key={field} value={field}>{FIELD_LABELS[field]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ConfidenceBadge confidence={mapping.confidence} />
                </td>
                <td className="px-4 py-3 min-w-[260px]">
                  <div className="flex flex-wrap gap-1.5">
                    {mapping.reasonCodes.slice(0, 4).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'var(--c-surface-raised)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border)' }}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
