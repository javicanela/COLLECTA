import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSafeTestDatabase } from './fixtures/e2eCollectionsFixture';
import { prisma, req } from './test-app';
import { PAYMENT_DETECTION_LOG_TYPE } from '../services/paymentDetection';

const phone = '6641234500';
const RFC_PREFIX = 'WPC';
let rfcCounter = 0;

function nextRfc() {
  rfcCounter += 1;
  return `${RFC_PREFIX}P${String(rfcCounter).padStart(2, '0')}0101AA1`;
}

async function cleanupCorrelationData() {
  assertSafeTestDatabase();
  const clients = await prisma.client.findMany({
    where: { rfc: { startsWith: RFC_PREFIX } },
    select: { id: true },
  });
  const clientIds = clients.map(client => client.id);

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

async function createClientWithOperations(amounts: number[]) {
  const client = await prisma.client.create({
    data: {
      rfc: nextRfc(),
      nombre: 'Cliente correlacion WhatsApp',
      telefono: phone,
      email: 'correlacion@example.test',
      estado: 'ACTIVO',
    },
  });

  const operations = await Promise.all(amounts.map((amount, index) =>
    prisma.operation.create({
      data: {
        clientId: client.id,
        tipo: 'FISCAL',
        descripcion: `Operacion correlacion ${index + 1}`,
        monto: amount,
        fechaVence: new Date(Date.UTC(2026, 5, 10 + index)),
        estatus: 'PENDIENTE',
      },
    }),
  ));

  return { client, operations };
}

async function recordOutboundCollection(clientId: string, operationId?: string) {
  await prisma.whatsAppMessage.create({
    data: {
      clientId,
      operationId,
      direction: 'OUTGOING',
      messageType: 'TEXT',
      phone: `52${phone}`,
      content: 'Collecta: recordatorio de cobranza pendiente.',
      status: 'SENT',
    },
  });
}

async function sendIncomingPaymentText(text: string, messageId: string) {
  const request = req.post('/api/webhooks/evolution');
  if (process.env.EVOLUTION_WEBHOOK_SECRET) {
    request.set('X-Webhook-Secret', process.env.EVOLUTION_WEBHOOK_SECRET);
  }

  return request.send({
    event: 'messages.upsert',
    data: {
      key: {
        id: messageId,
        fromMe: false,
        remoteJid: `52${phone}@s.whatsapp.net`,
      },
      message: {
        conversation: text,
      },
    },
  });
}

async function latestDetectionLog() {
  return prisma.logEntry.findFirst({
    where: { tipo: PAYMENT_DETECTION_LOG_TYPE },
    orderBy: { createdAt: 'desc' },
  });
}

describe('WhatsApp payment confirmation correlation', () => {
  beforeEach(async () => {
    await cleanupCorrelationData();
  });

  afterEach(async () => {
    await cleanupCorrelationData();
  });

  it('marks paid when one open operation exists and the phone has previous outbound cobranza', async () => {
    const { client, operations } = await createClientWithOperations([1800]);
    await recordOutboundCollection(client.id, operations[0].id);

    const res = await sendIncomingPaymentText('ya pague', 'wa-pay-one-open');

    expect(res.status).toBe(200);
    expect(res.body.paymentCorrelation).toMatchObject({
      status: 'ACCEPTED',
      operationId: operations[0].id,
      reasons: expect.arrayContaining(['single_open_operation', 'previous_outbound_whatsapp']),
    });

    const updated = await prisma.operation.findUniqueOrThrow({ where: { id: operations[0].id } });
    expect(updated.estatus).toBe('PAGADO');
    expect(updated.fechaPago).toBeInstanceOf(Date);
  });

  it('requires review when multiple open operations exist and the message has no amount', async () => {
    const { client, operations } = await createClientWithOperations([1800, 2600]);
    await recordOutboundCollection(client.id, operations[0].id);

    const res = await sendIncomingPaymentText('pagado', 'wa-pay-ambiguous');

    expect(res.status).toBe(200);
    expect(res.body.paymentCorrelation).toMatchObject({
      status: 'REVIEW_REQUIRED',
      operationId: null,
      reasons: expect.arrayContaining(['multiple_open_operations_without_amount']),
    });

    const unchanged = await prisma.operation.findMany({ where: { clientId: client.id } });
    expect(unchanged.every(op => op.estatus === 'PENDIENTE' && op.fechaPago === null)).toBe(true);
  });

  it('marks the exact open operation paid when incoming text includes a matching amount', async () => {
    const { client, operations } = await createClientWithOperations([1800, 2600]);
    await recordOutboundCollection(client.id, operations[1].id);

    const res = await sendIncomingPaymentText('te mande comprobante por $2,600.00', 'wa-pay-amount');

    expect(res.status).toBe(200);
    expect(res.body.paymentCorrelation).toMatchObject({
      status: 'ACCEPTED',
      operationId: operations[1].id,
      reasons: expect.arrayContaining(['amount_exact', 'previous_outbound_whatsapp']),
    });

    const first = await prisma.operation.findUniqueOrThrow({ where: { id: operations[0].id } });
    const second = await prisma.operation.findUniqueOrThrow({ where: { id: operations[1].id } });
    expect(first.estatus).toBe('PENDIENTE');
    expect(second.estatus).toBe('PAGADO');
  });

  it('does not mark paid if no previous outbound cobranza exists for that phone', async () => {
    const { operations } = await createClientWithOperations([1800]);

    const res = await sendIncomingPaymentText('ya pague', 'wa-pay-no-outbound');

    expect(res.status).toBe(200);
    expect(res.body.paymentCorrelation).toMatchObject({
      status: 'REVIEW_REQUIRED',
      reasons: expect.arrayContaining(['no_previous_outbound_whatsapp']),
    });

    const unchanged = await prisma.operation.findUniqueOrThrow({ where: { id: operations[0].id } });
    expect(unchanged.estatus).toBe('PENDIENTE');
  });

  it('does not mark paid on future-payment language', async () => {
    const { client, operations } = await createClientWithOperations([1800]);
    await recordOutboundCollection(client.id, operations[0].id);

    const res = await sendIncomingPaymentText('pago manana', 'wa-pay-future-language');

    expect(res.status).toBe(200);
    expect(res.body.paymentCorrelation).toMatchObject({
      status: 'REVIEW_REQUIRED',
      reasons: expect.arrayContaining(['non_payment_language']),
    });

    const unchanged = await prisma.operation.findUniqueOrThrow({ where: { id: operations[0].id } });
    expect(unchanged.estatus).toBe('PENDIENTE');
  });

  it('prevents duplicate payment confirmations from changing another operation', async () => {
    const { client, operations } = await createClientWithOperations([1800, 2600]);
    await recordOutboundCollection(client.id, operations[0].id);

    const first = await sendIncomingPaymentText('transferido $1,800', 'wa-pay-duplicate');
    const duplicate = await sendIncomingPaymentText('transferido $1,800', 'wa-pay-duplicate');

    expect(first.body.paymentCorrelation).toMatchObject({
      status: 'ACCEPTED',
      operationId: operations[0].id,
    });
    expect(duplicate.body.paymentCorrelation).toMatchObject({
      status: 'DUPLICATE',
      operationId: operations[0].id,
      reasons: expect.arrayContaining(['duplicate_incoming_message']),
    });

    const untouched = await prisma.operation.findUniqueOrThrow({ where: { id: operations[1].id } });
    expect(untouched.estatus).toBe('PENDIENTE');
    expect((await latestDetectionLog())?.resultado).toBe('DUPLICATE');
  });
});
