import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as evolutionApi from '../services/evolutionApi';
import * as emailDelivery from '../services/emailDelivery';
import { generateClientStatementPdfBuffer } from '../services/pdfStatementService';
import { sendStatementToClient } from '../services/statementDeliveryService';

type ClientRecord = {
  id: string;
  rfc: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  estado: string;
};

type OperationRecord = {
  id: string;
  clientId: string;
  tipo: string;
  descripcion: string | null;
  monto: number;
  fechaVence: Date;
  fechaPago: Date | null;
  estatus: string;
  excluir: boolean;
  archived: boolean;
};

const db = {
  clients: [] as ClientRecord[],
  operations: [] as OperationRecord[],
  messages: [] as any[],
  logs: [] as any[],
  configs: [] as { key: string; value: string }[],
};

vi.mock('../services/evolutionApi', () => ({
  isConfigured: vi.fn(() => false),
  normalizePhone: vi.fn((phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('52') ? digits : `52${digits}`;
  }),
  sendMediaMessage: vi.fn(async () => ({ success: true, messageId: 'wamid-statement-1' })),
}));

vi.mock('../services/emailDelivery', () => ({
  isEmailConfigured: vi.fn(() => false),
  sendEmailWithAttachment: vi.fn(async () => ({ success: true, messageId: 'email-statement-1' })),
}));

vi.mock('../services/tempFileStorage', () => ({
  storeTemporaryPdf: vi.fn(async () => ({
    url: 'http://localhost:3001/api/cobranza/media/temp-token',
    expiresAt: new Date('2026-05-06T12:30:00.000Z'),
    storageProvider: 'local-temp',
  })),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    client: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return db.clients.find(client => client.id === where.id) ?? null;
        if (where.rfc) return db.clients.find(client => client.rfc === where.rfc) ?? null;
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        if (where.id) return db.clients.find(client => client.id === where.id) ?? null;
        if (where.rfc) return db.clients.find(client => client.rfc === where.rfc) ?? null;
        return null;
      }),
    },
    operation: {
      findMany: vi.fn(async ({ where, orderBy }: any) => {
        let operations = db.operations.filter(operation => {
          if (where?.clientId && operation.clientId !== where.clientId) return false;
          if (where?.fechaPago === null && operation.fechaPago !== null) return false;
          if (where?.excluir === false && operation.excluir) return false;
          if (where?.archived === false && operation.archived) return false;
          if (where?.estatus?.not && operation.estatus === where.estatus.not) return false;
          return true;
        });
        if (orderBy?.fechaVence === 'asc') {
          operations = operations.sort((a, b) => a.fechaVence.getTime() - b.fechaVence.getTime());
        }
        return operations;
      }),
      findUnique: vi.fn(async ({ where, include }: any) => {
        const operation = db.operations.find(item => item.id === where.id);
        if (!operation) return null;
        if (include?.client) {
          return {
            ...operation,
            client: db.clients.find(client => client.id === operation.clientId) ?? null,
          };
        }
        return operation;
      }),
    },
    config: {
      findMany: vi.fn(async () => db.configs),
    },
    whatsAppMessage: {
      create: vi.fn(async ({ data }: any) => {
        const record = { id: `wam-${db.messages.length + 1}`, ...data };
        db.messages.push(record);
        return record;
      }),
    },
    logEntry: {
      create: vi.fn(async ({ data }: any) => {
        const record = { id: `log-${db.logs.length + 1}`, ...data };
        db.logs.push(record);
        return record;
      }),
    },
  },
}));

function createClient(overrides: Partial<ClientRecord> = {}) {
  const client: ClientRecord = {
    id: `client-${db.clients.length + 1}`,
    rfc: 'XAXX010101000',
    nombre: 'Cliente Estado',
    telefono: '6641234567',
    email: 'cliente@example.test',
    estado: 'ACTIVO',
    ...overrides,
  };
  db.clients.push(client);
  return client;
}

function createOperation(clientId: string, overrides: Partial<OperationRecord> = {}) {
  const operation: OperationRecord = {
    id: `operation-${db.operations.length + 1}`,
    clientId,
    tipo: 'Honorarios',
    descripcion: 'Honorarios mensuales',
    monto: 12500,
    fechaVence: new Date('2026-05-15T00:00:00.000Z'),
    fechaPago: null,
    estatus: 'PENDIENTE',
    excluir: false,
    archived: false,
    ...overrides,
  };
  db.operations.push(operation);
  return operation;
}

