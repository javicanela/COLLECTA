import { describe, expect, it, vi } from 'vitest';
import { getServiceWorkerRegistrationDecision, registerCollectaServiceWorker } from './pwa';

describe('Collecta PWA registration', () => {
  it('registers the production service worker from the public root', async () => {
    const register = vi.fn().mockResolvedValue(undefined);

    await registerCollectaServiceWorker({
      mode: 'production',
      serviceWorker: { register },
      url: 'http://localhost:5173/registros',
    });

    expect(register).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
  });

  it('skips service worker registration outside production or unsupported browsers', () => {
    expect(getServiceWorkerRegistrationDecision({ mode: 'development', supportsServiceWorker: true }).shouldRegister).toBe(false);
    expect(getServiceWorkerRegistrationDecision({ mode: 'production', supportsServiceWorker: false }).shouldRegister).toBe(false);
    expect(getServiceWorkerRegistrationDecision({ mode: 'production', supportsServiceWorker: true }).shouldRegister).toBe(true);
  });
});
