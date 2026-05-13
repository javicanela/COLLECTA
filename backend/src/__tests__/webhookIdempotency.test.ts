import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSafeTestDatabase } from './fixtures/e2eCollectionsFixture';
import { prisma, req } from './test-app';

const phone = '6641234500';
const RFC_PREFIX = 'IDM';
let rfcCounter = 0;

function nextRfc() {
  rfcCounter += 1;
  return `${RFC_PREFIX}P${String(rfcCounter).padStart(2, '0')}0101AA1`;
}

async function cleanupIdempotencyData() {
  assertSafeTestDatabase();
  const clients = await prisma.client.findMany({
    where: { rfc: { startsWith: RFC_PREFIX } },
    select: { id: true },
  });
  const clientIds = clients.map(c => c.id);

  await prisma.whatsAppMessage.deleteMany({
    where: {
      OR: [
        { phone: { contains: phone } },
        ...(clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : []),
      ],
    },
  });
  await prisma.logEntry.deleteMany({
    where: {
      OR: [
        { telefono: { contains: phone } },
        { mensaje: { contains: RFC_PREFIX } },
        ...(clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : []),
      ],
    },
  });
  if (clientIds.length > 0) {
    await prisma.operation.deleteMany({ where: { clientId: { in: clientIds } } });
  }
  await prisma.client.deleteMany({ where: { rfc: { startsWith: RFC_PREFIX } } });
}

async function createClientWithOperation(amount = 1800) {
  const client = await prisma.client.create({
    data: {
      rfc: nextRfc(),
      nombre: 'Cliente idempotencia',
      telefono: phone,
      email: 'idempotencia@example.test',
      estado: 'ACTIVO',
    },
  });
  const operation = await prisma.operation.create({
    data: {
      clientId: client.id,
      tipo: 'FISCAL',
      descripcion: 'Operacion idempotencia',
      monto: amount,
      fechaVence: new Date(Date.UTC(2026, 5, 15)),
      estatus: 'PENDIENTE',
    },
  });
  return { client, operation };
}

async function sendWebhook(text: string, messageId: string) {
  const request = req.post('/api/webhooks/evolution');
  if (process.env.EVOLUTION_WEBHOOK_SECRET) {
    request.set('X-Webhook-Secret', process.env.EVOLUTION_WEBHOOK_SECRET);
  }
  return request.send({
    event: 'messages.upsert',
    data: {
      key: { id: messageId, fromMe: false, remoteJid: `52${phone}@s.whatsapp.net` },
      message: { conversation: text },
    },
  });
}

describe('Webhook idempotency', () => {
  beforeEach(async () => {
    await cleanupIdempotencyData();
  });

  afterEach(async () => {
    await cleanupIdempotencyData();
  });

  it('returns processed:true on first request and duplicate on second with same key.id', async () => {
    const { client, operation } = await createClientWithOperation(1800);
    await prisma.whatsAppMessage.create({
      data: {
        clientId: client.id,
        operationId: operation.id,
        direction: 'OUTGOING',
        messageType: 'TEXT',
        phone: `52${phone}`,
        content: 'Collecta: recordatorio de cobranza.',
        status: 'SENT',
      },
    });

    const first = await sendWebhook('ya pague', 'idem-001');
    const second = await sendWebhook('ya pague', 'idem-001');

    expect(first.status).toBe(200);
    expect(first.body.processed).toBe(true);

    expect(second.status).toBe(200);
    expect(second.body.processed).toBe(false);
    expect(second.body.reason).toBe('duplicate_message');

    const incomingMessages = await prisma.whatsAppMessage.findMany({
      where: { evolutionMsgId: 'idem-001', direction: 'INCOMING' },
    });
    expect(incomingMessages).toHaveLength(1);

    const incomingLogs = await prisma.logEntry.findMany({
      where: { tipo: 'INCOMING', telefono: { contains: phone } },
    });
    expect(incomingLogs).toHaveLength(1);
  });
});
