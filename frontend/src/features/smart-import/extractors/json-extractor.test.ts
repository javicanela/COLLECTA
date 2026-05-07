import { describe, expect, it } from 'vitest';
import { jsonExtractor } from './json-extractor';

function makeJsonFile(text: string, name = 'clientes.json'): File {
  return new File([text], name, { type: 'application/json' });
}

describe('jsonExtractor', () => {
  it('converts a JSON array of nested objects into a flattened ParsedDocument table', async () => {
    const document = await jsonExtractor.extract(
      makeJsonFile(JSON.stringify([
        {
          cliente: {
            rfc: 'ABC010101ABC',
            nombre: 'Cliente Uno',
          },
          saldo: 1250,
        },
        {
          cliente: {
            rfc: 'DEF020202DEF',
            nombre: 'Cliente Dos',
          },
          saldo: 2400,
        },
      ])),
      {},
    );

    expect(document.kind).toBe('json');
    expect(document.fileName).toBe('clientes.json');
    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].rows.map((row) => row.map((cell) => cell.value))).toEqual([
      ['cliente.rfc', 'cliente.nombre', 'saldo'],
      ['ABC010101ABC', 'Cliente Uno', '1250'],
      ['DEF020202DEF', 'Cliente Dos', '2400'],
    ]);
    expect(document.tables[0].rows[1][0]).toMatchObject({
      rawValue: 'ABC010101ABC',
      rowIndex: 1,
      columnIndex: 0,
      confidence: 1,
      source: {
        fileName: 'clientes.json',
        sheetName: 'clientes.json',
        extractor: 'json-extractor',
      },
    });
    expect(document.textBlocks).toEqual([]);
    expect(document.warnings).toEqual([]);
    expect(document.metrics.parseMs).toBeGreaterThanOrEqual(0);
  });

  it('finds nested JSON arrays of objects and labels the table with the object path', async () => {
    const document = await jsonExtractor.extract(
      makeJsonFile(JSON.stringify({
        corte: {
          fecha: '2026-05-06',
          clientes: [
            {
              cliente: {
                rfc: 'ABC010101ABC',
              },
              factura: 'F-001',
            },
          ],
        },
      }), 'reporte.json'),
      {},
    );

    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].label).toBe('corte.clientes');
    expect(document.tables[0].source.sheetName).toBe('corte.clientes');
    expect(document.tables[0].rows.map((row) => row.map((cell) => cell.value))).toEqual([
      ['cliente.rfc', 'factura'],
      ['ABC010101ABC', 'F-001'],
    ]);
  });

  it('throws a controlled error for invalid JSON', async () => {
    await expect(jsonExtractor.extract(makeJsonFile('{ "cliente": '), {}))
      .rejects
      .toThrow('Smart Import JSON parse error');
  });
});
