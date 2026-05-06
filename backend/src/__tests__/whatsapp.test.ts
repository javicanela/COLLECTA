import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as evolutionApi from '../services/evolutionApi';
import whatsappRoutes from '../routes/whatsapp';
import webhookRoutes from '../routes/webhooks';

type ClientRecord = {
  id: string;
  rfc: string;
  nombre: string;
  telefono: string | null;
  estado: string;
};

const db = {
  clients: [] as ClientRecord[],
  messages: [] as any[],
  logs: [] as any[],
};

vi.mock('../services/evolutionApi', () => ({
  isConfigured: vi.fn(() => true),
  getConnectionState: vi.fn(async () => ({
    connected: true,
    instance: 'collecta',
    state: 'open',
  })),
  normalizePhone: vi.fn((phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('52') ? digits : `52${digits}`;
  }),
  sendTextMessage: vi.fn(async () => ({ success: true, messageId: 'wamid-text-1' })),
  sendMediaMessage: vi.fn(async () => ({ success: true, messageId: 'wamid-media-1' })),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    client: {
      findUnique: vi.fn(async ({ where }: any) =>
        db.clients.find(client => client.id === where.id) ?? null
      ),
      findFirst: vi.fn(async ({ where }: any) => {
        const phoneContains = where?.telefono?.contains;
        if (!phoneContains) return null;
        return db.clients.find(client => client.telefono?.includes(phoneContains)) ?? null;
      }),
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

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/whatsapp', whatsappRoutes);
  app.use('/api/webhooks', webhookRoutes);
  return request(app);
}

let clientCounter = 0;
function createClient(overrides: Partial<ClientRecord> = {}) {
  clientCounter += 1;
  const client: ClientRecord = {
    id: `client-${clientCounter}`,
    rfc: `WAXX010101${String(clientCounter).padStart(3, '0')}`,
    nombre: 'Cliente WhatsApp',
    telefono: '6641234567',
    estado: 'ACTIVO',
    ...overrides,
  };
  db.clients.push(client);
  return client;
}

beforeEach(() => {
  db.clients = [];
  db.messages = [];
  db.logs = [];
  clientCounter = 0;
  vi.clearAllMocks();
  vi.mocked(evolutionApi.isConfigured).mockReturnValue(true);
  vi.mocked(evolutionApi.getConnectionState).mockResolvedValue({
    connected: true,
    instance: 'collecta',
    state: 'open',
  });
  vi.mocked(evolutionApi.sendTextMessage).mockResolvedValue({ success: true, messageId: 'wamid-text-1' });
  vi.mocked(evolutionApi.sendMediaMessage).mockResolvedValue({ success: true, messageId: 'wamid-media-1' });
});

describe('GET /api/whatsapp/status', () => {
  it('returns an explicit error state without leaking connection details', async () => {
    vi.mocked(evolutionApi.getConnectionState).mockRejectedValue(new Error('apikey=secret failed'));

    const res = await buildApp().get('/api/whatsapp/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      configured: true,
      connected: false,
      state: 'error',
      error: 'connection_check_failed',
    });
  });
});

describe('POST /api/whatsapp/send', () => {
  it('sends a text message and records WhatsAppMessage and LogEntry', async () => {
    const client = createClient();

    const res = await buildApp()
      .post('/api/whatsapp/send')
      .send({ phone: client.telefono, text: 'Hola cliente', clientId: client.id });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, messageId: 'wamid-text-1' });
    expect(evolutionApi.sendTextMessage).toHaveBeenCalledWith(client.telefono, 'Hola cliente');

    expect(db.messages[0]).toMatchObject({
      clientId: client.id,
      direction: 'OUTGOING',
      messageType: 'TEXT',
      phone: '526641234567',
      content: 'Hola cliente',
      evolutionMsgId: 'wamid-text-1',
      status: 'SENT',
    });

    expect(db.logs[0]).toMatchObject({
      clientId: client.id,
      tipo: 'WHATSAPP',
      variante: 'INDIVIDUAL',
      resultado: 'ENVIADO',
      telefono: client.telefono,
    });
  });

  it('logs failed Evolution sends as failed outbound messages', async () => {
    const client = createClient();
    vi.mocked(evolutionApi.sendTextMessage).mockResolvedValue({
      success: false,
      error: 'Evolution unavailable',
    });

    const res = await buildApp()
      .post('/api/whatsapp/send')
      .send({ phone: client.telefono, text: 'Recordatorio', clientId: client.id });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ success: false, error: 'Evolution unavailable' });
    expect(db.messages[0].status).toBe('FAILED');
    expect(db.logs[0].resultado).toBe('ERROR');
  });

  it('blocks suspended clients unless explicitly overridden', async () => {
    const client = createClient({ estado: 'SUSPENDIDO' });

    const blocked = await buildApp()
      .post('/api/whatsapp/send')
      .send({ phone: client.telefono, text: 'No debe salir', clientId: client.id });

    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual({
      success: false,
      error: 'client_suspended',
      fallback: 'wa.me',
    });
    expect(evolutionApi.sendTextMessage).not.toHaveBeenCalled();
    expect(db.messages[0].status).toBe('BLOCKED');
    expect(db.logs[0].resultado).toBe('BLOQUEADO');

    const overridden = await buildApp()
      .post('/api/whatsapp/send')
      .send({
        phone: client.telefono,
        text: 'Override autorizado',
        clientId: client.id,
        overrideSuspendedClient: true,
      });

    expect(overridden.status).toBe(200);
    expect(evolutionApi.sendTextMessage).toHaveBeenCalledWith(client.telefono, 'Override autorizado');
  });
});

