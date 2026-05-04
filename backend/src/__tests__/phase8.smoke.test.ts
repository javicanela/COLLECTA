import { describe, expect, it } from 'vitest';
import { req, TEST_AUTH, prisma } from './test-app';

let rfcCounter = 0;
const uniqueRfc = () => {
  rfcCounter += 1;
  return `QAAX010101${String(rfcCounter).padStart(3, '0')}`;
};

describe('Phase 8 backend smoke checks', () => {
  it('logs in with admin credentials and verifies the JWT', async () => {
    const login = await req
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_USER,
        password: process.env.ADMIN_PASS,
      });

    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
    expect(login.body.user).toMatchObject({ role: 'admin' });

    const verify = await req
      .post('/api/auth/verify')
      .set({ Authorization: `Bearer ${login.body.token}` });

    expect(verify.status).toBe(200);
    expect(verify.body).toMatchObject({ valid: true });
  });

  it('creates and reads clients through the protected API', async () => {
    const rfc = uniqueRfc();

    const created = await req
      .post('/api/clients')
      .set(TEST_AUTH.headers)
      .send({ rfc, nombre: 'Cliente Smoke QA', telefono: '6641234567' });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ rfc, nombre: 'Cliente Smoke QA' });

    const list = await req.get('/api/clients').set(TEST_AUTH.headers);
    expect(list.status).toBe(200);
    expect(list.body.some((client: { rfc: string }) => client.rfc === rfc)).toBe(true);
  });

  it('creates and reads operations through the protected API', async () => {
    const client = await prisma.client.create({
      data: { rfc: uniqueRfc(), nombre: 'Cliente Operacion Smoke' },
    });

    const created = await req
      .post('/api/operations')
      .set(TEST_AUTH.headers)
      .send({
        clientId: client.id,
        tipo: 'FISCAL',
        descripcion: 'Declaracion mensual',
        monto: 1500,
        fechaVence: '2026-06-15T00:00:00.000Z',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ tipo: 'FISCAL', estatus: 'PENDIENTE' });

    const list = await req.get('/api/operations').set(TEST_AUTH.headers);
    expect(list.status).toBe(200);
    expect(list.body.some((op: { id: string }) => op.id === created.body.id)).toBe(true);
  });

  it('analyzes and commits a deterministic import batch', async () => {
    const rfc = uniqueRfc();

    const imported = await req
      .post('/api/import/batch')
      .set(TEST_AUTH.headers)
      .send({
        provider: 'regex',
        headers: ['RFC', 'Nombre', 'Monto', 'Concepto'],
        rows: [[rfc, 'Cliente Import Smoke', 2100, 'FISCAL']],
      });

    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({
      success: true,
      _source: 'regex',
      clientesCreados: 1,
      operacionesCreadas: 1,
    });

    const client = await prisma.client.findUnique({ where: { rfc } });
    expect(client?.nombre).toBe('Cliente Import Smoke');
  });

  it('keeps n8n routes protected and available with API auth', async () => {
    const missingAuth = await req.get('/api/n8n/pending-collections');
    expect(missingAuth.status).toBe(401);

    const validAuth = await req
      .get('/api/n8n/pending-collections')
      .set(TEST_AUTH.headers);

    expect(validAuth.status).toBe(200);
    expect(validAuth.body).toHaveProperty('collections');
  });

  it('reports WhatsApp status without requiring Evolution API in test', async () => {
    const status = await req
      .get('/api/whatsapp/status')
      .set(TEST_AUTH.headers);

    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({
      configured: false,
      connected: false,
      state: 'not_configured',
    });
  });
});
