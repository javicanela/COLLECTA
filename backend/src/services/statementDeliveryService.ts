import type { Client } from '@prisma/client';
import { prisma } from '../lib/prisma';
import * as evolutionApi from './evolutionApi';
import { isEmailConfigured, sendEmailWithAttachment } from './emailDelivery';
import { generateClientStatementPdfBuffer } from './pdfStatementService';
import { storeTemporaryPdf } from './tempFileStorage';

export type DeliveryResult = {
  success: boolean;
  channel: 'WHATSAPP' | 'EMAIL' | 'MANUAL_FALLBACK';
  clientId: string;
  mediaUrl?: string;
  messageId?: string;
  emailMessageId?: string;
  fallbackWaUrl?: string;
  error?: string;
};

type ChannelPreference = 'WHATSAPP' | 'EMAIL' | 'AUTO';

export class StatementDeliveryError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'StatementDeliveryError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function safeErrorCode(error?: string) {
  if (!error) return 'unknown_error';
  if (error.includes('\\') || error.includes('/') || error.includes('apikey') || error.includes('secret')) {
    return 'delivery_error';
  }
  return error.substring(0, 120);
}

function buildCaption(client: Client) {
  return `Estado de cuenta Collecta para ${client.nombre}.`;
}

function buildEmailHtml(client: Client, mediaUrl: string) {
  return `
    <p>Buen dia, ${client.nombre}.</p>
    <p>Adjuntamos su estado de cuenta en PDF.</p>
    <p>Tambien puede consultarlo temporalmente en: <a href="${mediaUrl}">${mediaUrl}</a></p>
  `;
}

