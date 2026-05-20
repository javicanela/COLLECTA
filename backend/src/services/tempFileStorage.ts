import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type StoredTemporaryFile = {
  filePath: string;
  fileName: string;
  contentType: string;
  expiresAt: Date;
};

type TemporaryFileLookup =
  | { status: 'found'; file: StoredTemporaryFile }
  | { status: 'not_found' }
  | { status: 'expired' };

const temporaryFiles = new Map<string, StoredTemporaryFile>();
const storageRoot = path.join(process.cwd(), 'tmp', 'generated-pdfs');
let cachedSupabaseClient: SupabaseClient | null = null;
let cachedSupabaseKey = '';

function getTtlMs() {
  const parsed = Number(process.env.TEMP_PDF_TTL_MS);
  return Number.isFinite(parsed) ? parsed : 15 * 60 * 1000;
}

function getPublicApiRoot() {
  const configured =
    process.env.BACKEND_PUBLIC_URL ||
    process.env.PUBLIC_API_BASE_URL ||
    process.env.COLLECTA_API_PUBLIC_URL ||
    process.env.COLLECTA_API_URL;
  const root = configured || `http://localhost:${process.env.PORT || 3001}`;
  return root.replace(/\/+$/, '').replace(/\/api$/, '');
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getStorageProvider() {
  const value = (process.env.TEMP_PDF_STORAGE_PROVIDER || 'auto').trim().toLowerCase();
  return value === 'supabase' || value === 'local' ? value : 'auto';
}

function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || 'statement-pdfs').trim();

  if (!url || !serviceRoleKey || !bucket) {
    return null;
  }

  return { url, serviceRoleKey, bucket };
}

function getSupabaseClient(url: string, serviceRoleKey: string) {
  const key = `${url}:${serviceRoleKey}`;
  if (!cachedSupabaseClient || cachedSupabaseKey !== key) {
    cachedSupabaseClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedSupabaseKey = key;
  }
  return cachedSupabaseClient;
}

function storagePathFor(params: {
  organizationId?: string;
  token: string;
  fileName: string;
}) {
  const organizationId = safeFileName(params.organizationId || 'default');
  const today = new Date().toISOString().slice(0, 10);
  return `organizations/${organizationId}/statements/${today}/${params.token}-${params.fileName}`;
}

async function storeSupabasePdf(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  organizationId?: string;
}): Promise<{
  url: string;
  expiresAt: Date;
  storageProvider: string;
}> {
  const token = crypto.randomBytes(24).toString('hex');
  const fileName = safeFileName(params.fileName);
  const expiresAt = new Date(Date.now() + getTtlMs());
  const config = getSupabaseStorageConfig();

  if (!config) {
    throw new Error('supabase_storage_not_configured');
  }

  const objectPath = storagePathFor({
    organizationId: params.organizationId,
    token,
    fileName,
  });
  const storage = getSupabaseClient(config.url, config.serviceRoleKey).storage.from(config.bucket);

  const upload = await storage.upload(objectPath, params.buffer, {
    contentType: params.contentType,
    upsert: false,
  });
  if (upload.error) {
    throw upload.error;
  }

  const ttlSeconds = Math.max(1, Math.ceil(getTtlMs() / 1000));
  const signed = await storage.createSignedUrl(objectPath, ttlSeconds, {
    download: fileName,
  });
  if (signed.error || !signed.data?.signedUrl) {
    throw signed.error || new Error('supabase_signed_url_failed');
  }

  return {
    url: signed.data.signedUrl,
    expiresAt,
    storageProvider: 'supabase-storage',
  };
}

async function storeLocalTemporaryPdf(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}): Promise<{
  url: string;
  expiresAt: Date;
  storageProvider: string;
}> {
  await fs.mkdir(storageRoot, { recursive: true });

  const token = crypto.randomBytes(24).toString('hex');
  const fileName = safeFileName(params.fileName);
  const filePath = path.join(storageRoot, `${token}-${fileName}`);
  const expiresAt = new Date(Date.now() + getTtlMs());

  await fs.writeFile(filePath, params.buffer);
  temporaryFiles.set(token, {
    filePath,
    fileName,
    contentType: params.contentType,
    expiresAt,
  });

  return {
    url: `${getPublicApiRoot()}/api/cobranza/media/${token}`,
    expiresAt,
    storageProvider: 'local-temp',
  };
}

export async function storeTemporaryPdf(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  organizationId?: string;
}): Promise<{
  url: string;
  expiresAt: Date;
  storageProvider: string;
}> {
  const provider = getStorageProvider();

  if (provider === 'supabase') {
    return storeSupabasePdf(params);
  }

  if (provider === 'auto' && getSupabaseStorageConfig()) {
    return storeSupabasePdf(params);
  }

  return storeLocalTemporaryPdf(params);
}

export async function getTemporaryPdf(token: string): Promise<TemporaryFileLookup> {
  const file = temporaryFiles.get(token);
  if (!file) {
    return { status: 'not_found' };
  }

  if (file.expiresAt.getTime() <= Date.now()) {
    temporaryFiles.delete(token);
    await fs.rm(file.filePath, { force: true }).catch(() => {});
    return { status: 'expired' };
  }

  return { status: 'found', file };
}
