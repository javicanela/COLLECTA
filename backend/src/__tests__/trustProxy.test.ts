import express from 'express';
import { describe, expect, it } from 'vitest';
import { configureTrustProxy, parseTrustProxySetting } from '../lib/trustProxy';

describe('trust proxy configuration', () => {
  it('enables one trusted proxy for Render production when TRUST_PROXY is not explicit', () => {
    const app = express();

    configureTrustProxy(app, {
      isProduction: true,
      trustProxyEnv: undefined,
      renderEnv: 'true',
    });

    expect(app.get('trust proxy')).toBe(1);
  });

  it('keeps trust proxy disabled for local development by default', () => {
    const app = express();

    configureTrustProxy(app, {
      isProduction: false,
      trustProxyEnv: undefined,
      renderEnv: undefined,
    });

    expect(app.get('trust proxy')).toBe(false);
  });

  it('honors explicit TRUST_PROXY values', () => {
    expect(parseTrustProxySetting('true')).toBe(true);
    expect(parseTrustProxySetting('false')).toBe(false);
    expect(parseTrustProxySetting('2')).toBe(2);
    expect(parseTrustProxySetting('loopback')).toBe('loopback');
  });
});
