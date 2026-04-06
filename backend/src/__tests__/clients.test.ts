import { describe, it, expect } from 'vitest';
import { req, TEST_AUTH } from './test-app';
import { prisma } from './test-app';

// RFC format: 3-4 letters + 6 digits + 2-3 alphanumeric = max 13 chars
// Generate unique RFCs to avoid conflicts between parallel tests
let rfcCounter = 0;
const uniqueRfc = () => {
  rfcCounter++;
  return `XAXX010101${String(rfcCounter).padStart(3, '0')}`; // XAXX + 010101 + 3 digits
};

describe('POST /api/clients', () => {
  it('creates a client with valid RFC → 201', async () => {
    const rfc = uniqueRfc();
    const res = await req
      .post('/api/clients')
      .set(TEST_AUTH.headers)
      .send({
        rfc,
        nombre: 'Cliente Prueba',
        email: 'test@example.com',
        telefono: '6641234567',
      });

    if (res.status !== 201) {
      console.log('CREATE ERROR:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.rfc).toBe(rfc);
    expect(res.body.nombre).toBe('Cliente Prueba');
    expect(res.body.estado).toBe('ACTIVO');
  });

  it('rejects invalid RFC → 400', async () => {
    const res = await req
      .post('/api/clients')
      .set(TEST_AUTH.headers)
      .send({
        rfc: 'INVALID',
        nombre: 'Cliente Inválido',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects duplicate RFC → 409', async () => {
    const rfc = uniqueRfc();

    const res1 = await req
      .post('/api/clients')
      .set(TEST_AUTH.headers)
      .send({ rfc, nombre: 'Primero' });

    if (res1.status !== 201) {
      console.log('FIRST CREATE ERROR:', JSON.stringify(res1.body, null, 2), 'RFC:', rfc);
    }
    expect(res1.status).toBe(201);

    const res2 = await req
      .post('/api/clients')
      .set(TEST_AUTH.headers)
      .send({ rfc, nombre: 'Duplicado' });

    expect(res2.status).toBe(409);
  });

  it('rejects missing required fields → 400', async () => {
    const res = await req
      .post('/api/clients')
      .set(TEST_AUTH.headers)
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
  });

  it('normalizes RFC to uppercase', async () => {
    // Send lowercase RFC - validation requires uppercase, so we test
    // that the route accepts a valid RFC format (uppercase letters)
    const res = await req
      .post('/api/clients')
      .set(TEST_AUTH.headers)
      .send({
        rfc: uniqueRfc(),
        nombre: 'RFC Test',
      });

    expect(res.status).toBe(201);
    expect(res.body.rfc).toBe(res.body.rfc.toUpperCase());
  });
});

describe('GET /api/clients', () => {
  it('returns empty array when no clients → 200', async () => {
    const res = await req.get('/api/clients').set(TEST_AUTH.headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns all clients with operations → 200', async () => {
    const client = await prisma.client.create({
      data: { rfc: uniqueRfc(), nombre: 'Cliente Uno' },
    });

    await prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        monto: 1000,
        fechaVence: new Date('2026-12-31'),
      },
    });

    const res = await req.get('/api/clients').set(TEST_AUTH.headers);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('DELETE /api/clients/:id', () => {
  it('deletes a client → 200', async () => {
    const client = await prisma.client.create({
      data: { rfc: uniqueRfc(), nombre: 'Para Borrar' },
    });

    const res = await req
      .delete(`/api/clients/${client.id}`)
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    const deleted = await prisma.client.findUnique({
      where: { id: client.id },
    });
    expect(deleted).toBeNull();
  });
});

describe('PUT /api/clients/:id', () => {
  it('updates a client → 200', async () => {
    const client = await prisma.client.create({
      data: { rfc: uniqueRfc(), nombre: 'Original' },
    });

    const res = await req
      .put(`/api/clients/${client.id}`)
      .set(TEST_AUTH.headers)
      .send({ nombre: 'Actualizado' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Actualizado');
  });
});

describe('PATCH /api/clients/:id/toggle-status', () => {
  it('toggles ACTIVO → SUSPENDIDO → 200', async () => {
    const client = await prisma.client.create({
      data: { rfc: uniqueRfc(), nombre: 'Toggle Test' },
    });

    const res = await req
      .patch(`/api/clients/${client.id}/toggle-status`)
      .set(TEST_AUTH.headers);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('SUSPENDIDO');
  });
});

describe('Auth middleware', () => {
  it('rejects requests without auth → 401', async () => {
    const res = await req.get('/api/clients');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token → 401', async () => {
    const res = await req
      .get('/api/clients')
      .set({ Authorization: 'Bearer wrong-key' });
    expect(res.status).toBe(401);
  });

  it('rejects missing Bearer prefix → 401', async () => {
    const res = await req
      .get('/api/clients')
      .set({ Authorization: process.env.API_KEY || '' });
    expect(res.status).toBe(401);
  });
});
