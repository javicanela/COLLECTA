import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const upload = vi.fn();
  const createSignedUrl = vi.fn();
  const from = vi.fn(() => ({
    upload,
    createSignedUrl,
  }));
  const createClient = vi.fn(() => ({
    storage: { from },
  }));
  return { upload, createSignedUrl, from, createClient };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

describe('temporary PDF storage', () => {
  const originalProvider = process.env.TEMP_PDF_STORAGE_PROVIDER;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalBucket = process.env.SUPABASE_STORAGE_BUCKET;
  const originalTtl = process.env.TEMP_PDF_TTL_MS;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.test/signed-statement.pdf' },
      error: null,
    });
    process.env.TEMP_PDF_STORAGE_PROVIDER = 'supabase';
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_STORAGE_BUCKET = 'statement-pdfs';
    process.env.TEMP_PDF_TTL_MS = '60000';
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.TEMP_PDF_STORAGE_PROVIDER;
    else process.env.TEMP_PDF_STORAGE_PROVIDER = originalProvider;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    if (originalBucket === undefined) delete process.env.SUPABASE_STORAGE_BUCKET;
    else process.env.SUPABASE_STORAGE_BUCKET = originalBucket;
    if (originalTtl === undefined) delete process.env.TEMP_PDF_TTL_MS;
    else process.env.TEMP_PDF_TTL_MS = originalTtl;
  });

  it('stores temporary statement PDFs in a private Supabase bucket when configured', async () => {
    const { storeTemporaryPdf } = await import('../services/tempFileStorage');

    const result = await storeTemporaryPdf({
      organizationId: 'org-001',
      buffer: Buffer.from('%PDF-1.4'),
      fileName: 'estado cuenta.pdf',
      contentType: 'application/pdf',
    });

    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      expect.objectContaining({
        auth: expect.objectContaining({ persistSession: false }),
      }),
    );
    expect(mocks.from).toHaveBeenCalledWith('statement-pdfs');
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^organizations\/org-001\/statements\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{48}-estado_cuenta\.pdf$/),
      Buffer.from('%PDF-1.4'),
      expect.objectContaining({
        contentType: 'application/pdf',
        upsert: false,
      }),
    );
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^organizations\/org-001\/statements\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{48}-estado_cuenta\.pdf$/),
      60,
      expect.objectContaining({ download: 'estado_cuenta.pdf' }),
    );
    expect(result).toMatchObject({
      url: 'https://supabase.test/signed-statement.pdf',
      storageProvider: 'supabase-storage',
    });
  });
});
