const net = require('node:net');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_TIMEOUT_MS = 45_000;
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

function fail(message, details = []) {
  console.error(`\n[test-db] ${message}`);
  for (const detail of details) {
    console.error(`[test-db] ${detail}`);
  }
  process.exit(1);
}

function isSafeTestDatabase(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, '')).toLowerCase();
  const username = decodeURIComponent(parsed.username || '').toLowerCase();
  const marker = `${host} ${databaseName} ${username}`;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

  if (PROD_HOST_PATTERNS.some(pattern => host.includes(pattern))) {
    return false;
  }

  return (
    localHosts.has(host) ||
    /(^|[^a-z0-9])(test|e2e|local)([^a-z0-9]|$)/.test(marker) ||
    marker.includes('_test') ||
    marker.includes('-test')
  );
}

function parseDatabaseTarget() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail('DATABASE_URL is required for integration tests.', [
      'Copy backend/.env.test.example to backend/.env.test, or export a safe test DATABASE_URL.',
    ]);
  }

  if (!isSafeTestDatabase(databaseUrl)) {
    fail('Refusing to prepare a database URL that does not look like test/local/e2e.', [
      'Use a local or clearly marked test database for integration tests.',
    ]);
  }

  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
  };
}

function canConnect(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    function done(result) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    }

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

function dockerIsAvailable() {
  const result = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    timeout: 10_000,
  });
  return result.status === 0;
}

async function waitForDatabase(host, port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(host, port, 1000)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function main() {
  if (process.env.SKIP_TEST_DB_PREPARE === '1') {
    console.log('[test-db] SKIP_TEST_DB_PREPARE=1; skipping database preparation.');
    return;
  }

  const { host, port } = parseDatabaseTarget();
  if (await canConnect(host, port)) {
    console.log(`[test-db] PostgreSQL is reachable at ${host}:${port}.`);
    return;
  }

  const repoRoot = path.resolve(__dirname, '..', '..');
  const composeFile = path.join(repoRoot, 'docker-compose.test.yml');

  if (!dockerIsAvailable()) {
    fail(`PostgreSQL is not reachable at ${host}:${port}, and Docker is not available.`, [
      'Open Docker Desktop and wait until the engine is running.',
      'Then rerun: cd backend; npm run test:prepare',
      'If you do not use Docker, start a local PostgreSQL matching backend/.env.test.',
    ]);
  }

  console.log('[test-db] PostgreSQL is not reachable; starting docker-compose.test.yml postgres service...');
  const compose = run('docker', ['compose', '-f', composeFile, 'up', '-d', 'postgres'], {
    cwd: repoRoot,
    timeout: 60_000,
  });

  if (compose.status !== 0) {
    fail('docker compose could not start the test PostgreSQL service.', [
      'Check Docker Desktop status, port 5432 availability, and docker-compose.test.yml.',
    ]);
  }

  const ready = await waitForDatabase(host, port, DEFAULT_TIMEOUT_MS);
  if (!ready) {
    fail(`Timed out waiting for PostgreSQL at ${host}:${port}.`, [
      'Run: docker compose -f docker-compose.test.yml ps',
      'Check whether port 5432 is already occupied or the container is unhealthy.',
    ]);
  }

  console.log(`[test-db] PostgreSQL is ready at ${host}:${port}.`);
}

main().catch((error) => {
  fail(error?.message || 'Unexpected test database preparation error.');
});
