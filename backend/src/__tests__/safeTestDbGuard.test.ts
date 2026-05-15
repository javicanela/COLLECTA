import { describe, it, expect } from 'vitest';
import { evaluateTestDbSafety } from '../lib/dbSafety';

describe('evaluateTestDbSafety', () => {
  const testEnv = { NODE_ENV: 'test' };
  const devEnv = { NODE_ENV: 'development' };
  const prodEnv = { NODE_ENV: 'production' };

  it('rejects empty URL', () => {
    const r = evaluateTestDbSafety('', testEnv);
    expect(r.safe).toBe(false);
    expect(r.reason).toContain('empty');
  });

  it('rejects invalid URL syntax', () => {
    const r = evaluateTestDbSafety('not-a-url', testEnv);
    expect(r.safe).toBe(false);
    expect(r.reason).toContain('valid URL');
  });

  it('rejects Neon production URL', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@db.neon.tech:5432/prod', testEnv);
    expect(r.safe).toBe(false);
    expect(r.reason).toContain('production provider');
  });

  it('rejects Railway production URL', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@railway.app:5432/prod', testEnv);
    expect(r.safe).toBe(false);
  });

  it('rejects unknown host without test marker', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@some-random-host.com:5432/db', prodEnv);
    expect(r.safe).toBe(false);
    expect(r.reason).toContain('allowed local host');
  });

  it('rejects unknown host without test marker even when NODE_ENV=test', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@some-random-host.com:5432/db', testEnv);
    expect(r.safe).toBe(false);
    expect(r.reason).toContain('allowed local host');
  });

  it('accepts localhost URL', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@localhost:5432/collecta_test', testEnv);
    expect(r.safe).toBe(true);
  });

  it('accepts 127.0.0.1 URL', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@127.0.0.1:5432/collecta_test', testEnv);
    expect(r.safe).toBe(true);
  });

  it('accepts collecta-test-postgres Docker host', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@collecta-test-postgres:5432/collecta_test', testEnv);
    expect(r.safe).toBe(true);
  });

  it('accepts postgres Docker service host', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@postgres:5432/collecta_test', testEnv);
    expect(r.safe).toBe(true);
  });

  it('accepts URL with test in path when NODE_ENV=test', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@somehost:5432/my_test_db', testEnv);
    expect(r.safe).toBe(true);
  });

  it('accepts safe URL in development mode', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@localhost:5432/collecta_dev', devEnv);
    expect(r.safe).toBe(true);
  });

  it('rejects production host even in test env', () => {
    const r = evaluateTestDbSafety('postgresql://user:pass@db.neon.tech:5432/test', testEnv);
    expect(r.safe).toBe(false);
  });
});
