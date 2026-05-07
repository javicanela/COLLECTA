import { describe, expect, it } from 'vitest';
import { xmlExtractor } from './xml-extractor';

function makeXmlFile(text: string, name = 'clientes.xml'): File {
  return new File([text], name, { type: 'application/xml' });
}

describe('xmlExtractor', () => {
  it('converts repeated XML nodes into a flattened ParsedDocument table', async () => {
    const document = await xmlExtractor.extract(
      makeXmlFile(`
        <clientes>
          <cliente>
            <datos>
              <rfc>ABC010101ABC</rfc>
              <nombre>Cliente Uno</nombre>
            </datos>
            <saldo>1250</saldo>
          </cliente>
          <cliente>
            <datos>
              <rfc>DEF020202DEF</rfc>
              <nombre>Cliente Dos</nombre>
            </datos>
            <saldo>2400</saldo>
          </cliente>
        </clientes>
      `),
      {},
    );

    expect(document.kind).toBe('xml');
    expect(document.fileName).toBe('clientes.xml');
    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].label).toBe('clientes.cliente');
    expect(document.tables[0].rows.map((row) => row.map((cell) => cell.value))).toEqual([
      ['datos.rfc', 'datos.nombre', 'saldo'],
      ['ABC010101ABC', 'Cliente Uno', '1250'],
      ['DEF020202DEF', 'Cliente Dos', '2400'],
    ]);
    expect(document.tables[0].rows[1][0]).toMatchObject({
      rawValue: 'ABC010101ABC',
      rowIndex: 1,
      columnIndex: 0,
      confidence: 1,
      source: {
        fileName: 'clientes.xml',
        sheetName: 'clientes.cliente',
        extractor: 'xml-extractor',
      },
    });
    expect(document.textBlocks).toEqual([]);
    expect(document.warnings).toEqual([]);
    expect(document.metrics.parseMs).toBeGreaterThanOrEqual(0);
  });

  it('preserves XML text blocks when no repeated-node table is clear', async () => {
    const document = await xmlExtractor.extract(
      makeXmlFile(`
        <estado>
          <cliente>
            <rfc>ABC010101ABC</rfc>
          </cliente>
          <nota>Pago pendiente de conciliacion</nota>
        </estado>
      `, 'estado.xml'),
      {},
    );

    expect(document.tables).toEqual([]);
    expect(document.textBlocks).toHaveLength(1);
    expect(document.textBlocks[0]).toMatchObject({
      text: expect.stringContaining('estado.cliente.rfc: ABC010101ABC'),
      confidence: 1,
      source: {
        fileName: 'estado.xml',
        extractor: 'xml-extractor',
      },
    });
    expect(document.textBlocks[0].text).toContain('estado.nota: Pago pendiente de conciliacion');
    expect(document.warnings).toEqual(['XML_NO_REPEATED_NODES_TABLE']);
  });

  it('throws a controlled error for invalid XML', async () => {
    await expect(xmlExtractor.extract(makeXmlFile('<clientes><cliente></clientes>'), {}))
      .rejects
      .toThrow('Smart Import XML parse error');
  });
});
