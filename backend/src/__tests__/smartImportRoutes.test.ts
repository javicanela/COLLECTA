import { describe, expect, it } from 'vitest';
import { req, TEST_AUTH } from './test-app';

describe('Smart Import routes', () => {
  it('rejects analyze payloads with clean 400 responses', async () => {
    const res = await req
      .post('/api/import/analyze')
      .set(TEST_AUTH.headers)
      .send({ sheets: [] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('analyzes normalized samples through /api/import/analyze', async () => {
    const res = await req
      .post('/api/import/analyze')
      .set(TEST_AUTH.headers)
      .send({
        source: { sourceId: 'route-1', fileName: 'clientes.csv', fileType: 'csv' },
        sheets: [
          {
            sheetId: 'route-1:sheet-1',
            name: 'clientes.csv',
            rows: [
              ['RFC', 'Nombre', 'Monto', 'Fecha de Vencimiento', 'Concepto'],
              ['ABC010101ABC', 'Cliente Uno', '$1,250.00', '2026-04-15', 'FISCAL'],
            ],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.providerUsed).toBe('deterministic');
    expect(res.body.previewCanonicalRows[0].client.rfc).toBe('ABC010101ABC');
  });

  it('rejects commit payloads with clean 400 responses', async () => {
    const res = await req
      .post('/api/import/commit')
      .set(TEST_AUTH.headers)
      .send({ confirmedRows: [{ client: {}, operation: {} }] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });
});
