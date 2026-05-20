import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('api browser authentication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'http://api.test/api');
    vi.stubEnv('VITE_API_KEY', 'browser-secret-must-not-be-sent');
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not send VITE_API_KEY as a browser bearer token when no user token exists', async () => {
    const { api } = await import('./api');

    await api.get('/probe');

    expect(fetch).toHaveBeenCalledWith('http://api.test/api/probe', expect.objectContaining({
      headers: expect.not.objectContaining({
        Authorization: expect.stringContaining('browser-secret-must-not-be-sent'),
      }),
    }));
  });

  it('does not fall back to the expired Railway backend in production builds', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('PROD', true);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));

    const { api } = await import('./api');

    await api.get('/probe');

    expect(fetch).toHaveBeenCalledWith('/api/probe', expect.any(Object));
  });
});
