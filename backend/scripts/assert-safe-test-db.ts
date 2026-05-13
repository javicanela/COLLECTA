/**
 * Guard that refuses to run destructive DB operations against anything that
 * looks like a production database. Designed to be imported (pure function)
 * and also run as a CLI (`ts-node backend/scripts/assert-safe-test-db.ts`).
 */

export interface TestDbSafetyResult {
  safe: boolean;
  reason: string;
  host: string | null;
  database: string | null;
}

const PROD_HOST_PATTERNS = [
  'neon.tech',
  'neon.db',
  'railway.app',
  'supabase.co',
  'supabase.in',
  'heroku',
  'amazonaws.com',
  'rds.amazonaws',
  'azure.com',
  'azurewebsites',
  'render.com',
  'render.app',
  'vercel.app',
  'planetscale',
];

const ALLOWED_LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'collecta-test-postgres',
  'postgres',
  'db',
]);

function looksLikeProduction(host: string): boolean {
  const lower = host.toLowerCase();
  return PROD_HOST_PATTERNS.some(pattern => lower.includes(pattern));
}

function hasTestMarker(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    /(^|[^a-z0-9])(test|e2e|local)([^a-z0-9]|$)/.test(lower) ||
    lower.includes('_test') ||
    lower.includes('-test')
  );
}

export function evaluateTestDbSafety(
  url: string,
  env: NodeJS.ProcessEnv
): TestDbSafetyResult {
  if (!url || url.trim().length === 0) {
    return {
      safe: false,
      reason: 'DATABASE_URL is empty',
      host: null,
      database: null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      safe: false,
      reason: 'DATABASE_URL is not a valid URL',
      host: null,
      database: null,
    };
  }

  const host = parsed.hostname.toLowerCase();
  const database = decodeURIComponent(
    parsed.pathname.replace(/^\//, '')
  ).toLowerCase();
  const username = decodeURIComponent(parsed.username || '').toLowerCase();
  const marker = `${host} ${database} ${username}`;

  if (looksLikeProduction(host)) {
    return {
      safe: false,
      reason: `Host "${host}" matches a known production provider pattern`,
      host,
      database,
    };
  }

  const isAllowedLocalHost = ALLOWED_LOCAL_HOSTS.has(host);
  const isMarkedTest = hasTestMarker(marker) || env.NODE_ENV === 'test';

  if (!isAllowedLocalHost && !isMarkedTest) {
    return {
      safe: false,
      reason: `Host "${host}" is not an allowed local host and the URL has no test marker (test, e2e, local, _test, -test)`,
      host,
      database,
    };
  }

  const reasonParts: string[] = [];
  if (isAllowedLocalHost) reasonParts.push(`host "${host}" is local`);
  if (isMarkedTest) reasonParts.push('URL or NODE_ENV is marked as test');

  return {
    safe: true,
    reason: reasonParts.join('; ') || 'OK',
    host,
    database,
  };
}

export function assertSafeTestDbOrExit(
  url: string | undefined,
  env: NodeJS.ProcessEnv,
  logger: { log: (msg: string) => void; error: (msg: string) => void } = console
): TestDbSafetyResult {
  const result = evaluateTestDbSafety(url ?? '', env);
  if (!result.safe) {
    logger.error(`[assert-safe-test-db] ABORT: ${result.reason}`);
    process.exit(2);
  }
  logger.log(
    `[assert-safe-test-db] OK - host=${result.host} db=${result.database} reason=${result.reason}`
  );
  return result;
}

if (require.main === module) {
  assertSafeTestDbOrExit(process.env.DATABASE_URL, process.env);
}
