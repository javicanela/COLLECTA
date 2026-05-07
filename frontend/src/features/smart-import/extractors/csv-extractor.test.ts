import { describe, expect, it } from 'vitest';
import { csvExtractor } from './csv-extractor';
import { extractDocument } from './extract-document';

function makeCsvFile(text: string): File {
  return new File([text], 'clientes.csv', { type: 'text/csv' });
}

describe('csvExtractor', () => {
  it('converts parsed CSV rows into a ParsedDocument table', async () => {
    const document = await csvExtractor.extract(
      makeCsvFile('RFC,Nombre,Monto\nABC010101ABC,Cliente Uno,"$1,250.00"'),
      {},
    );

    expect(document.kind).toBe('csv');
    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].source.sheetName).toBe('clientes.csv');
    expect(document.tables[0].rows[1][0]).toMatchObject({
      value: 'ABC010101ABC',
      rowIndex: 1,
      columnIndex: 0,
      confidence: 1,
      source: {
        fileName: 'clientes.csv',
        sheetName: 'clientes.csv',
        extractor: 'csv-extractor',
      },
    });
  });

  it('is registered in the default extractor router', async () => {
    const document = await extractDocument(makeCsvFile('RFC\nABC010101ABC'));

    expect(document.kind).toBe('csv');
    expect(document.tables[0].rows[1][0].value).toBe('ABC010101ABC');
  });
});
