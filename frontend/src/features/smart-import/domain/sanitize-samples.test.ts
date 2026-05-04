import { describe, expect, it } from 'vitest';
import { sanitizeSmartImportSamples } from './sanitize-samples';

describe('sanitize samples', () => {
  it('redacts direct identifiers while preserving inference-friendly money and dates', () => {
    const sanitized = sanitizeSmartImportSamples({
      source: { sourceId: 'sample', fileName: 'clientes.csv', fileType: 'csv' },
      sheets: [
        {
          sheetId: 'sample:sheet-1',
          name: 'clientes.csv',
          rows: [
            ['RFC', 'Nombre', 'Email', 'Telefono', 'Monto', 'Fecha'],
            ['ABC010101ABC', 'Cliente Uno SA de CV', 'cobranza@cliente.mx', '+52 664 123 4567', '$12,450.50', '2026-04-15'],
          ],
        },
      ],
    });

    expect(sanitized.sheets[0].rows[1]).toEqual([
      'ABC0***ABC',
      'TEXT_20',
      'c***@cliente.mx',
      '******4567',
      '$12,450.50',
      '2026-04-15',
    ]);
  });

  it('caps rows per sheet before a sample can leave the browser', () => {
    const rows = Array.from({ length: 20 }, (_, index) => [`RFC${index}`, `Cliente ${index}`]);
    const sanitized = sanitizeSmartImportSamples({
      source: { sourceId: 'sample', fileName: 'large.csv', fileType: 'csv' },
      sheets: [{ sheetId: 'sample:sheet-1', name: 'large.csv', rows }],
    }, { maxRowsPerSheet: 5 });

    expect(sanitized.sheets[0].rows).toHaveLength(5);
  });
});
