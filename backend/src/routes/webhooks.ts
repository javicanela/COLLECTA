import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { normalizePhone } from '../services/evolutionApi';
import { correlateIncomingWhatsAppPaymentConfirmation } from '../services/paymentDetection';
import axios from 'axios';

const router = Router();

const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET || '';
const PAYMENT_DETECTION_WEBHOOK_URL = process.env.PAYMENT_DETECTION_WEBHOOK_URL || '';
const PAYMENT_DETECTION_WEBHOOK_TOKEN = process.env.PAYMENT_DETECTION_WEBHOOK_TOKEN || '';

let warnedEmptySecret = false;
function verifyWebhookSecret(req: Request, res: Response, next: import('express').NextFunction) {
  if (!WEBHOOK_SECRET) {
    if (!warnedEmptySecret && process.env.NODE_ENV === 'production') {
      warnedEmptySecret = true;
      console.warn('[webhooks] WARNING: WEBHOOK_SECRET vacio en produccion');
    }
    next();
    return;
  }
  const secret = req.headers['x-webhook-secret'];
  if (secret !== WEBHOOK_SECRET) {
    res.status(403).json({ error: 'Invalid webhook secret' });
    return;
  }
  next();
}

// POST /api/webhooks/evolution
// Receives incoming messages from Evolution API
router.post('/evolution', verifyWebhookSecret, async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const event = payload.event;

    // Only process incoming messages
    if (event !== 'messages.upsert') {
      res.json({ received: true, processed: false, reason: 'event_ignored' });
      return;
    }

    const message = payload.data;
    if (!message || message.key?.fromMe) {
      res.json({ received: true, processed: false, reason: 'outgoing_or_empty' });
      return;
    }

    const remoteJid = message.key?.remoteJid || '';
    const phone = remoteJid.replace(/@.*/, '').replace(/\D/g, '');

    if (!phone) {
      res.json({ received: true, processed: false, reason: 'no_phone' });
      return;
    }

    const evolutionId = message.key?.id || null;
    if (evolutionId) {
      const existing = await prisma.whatsAppMessage.findFirst({
        where: { evolutionMsgId: evolutionId, direction: 'INCOMING' },
        select: { id: true },
      });
      if (existing) {
        res.json({ received: true, processed: false, reason: 'duplicate_message' });
        return;
      }
    }

    // Determine message type and content
    let messageType = 'TEXT';
    let content: string | null = null;
    let mediaUrl: string | null = null;

    if (message.message?.conversation) {
      content = message.message.conversation;
    } else if (message.message?.extendedTextMessage?.text) {
      content = message.message.extendedTextMessage.text;
    } else if (message.message?.imageMessage) {
      messageType = 'IMAGE';
      content = message.message.imageMessage.caption || null;
      mediaUrl = message.message.imageMessage.url || null;
    } else if (message.message?.documentMessage) {
      messageType = 'DOCUMENT';
      content = message.message.documentMessage.fileName || null;
      mediaUrl = message.message.documentMessage.url || null;
    }

    // Look up client by phone
    const normalizedPhone = normalizePhone(phone);
    const client = await prisma.client.findFirst({
      where: {
        telefono: { contains: phone.slice(-10) },
      },
    });

    const incomingMessageRow = await prisma.whatsAppMessage.create({
      data: {
        clientId: client?.id || null,
        direction: 'INCOMING',
        messageType,
        phone: normalizedPhone,
        content,
        mediaUrl,
        evolutionMsgId: message.key?.id || null,
        status: 'RECEIVED',
      },
    });

    // Log the incoming message
    await prisma.logEntry.create({
      data: {
        clientId: client?.id || null,
        tipo: 'INCOMING',
        variante: messageType,
        resultado: 'RECIBIDO',
        mensaje: content?.substring(0, 500) || `[${messageType}]`,
        telefono: phone,
        modo: 'PRODUCCIÓN',
      },
    });

    const paymentCorrelation = content
      ? await correlateIncomingWhatsAppPaymentConfirmation(prisma, {
        phone: normalizedPhone,
        text: content,
        sourceMessageId: message.key?.id || null,
      })
      : null;

    if (incomingMessageRow && paymentCorrelation) {
      const statusMap: Record<string, string> = {
        ACCEPTED: 'PAYMENT_MATCHED',
        DUPLICATE: 'DUPLICATE',
        REVIEW_REQUIRED: 'REVIEW_REQUIRED',
      };
      const newStatus = statusMap[paymentCorrelation.status];
      if (newStatus) {
        await prisma.whatsAppMessage.update({
          where: { id: incomingMessageRow.id },
          data: { status: newStatus },
        });
      }
    }

    // Forward receipt-like messages to the provider-agnostic payment flow.
    if (PAYMENT_DETECTION_WEBHOOK_URL && (mediaUrl || content)) {
      try {
        await axios.post(PAYMENT_DETECTION_WEBHOOK_URL, {
          phone,
          clientId: client?.id || null,
          clientRfc: client?.rfc || null,
          clientName: client?.nombre || null,
          messageType,
          mediaUrl,
          text: content,
          caption: content,
          messageId: message.key?.id,
        }, {
          timeout: 10000,
          headers: PAYMENT_DETECTION_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${PAYMENT_DETECTION_WEBHOOK_TOKEN}` }
            : undefined,
        });
      } catch {
        // Payment detection is best-effort; don't fail the webhook
      }
    }

    res.json({
      received: true,
      processed: true,
      messageType,
      clientMatched: !!client,
      paymentCorrelation: paymentCorrelation
        ? {
          status: paymentCorrelation.status,
          operationId: paymentCorrelation.operationId || null,
          reasons: paymentCorrelation.reasons,
          confidence: paymentCorrelation.confidence,
        }
        : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error processing webhook', details: error.message });
  }
});

export default router;
