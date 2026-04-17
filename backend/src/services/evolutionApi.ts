import axios, { AxiosInstance } from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'collecta';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

function getClient(): AxiosInstance {
  if (!EVOLUTION_API_URL) {
    throw new Error('EVOLUTION_API_URL no configurada');
  }
  return axios.create({
    baseURL: EVOLUTION_API_URL,
    headers: { apikey: EVOLUTION_API_KEY },
    timeout: 15000,
  });
}

export function normalizePhone(phone: string): string {
  let tel = phone.replace(/\D/g, '');
  if (!tel.startsWith('52')) tel = '52' + tel;
  return tel;
}

export function isConfigured(): boolean {
  return !!(EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE);
}

export interface ConnectionState {
  connected: boolean;
  instance: string;
  state: string;
}

export async function getConnectionState(): Promise<ConnectionState> {
  const client = getClient();
  const { data } = await client.get(`/instance/connectionState/${EVOLUTION_INSTANCE}`);
  return {
    connected: data?.instance?.state === 'open',
    instance: EVOLUTION_INSTANCE,
    state: data?.instance?.state || 'unknown',
  };
}

export interface SendTextResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendTextMessage(phone: string, text: string): Promise<SendTextResult> {
  const client = getClient();
  const number = normalizePhone(phone);
  try {
    const { data } = await client.post(`/message/sendText/${EVOLUTION_INSTANCE}`, {
      number,
      text,
    });
    return {
      success: true,
      messageId: data?.key?.id || data?.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.response?.data?.message || err.message,
    };
  }
}

export interface SendMediaResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendMediaMessage(
  phone: string,
  mediaUrl: string,
  caption: string,
  mediaType: 'image' | 'document' | 'video' = 'document',
  fileName?: string,
): Promise<SendMediaResult> {
  const client = getClient();
  const number = normalizePhone(phone);
  try {
    const { data } = await client.post(`/message/sendMedia/${EVOLUTION_INSTANCE}`, {
      number,
      mediatype: mediaType,
      media: mediaUrl,
      caption,
      ...(fileName && { fileName }),
    });
    return {
      success: true,
      messageId: data?.key?.id || data?.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.response?.data?.message || err.message,
    };
  }
}
