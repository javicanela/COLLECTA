import { describe, expect, it } from 'vitest';
import { parseCsvText } from './parse-csv';

describe('parse csv', () => {
  it('returns a single workbook sheet summary from CSV text', async () => {
    const result = await parseCsvText('RFC,Nombre,Monto\nABC010101ABC,Cliente Uno,"$1,250.00"\nLOPE8001019Q8,Cliente Dos,3200', {
      sourceId: 'csv-1',
      fileName: 'clientes.csv',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sheetId: 'csv-1:sheet-1',
      name: 'clientes.csv',
      rowCount: 3,
      columnCount: 3,
    });
    expect(result[0].rows[1]).toEqual(['ABC010101ABC', 'Cliente Uno', '$1,250.00']);
  });

  it('keeps sparse rows available for table detection instead of silently shifting data', async () => {
    const result = await parseCsvText('Reporte externo\n\nRFC,Nombre\nABC010101ABC,Cliente Uno', {
      sourceId: 'csv-2',
      fileName: 'title.csv',
    });

    expect(result[0].rows).toEqual([
      ['Reporte externo'],
      [''],
      ['RFC', 'Nombre'],
      ['ABC010101ABC', 'Cliente Uno'],
    ]);
  });
});
