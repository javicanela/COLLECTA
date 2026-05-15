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

function hasTestMarker(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    /(^|[^a-z0-9])(test|e2e|local)([^a-z0-9]|$)/.test(lower) ||
    lower.includes('_test') ||
    lower.includes('-test')
  );
}

function looksLikeProductionHost(host: string): boolean {
  const lower = host.toLowerCase();
  return PROD_HOST_PATTERNS.some(pattern => lower.includes(pattern));
}

export function evaluateTestDbSafety(
  url: string,
  env: { NODE_ENV?: string } = process.env,
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
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, '')).toLowerCase();
  const username = decodeURIComponent(parsed.username || '').toLowerCase();
  const markerSource = `${host} ${database} ${username}`;

  if (looksLikeProductionHost(host)) {
    return {
      safe: false,
      reason: `Host "${host}" matches a known production provider pattern`,
      host,
      database,
    };
  }

  const isAllowedLocalHost = ALLOWED_LOCAL_HOSTS.has(host);
  const isMarkedTest = hasTestMarker(markerSource);

  if (!isAllowedLocalHost && !isMarkedTest) {
    return {
      safe: false,
      reason: `Host "${host}" is not an allowed local host and the URL has no test marker`,
      host,
      database,
    };
  }

  const reasonParts: string[] = [];
  if (isAllowedLocalHost) reasonParts.push(`host "${host}" is local`);
  if (isMarkedTest) reasonParts.push('URL is marked as test/local');

  return {
    safe: true,
    reason: reasonParts.join('; ') || 'DB is safe for local destructive test operations',
    host,
    database,
  };
}
