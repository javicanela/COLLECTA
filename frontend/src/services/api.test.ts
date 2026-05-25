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

  it('clears the stored session and notifies the app when the API returns 401', async () => {
    const removeItem = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'expired-token'),
      removeItem,
    });
    vi.stubGlobal('window', {
      dispatchEvent,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Token expirado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })));

    const { api } = await import('./api');

    await expect(api.get('/protected')).rejects.toThrow('Token expirado');
    expect(removeItem).toHaveBeenCalledWith('collecta-token');
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'collecta:session-expired' }));
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
