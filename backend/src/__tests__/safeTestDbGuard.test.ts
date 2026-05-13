import { describe, it, expect } from 'vitest';
import { evaluateTestDbSafety } from '../../scripts/assert-safe-test-db';

function makeEnv(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { ...extra } as NodeJS.ProcessEnv;
}

describe('evaluateTestDbSafety', () => {
  it('rejects empty DATABASE_URL', () => {
    const result = evaluateTestDbSafety('', makeEnv());
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/empty/i);
  });

  it('rejects malformed URLs', () => {
    const result = evaluateTestDbSafety('not-a-url', makeEnv());
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/valid url/i);
  });

  it('accepts localhost', () => {
    const result = evaluateTestDbSafety(
      'postgresql://user:pass@localhost:5432/collecta',
      makeEnv()
    );
    expect(result.safe).toBe(true);
    expect(result.host).toBe('localhost');
  });

  it('accepts 127.0.0.1', () => {
    const result = evaluateTestDbSafety(
      'postgresql://postgres:postgres@127.0.0.1:5432/collecta_test',
      makeEnv()
    );
    expect(result.safe).toBe(true);
    expect(result.host).toBe('127.0.0.1');
  });

  it('accepts docker hostname collecta-test-postgres', () => {
    const result = evaluateTestDbSafety(
      'postgresql://postgres:postgres@collecta-test-postgres:5432/collecta',
      makeEnv()
    );
    expect(result.safe).toBe(true);
  });

  it('rejects Neon production hostnames', () => {
    const result = evaluateTestDbSafety(
      'postgresql://user:pass@ep-fancy-thing-12345.us-east-2.aws.neon.tech/collecta',
      makeEnv()
    );
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/production/i);
  });

  it('rejects Supabase hostnames', () => {
    const result = evaluateTestDbSafety(
      'postgresql://postgres:pass@db.abcdef.supabase.co:5432/postgres',
      makeEnv()
    );
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/production/i);
  });

  it('rejects Railway hostnames', () => {
    const result = evaluateTestDbSafety(
      'postgresql://postgres:pass@containers-us-west-1.railway.app:6543/railway',
      makeEnv()
    );
    expect(result.safe).toBe(false);
  });

  it('rejects RDS hostnames', () => {
    const result = evaluateTestDbSafety(
      'postgresql://admin:pass@prod-db.cluster-abc.us-east-1.rds.amazonaws.com:5432/main',
      makeEnv()
    );
    expect(result.safe).toBe(false);
  });

  it('accepts remote host when name carries test marker', () => {
    const result = evaluateTestDbSafety(
      'postgresql://user:pass@example.internal:5432/collecta_test',
      makeEnv()
    );
    expect(result.safe).toBe(true);
  });

  it('accepts remote host when NODE_ENV is test', () => {
    const result = evaluateTestDbSafety(
      'postgresql://user:pass@example.internal:5432/anonymous',
      makeEnv({ NODE_ENV: 'test' })
    );
    expect(result.safe).toBe(true);
  });

  it('rejects remote host with no test marker and no NODE_ENV=test', () => {
    const result = evaluateTestDbSafety(
      'postgresql://user:pass@example.internal:5432/anonymous',
      makeEnv({ NODE_ENV: 'production' })
    );
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/not an allowed local host/i);
  });

  it('accepts URL containing "test" segment in DB name', () => {
    const result = evaluateTestDbSafety(
      'postgresql://user:pass@db.private.local:5432/myapp-test',
      makeEnv()
    );
    expect(result.safe).toBe(true);
  });
});