beforeEach(() => {
  db.clients = [];
  db.operations = [];
  db.messages = [];
  db.logs = [];
  db.configs = [{ key: 'nombre_despacho', value: 'Collecta' }];
  vi.clearAllMocks();
  vi.mocked(evolutionApi.isConfigured).mockReturnValue(false);
  vi.mocked(evolutionApi.sendMediaMessage).mockResolvedValue({ success: true, messageId: 'wamid-statement-1' });
  vi.mocked(emailDelivery.isEmailConfigured).mockReturnValue(false);
  vi.mocked(emailDelivery.sendEmailWithAttachment).mockResolvedValue({ success: true, messageId: 'email-statement-1' });
});

describe('generateClientStatementPdfBuffer', () => {
  it('returns a controlled error when the RFC does not exist', async () => {
    await expect(generateClientStatementPdfBuffer('missing-rfc')).rejects.toMatchObject({
      code: 'CLIENT_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('generates a non-empty PDF buffer for a client with pending operations', async () => {
    const client = createClient({ rfc: 'ABC010101ABC' });
    createOperation(client.id);
    createOperation(client.id, { archived: true, monto: 999 });
    createOperation(client.id, { excluir: true, monto: 999 });

    const result = await generateClientStatementPdfBuffer('abc010101abc');

    expect(result.client.id).toBe(client.id);
    expect(result.operations).toHaveLength(1);
    expect(result.buffer.length).toBeGreaterThan(1000);
    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('uses a stable file name containing uppercase RFC and current date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T08:00:00.000Z'));
    const client = createClient({ rfc: 'ABC010101ABC' });
    createOperation(client.id);

    const result = await generateClientStatementPdfBuffer('abc010101abc');

    expect(result.fileName).toBe('estado_cuenta_ABC010101ABC_2026-05-06.pdf');
    vi.useRealTimers();
  });
});

describe('sendStatementToClient', () => {
  it('returns manual fallback when WhatsApp and email are not configured', async () => {
    const client = createClient();
    createOperation(client.id);

    const result = await sendStatementToClient({ rfc: client.rfc, channelPreference: 'AUTO' });

    expect(result).toMatchObject({
      success: false,
      channel: 'MANUAL_FALLBACK',
      clientId: client.id,
      mediaUrl: 'http://localhost:3001/api/cobranza/media/temp-token',
    });
    expect(result.fallbackWaUrl).toContain('https://wa.me/526641234567');
    expect(db.logs.map(log => log.resultado)).toContain('FALLBACK');
  });

  it('sends by WhatsApp media and records WhatsAppMessage', async () => {
    const client = createClient();
    const operation = createOperation(client.id);
    vi.mocked(evolutionApi.isConfigured).mockReturnValue(true);

    const result = await sendStatementToClient({ clientId: client.id, operationId: operation.id });

    expect(result).toMatchObject({
      success: true,
      channel: 'WHATSAPP',
      clientId: client.id,
      messageId: 'wamid-statement-1',
    });
    expect(evolutionApi.sendMediaMessage).toHaveBeenCalledWith(
      client.telefono,
      'http://localhost:3001/api/cobranza/media/temp-token',
      expect.stringContaining('Estado de cuenta'),
      'document',
      expect.stringContaining(client.rfc),
    );
    expect(db.messages[0]).toMatchObject({
      clientId: client.id,
      operationId: operation.id,
      direction: 'OUTGOING',
      messageType: 'DOCUMENT',
      status: 'SENT',
    });
  });

  it('falls back to email when WhatsApp media fails', async () => {
    const client = createClient();
    createOperation(client.id);
    vi.mocked(evolutionApi.isConfigured).mockReturnValue(true);
    vi.mocked(evolutionApi.sendMediaMessage).mockResolvedValue({ success: false, error: 'Evolution down' });
    vi.mocked(emailDelivery.isEmailConfigured).mockReturnValue(true);

    const result = await sendStatementToClient({ clientId: client.id, channelPreference: 'AUTO' });

    expect(result).toMatchObject({
      success: true,
      channel: 'EMAIL',
      clientId: client.id,
      emailMessageId: 'email-statement-1',
    });
    expect(emailDelivery.sendEmailWithAttachment).toHaveBeenCalledWith(expect.objectContaining({
      to: client.email,
      attachment: expect.objectContaining({ contentType: 'application/pdf' }),
    }));
    expect(db.logs.map(log => log.resultado)).toEqual(expect.arrayContaining(['ERROR', 'ENVIADO']));
  });

  it('blocks automatic delivery to suspended clients', async () => {
    const client = createClient({ estado: 'SUSPENDIDO' });
    createOperation(client.id);

    await expect(sendStatementToClient({ clientId: client.id })).rejects.toMatchObject({
      code: 'CLIENT_SUSPENDED',
      statusCode: 409,
    });
    expect(evolutionApi.sendMediaMessage).not.toHaveBeenCalled();
    expect(emailDelivery.sendEmailWithAttachment).not.toHaveBeenCalled();
  });
});