describe('POST /api/whatsapp/send-media', () => {
  it('sends media and records WhatsAppMessage and LogEntry', async () => {
    const client = createClient();

    const res = await buildApp()
      .post('/api/whatsapp/send-media')
      .send({
        phone: client.telefono,
        mediaUrl: 'https://example.com/estado.pdf',
        caption: 'Estado de cuenta',
        mediaType: 'document',
        fileName: 'estado.pdf',
        clientId: client.id,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, messageId: 'wamid-media-1' });
    expect(evolutionApi.sendMediaMessage).toHaveBeenCalledWith(
      client.telefono,
      'https://example.com/estado.pdf',
      'Estado de cuenta',
      'document',
      'estado.pdf',
    );

    expect(db.messages[0]).toMatchObject({
      clientId: client.id,
      direction: 'OUTGOING',
      messageType: 'DOCUMENT',
      mediaUrl: 'https://example.com/estado.pdf',
      status: 'SENT',
    });

    expect(db.logs[0]).toMatchObject({
      clientId: client.id,
      tipo: 'WHATSAPP',
      variante: 'MEDIA',
      resultado: 'ENVIADO',
    });
  });
});

describe('POST /api/webhooks/evolution', () => {
  it('records incoming messages as WhatsAppMessage and LogEntry', async () => {
    const client = createClient({ telefono: '6647654321' });
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

    const request = buildApp().post('/api/webhooks/evolution');
    if (webhookSecret) {
      request.set('X-Webhook-Secret', webhookSecret);
    }

    const res = await request
      .send({
        event: 'messages.upsert',
        data: {
          key: {
            id: 'incoming-1',
            fromMe: false,
            remoteJid: '526647654321@s.whatsapp.net',
          },
          message: {
            conversation: 'Ya pague',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      received: true,
      processed: true,
      messageType: 'TEXT',
      clientMatched: true,
    });

    expect(db.messages[0]).toMatchObject({
      clientId: client.id,
      direction: 'INCOMING',
      messageType: 'TEXT',
      phone: '526647654321',
      content: 'Ya pague',
      evolutionMsgId: 'incoming-1',
      status: 'RECEIVED',
    });

    expect(db.logs[0]).toMatchObject({
      clientId: client.id,
      tipo: 'INCOMING',
      variante: 'TEXT',
      resultado: 'RECIBIDO',
      mensaje: 'Ya pague',
    });
  });
});
