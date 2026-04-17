import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import * as evolutionApi from '../services/evolutionApi';

const router = Router();

const sendTextSchema = z.object({
  phone: z.string().min(10, 'Teléfono requerido'),
  text: z.string().min(1, 'Mensaje requerido').max(5000),
  clientId: z.string().optional(),
  operationId: z.string().optional(),
});

const sendMediaSchema = z.object({
  phone: z.string().min(10, 'Teléfono requerido'),
  mediaUrl: z.string().url('URL de media inválida'),
  caption: z.string().max(2000).optional().default(''),
  mediaType: z.enum(['image', 'document', 'video']).optional().default('document'),
  fileName: z.string().optional(),
  clientId: z.string().optional(),
  operationId: z.string().optional(),
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

// GET /api/whatsapp/status
router.get('/status', async (_req: Request, res: Response) => {
  if (!evolutionApi.isConfigured()) {
    res.json({ configured: false, connected: false, state: 'not_configured' });
    return;
  }
  try {
    const state = await evolutionApi.getConnectionState();
    res.json({ configured: true, ...state });
  } catch (error: any) {
    res.json({ configured: true, connected: false, state: 'error', error: error.message });
  }
});

// POST /api/whatsapp/send
router.post('/send', validateBody(sendTextSchema), async (req: Request, res: Response) => {
  const { phone, text, clientId, operationId } = req.body;

  try {
    const result = await evolutionApi.sendTextMessage(phone, text);

    await prisma.whatsAppMessage.create({
      data: {
        clientId: clientId || null,
        operationId: operationId || null,
        direction: 'OUTGOING',
        messageType: 'TEXT',
        phone: evolutionApi.normalizePhone(phone),
        content: text,
        evolutionMsgId: result.messageId || null,
        status: result.success ? 'SENT' : 'FAILED',
      },
    });

    await prisma.logEntry.create({
      data: {
        clientId: clientId || null,
        tipo: 'WHATSAPP',
        variante: 'INDIVIDUAL',
        resultado: result.success ? 'ENVIADO' : 'ERROR',
        mensaje: text.substring(0, 500),
        telefono: phone,
        modo: 'PRODUCCIÓN',
      },
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

// POST /api/whatsapp/send-media
router.post('/send-media', validateBody(sendMediaSchema), async (req: Request, res: Response) => {
  const { phone, mediaUrl, caption, mediaType, fileName, clientId, operationId } = req.body;

  try {
    const result = await evolutionApi.sendMediaMessage(phone, mediaUrl, caption, mediaType, fileName);

    await prisma.whatsAppMessage.create({
      data: {
        clientId: clientId || null,
        operationId: operationId || null,
        direction: 'OUTGOING',
        messageType: mediaType === 'image' ? 'IMAGE' : 'DOCUMENT',
        phone: evolutionApi.normalizePhone(phone),
        content: caption || null,
        mediaUrl,
        evolutionMsgId: result.messageId || null,
        status: result.success ? 'SENT' : 'FAILED',
      },
    });

    await prisma.logEntry.create({
      data: {
        clientId: clientId || null,
        tipo: 'WHATSAPP',
        variante: 'MEDIA',
        resultado: result.success ? 'ENVIADO' : 'ERROR',
        mensaje: `[${mediaType}] ${caption || fileName || 'sin caption'}`.substring(0, 500),
        telefono: phone,
        modo: 'PRODUCCIÓN',
      },
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
