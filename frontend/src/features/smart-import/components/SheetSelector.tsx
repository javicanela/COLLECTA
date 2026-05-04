import { Layers, TableProperties } from 'lucide-react';
import type { DetectedRegion, WorkbookSheetSummary } from '../domain/types';

interface SheetSelectorProps {
  sheets: WorkbookSheetSummary[];
  regions: DetectedRegion[];
  selectedSheetId: string;
  selectedRegionId: string;
  onSelectSheet: (sheetId: string) => void;
  onSelectRegion: (regionId: string) => void;
}

export function SheetSelector({
  sheets,
  regions,
  selectedSheetId,
  selectedRegionId,
  onSelectSheet,
  onSelectRegion,
}: SheetSelectorProps) {
  const selectedSheetRegions = regions.filter((region) => region.sheetId === selectedSheetId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-raised)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={16} style={{ color: 'var(--brand-primary)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Hojas</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sheets.map((sheet) => {
            const active = sheet.sheetId === selectedSheetId;
            return (
              <button
                key={sheet.sheetId}
                type="button"
                onClick={() => onSelectSheet(sheet.sheetId)}
                className="rounded-lg border px-3 py-2 text-left transition active:scale-[0.99]"
                style={{
                  borderColor: active ? 'var(--brand-primary)' : 'var(--c-border)',
                  background: active ? 'var(--brand-primary-dim)' : 'var(--c-surface)',
                }}
              >
                <span className="block text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{sheet.name}</span>
                <span className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
                  {sheet.rowCount ?? sheet.rows.length} filas, {sheet.columnCount ?? 0} columnas
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-raised)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <TableProperties size={16} style={{ color: 'var(--brand-info)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Region</h3>
        </div>
        <select
          value={selectedRegionId}
          onChange={(event) => onSelectRegion(event.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
        >
          {selectedSheetRegions.map((region) => (
            <option key={region.regionId} value={region.regionId}>
              R{region.startRow + 1}:R{region.endRow + 1} / {region.headerLabels.length} columnas
            </option>
          ))}
        </select>
        {selectedSheetRegions.length === 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--brand-warn)' }}>Sin region tabular detectada.</p>
        )}
      </div>
    </div>
  );
}
