import { describe, expect, it } from 'vitest';
import { getExternalAuthProviderStatus } from './externalAuthProvider';

describe('external auth provider status', () => {
  it('keeps Supabase unavailable until the client env vars are configured', () => {
    const status = getExternalAuthProviderStatus({
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    });

    expect(status).toMatchObject({
      id: 'supabase',
      configured: false,
      available: false,
    });
  });

  it('marks Supabase available when URL and anon key are present', () => {
    const status = getExternalAuthProviderStatus({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    });

    expect(status).toMatchObject({
      id: 'supabase',
      configured: true,
      available: true,
    });
  });
});
