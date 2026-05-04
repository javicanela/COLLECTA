import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import * as evolutionApi from '../services/evolutionApi';

const router = Router();

const sendTextSchema = z.object({
  phone: z.string().min(10, 'Telefono requerido'),
  text: z.string().min(1, 'Mensaje requerido').max(5000),
  clientId: z.string().optional(),
  operationId: z.string().optional(),
  overrideSuspendedClient: z.boolean().optional().default(false),
});

const sendMediaSchema = z.object({
  phone: z.string().min(10, 'Telefono requerido'),
  mediaUrl: z.string().url('URL de media invalida'),
  caption: z.string().max(2000).optional().default(''),
  mediaType: z.enum(['image', 'document', 'video']).optional().default('document'),
  fileName: z.string().optional(),
  clientId: z.string().optional(),
  operationId: z.string().optional(),
  overrideSuspendedClient: z.boolean().optional().default(false),
});

const outboundLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 30 : 9999,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: 'outbound_rate_limit_exceeded',
    fallback: 'wa.me',
  },
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: import('express').NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

async function findClientForSend(clientId: string | undefined, phone: string) {
  if (clientId) {
    return prisma.client.findUnique({ where: { id: clientId } });
  }

  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (!last10) return null;

  return prisma.client.findFirst({
    where: {
      telefono: { contains: last10 },
    },
  });
}

async function recordOutboundAttempt(params: {
  clientId?: string | null;
  operationId?: string | null;
  phone: string;
  content?: string | null;
  mediaUrl?: string | null;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT';
  status: 'SENT' | 'FAILED' | 'BLOCKED';
  logVariant: 'INDIVIDUAL' | 'MEDIA';
  logResult: 'ENVIADO' | 'ERROR' | 'BLOQUEADO';
  evolutionMsgId?: string | null;
}) {
  await prisma.whatsAppMessage.create({
    data: {
      clientId: params.clientId || null,
      operationId: params.operationId || null,
      direction: 'OUTGOING',
      messageType: params.messageType,
      phone: evolutionApi.normalizePhone(params.phone),
      content: params.content || null,
      mediaUrl: params.mediaUrl || null,
      evolutionMsgId: params.evolutionMsgId || null,
      status: params.status,
    },
  });

  const mediaPrefix = params.mediaUrl ? `[${params.messageType}] ` : '';
  await prisma.logEntry.create({
    data: {
      clientId: params.clientId || null,
      tipo: 'WHATSAPP',
      variante: params.logVariant,
      resultado: params.logResult,
      mensaje: `${mediaPrefix}${params.content || params.mediaUrl || ''}`.substring(0, 500),
      telefono: params.phone,
      modo: 'PRODUCCION',
    },
  });
}

async function rejectSuspendedClientIfNeeded(params: {
  res: Response;
  phone: string;
  clientId?: string;
  operationId?: string;
  overrideSuspendedClient: boolean;
  content?: string | null;
  mediaUrl?: string | null;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT';
  logVariant: 'INDIVIDUAL' | 'MEDIA';
}) {
  const client = await findClientForSend(params.clientId, params.phone);
  if (client?.estado !== 'SUSPENDIDO' || params.overrideSuspendedClient) {
    return false;
  }

  await recordOutboundAttempt({
    clientId: client.id,
    operationId: params.operationId || null,
    phone: params.phone,
    content: params.content || null,
    mediaUrl: params.mediaUrl || null,
    messageType: params.messageType,
    status: 'BLOCKED',
    logVariant: params.logVariant,
    logResult: 'BLOQUEADO',
  });

  params.res.status(403).json({
    success: false,
    error: 'client_suspended',
    fallback: 'wa.me',
  });
  return true;
}

router.get('/status', async (_req: Request, res: Response) => {
  if (!evolutionApi.isConfigured()) {
    res.json({ configured: false, connected: false, state: 'not_configured' });
    return;
  }

  try {
    const state = await evolutionApi.getConnectionState();
    res.json({ configured: true, ...state });
  } catch {
    res.json({
      configured: true,
      connected: false,
      state: 'error',
      error: 'connection_check_failed',
    });
  }
});

router.post('/send', outboundLimiter, validateBody(sendTextSchema), async (req: Request, res: Response) => {
  const { phone, text, clientId, operationId, overrideSuspendedClient } = req.body;

  try {
    const blocked = await rejectSuspendedClientIfNeeded({
      res,
      phone,
      clientId,
      operationId,
      overrideSuspendedClient,
      content: text,
      messageType: 'TEXT',
      logVariant: 'INDIVIDUAL',
    });
    if (blocked) return;

    if (!evolutionApi.isConfigured()) {
      await recordOutboundAttempt({
        clientId,
        operationId,
        phone,
        content: text,
        messageType: 'TEXT',
        status: 'FAILED',
        logVariant: 'INDIVIDUAL',
        logResult: 'ERROR',
      });
      res.status(503).json({ success: false, error: 'evolution_not_configured', fallback: 'wa.me' });
      return;
    }

    const result = await evolutionApi.sendTextMessage(phone, text);

    await recordOutboundAttempt({
      clientId,
      operationId,
      phone,
      content: text,
      messageType: 'TEXT',
      evolutionMsgId: result.messageId || null,
      status: result.success ? 'SENT' : 'FAILED',
      logVariant: 'INDIVIDUAL',
      logResult: result.success ? 'ENVIADO' : 'ERROR',
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(502).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error sending message', details: error.message });
  }
});

router.post('/send-media', outboundLimiter, validateBody(sendMediaSchema), async (req: Request, res: Response) => {
  const { phone, mediaUrl, caption, mediaType, fileName, clientId, operationId, overrideSuspendedClient } = req.body;
  const messageType = mediaType === 'image' ? 'IMAGE' : 'DOCUMENT';
  const content = caption || fileName || null;

  try {
    const blocked = await rejectSuspendedClientIfNeeded({
      res,
      phone,
      clientId,
      operationId,
      overrideSuspendedClient,
      content,
      mediaUrl,
      messageType,
      logVariant: 'MEDIA',
    });
    if (blocked) return;

    if (!evolutionApi.isConfigured()) {
      await recordOutboundAttempt({
        clientId,
        operationId,
        phone,
        content,
        mediaUrl,
        messageType,
        status: 'FAILED',
        logVariant: 'MEDIA',
        logResult: 'ERROR',
      });
      res.status(503).json({ success: false, error: 'evolution_not_configured', fallback: 'wa.me' });
      return;
    }

    const result = await evolutionApi.sendMediaMessage(phone, mediaUrl, caption, mediaType, fileName);

    await recordOutboundAttempt({
      clientId,
      operationId,
      phone,
      content,
      mediaUrl,
      messageType,
      evolutionMsgId: result.messageId || null,
      status: result.success ? 'SENT' : 'FAILED',
      logVariant: 'MEDIA',
      logResult: result.success ? 'ENVIADO' : 'ERROR',
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(502).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error sending media', details: error.message });
  }
});

export default router;
