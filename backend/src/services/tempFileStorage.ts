import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';

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

export async function storeTemporaryPdf(params: {
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