function buildFallbackWaUrl(phone: string | null | undefined, client: Client, mediaUrl: string) {
  if (!phone) return undefined;
  const text = `Buen dia, ${client.nombre}. Le compartimos su estado de cuenta: ${mediaUrl}`;
  return `https://wa.me/${evolutionApi.normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

async function logDelivery(params: {
  clientId?: string | null;
  tipo: string;
  variante?: string | null;
  resultado: string;
  mensaje?: string | null;
  telefono?: string | null;
}) {
  await prisma.logEntry.create({
    data: {
      clientId: params.clientId || null,
      tipo: params.tipo,
      variante: params.variante || null,
      resultado: params.resultado,
      mensaje: params.mensaje ? params.mensaje.substring(0, 500) : null,
      telefono: params.telefono || null,
      modo: 'PRODUCCION',
    },
  });
}

async function recordWhatsAppAttempt(params: {
  clientId: string;
  operationId?: string;
  phone: string;
  content: string;
  mediaUrl: string;
  status: 'SENT' | 'FAILED' | 'BLOCKED';
  messageId?: string;
  error?: string;
}) {
  await prisma.whatsAppMessage.create({
    data: {
      clientId: params.clientId,
      operationId: params.operationId || null,
      direction: 'OUTGOING',
      messageType: 'DOCUMENT',
      phone: evolutionApi.normalizePhone(params.phone),
      content: params.content,
      mediaUrl: params.mediaUrl,
      evolutionMsgId: params.messageId || null,
      status: params.status,
    },
  });

  await logDelivery({
    clientId: params.clientId,
    tipo: 'WHATSAPP',
    variante: 'STATEMENT_PDF',
    resultado: params.status === 'SENT' ? 'ENVIADO' : params.status === 'BLOCKED' ? 'BLOQUEADO' : 'ERROR',
    mensaje: params.error || params.content,
    telefono: params.phone,
  });
}

async function resolveClient(params: {
  clientId?: string;
  rfc?: string;
  operationId?: string;
}): Promise<Client> {
  if (params.operationId) {
    const operation = await prisma.operation.findUnique({
      where: { id: params.operationId },
      include: { client: true },
    });
    if (!operation) {
      throw new StatementDeliveryError('OPERATION_NOT_FOUND', 'Operation not found', 404);
    }
    if (!operation.client) {
      throw new StatementDeliveryError('CLIENT_NOT_FOUND', 'Client not found', 404);
    }
    return operation.client;
  }

  if (params.clientId) {
    const client = await prisma.client.findUnique({ where: { id: params.clientId } });
    if (!client) {
      throw new StatementDeliveryError('CLIENT_NOT_FOUND', 'Client not found', 404);
    }
    return client;
  }

  if (params.rfc) {
    const client = await prisma.client.findUnique({ where: { rfc: params.rfc.trim().toUpperCase() } });
    if (!client) {
      throw new StatementDeliveryError('CLIENT_NOT_FOUND', 'Client not found', 404);
    }
    return client;
  }

  throw new StatementDeliveryError('CLIENT_NOT_FOUND', 'Client not found', 404);
}

export async function sendStatementToClient(params: {
  clientId?: string;
  rfc?: string;
  channelPreference?: ChannelPreference;
  operationId?: string;
  requestedBy?: string;
}): Promise<DeliveryResult> {
  const channelPreference = params.channelPreference || 'AUTO';
  const client = await resolveClient(params);

  if (client.estado === 'SUSPENDIDO') {
    await logDelivery({
      clientId: client.id,
      tipo: 'STATEMENT_DELIVERY',
      variante: 'BLOCKED',
      resultado: 'BLOQUEADO',
      mensaje: `Automatic statement blocked for suspended client. requestedBy=${params.requestedBy || 'unknown'}`,
      telefono: client.telefono,
    });
    throw new StatementDeliveryError('CLIENT_SUSPENDED', 'Client suspended', 409);
  }

  const statement = await generateClientStatementPdfBuffer(client.rfc);
  const stored = await storeTemporaryPdf({
    buffer: statement.buffer,
    fileName: statement.fileName,
    contentType: 'application/pdf',
  });

  const wantsWhatsApp = channelPreference === 'AUTO' || channelPreference === 'WHATSAPP';
  const wantsEmail = channelPreference === 'AUTO' || channelPreference === 'EMAIL';
  const caption = buildCaption(client);

  if (wantsWhatsApp && client.telefono) {
    if (!evolutionApi.isConfigured()) {
      await recordWhatsAppAttempt({
        clientId: client.id,
        operationId: params.operationId,
        phone: client.telefono,
        content: caption,
        mediaUrl: stored.url,
        status: 'FAILED',
        error: 'evolution_not_configured',
      });
    } else {
      const result = await evolutionApi.sendMediaMessage(
        client.telefono,
        stored.url,
        caption,
        'document',
        statement.fileName,
      );

      await recordWhatsAppAttempt({
        clientId: client.id,
        operationId: params.operationId,
        phone: client.telefono,
        content: caption,
        mediaUrl: stored.url,
        status: result.success ? 'SENT' : 'FAILED',
        messageId: result.messageId,
        error: result.success ? undefined : safeErrorCode(result.error),
      });

      if (result.success) {
        return {
          success: true,
          channel: 'WHATSAPP',
          clientId: client.id,
          mediaUrl: stored.url,
          messageId: result.messageId,
        };
      }
    }
  }

  if (wantsEmail && client.email && isEmailConfigured()) {
    const result = await sendEmailWithAttachment({
      to: client.email,
      subject: `Estado de cuenta - ${client.nombre}`,
      html: buildEmailHtml(client, stored.url),
      attachment: {
        fileName: statement.fileName,
        contentType: 'application/pdf',
        buffer: statement.buffer,
      },
    });

    await logDelivery({
      clientId: client.id,
      tipo: 'EMAIL',
      variante: 'STATEMENT_PDF',
      resultado: result.success ? 'ENVIADO' : 'ERROR',
      mensaje: result.success ? `Statement sent to ${client.email}` : safeErrorCode(result.error),
      telefono: client.telefono,
    });

    if (result.success) {
      return {
        success: true,
        channel: 'EMAIL',
        clientId: client.id,
        mediaUrl: stored.url,
        emailMessageId: result.messageId,
      };
    }
  }

  const fallbackWaUrl = buildFallbackWaUrl(client.telefono, client, stored.url);
  await logDelivery({
    clientId: client.id,
    tipo: 'STATEMENT_DELIVERY',
    variante: 'MANUAL_FALLBACK',
    resultado: 'FALLBACK',
    mensaje: fallbackWaUrl ? 'Manual WhatsApp fallback generated' : 'Manual PDF fallback generated',
    telefono: client.telefono,
  });

  return {
    success: false,
    channel: 'MANUAL_FALLBACK',
    clientId: client.id,
    mediaUrl: stored.url,
    fallbackWaUrl,
    error: 'automatic_channels_unavailable',
  };
}
