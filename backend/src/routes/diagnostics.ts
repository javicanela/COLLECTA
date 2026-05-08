import { promises as fs } from 'fs';
import path from 'path';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import n8nRoutes from './n8n';
import whatsappRoutes from './whatsapp';
import cobranzaRoutes from './cobranza';

type CheckStatus = 'ok' | 'warning' | 'error';

type ReadinessCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  method?: string;
  path?: string;
  action?: string;
  checkedAt: string;
};

const router = Router();

const EXPECTED_N8N_WORKFLOWS = [
  '01_reporte_diario_cartera.json',
  '02_cobranza_automatica_whatsapp.json',
  '03_deteccion_pagos_gemini_vision.json',
  '04_cobranza_email_pdf.json',
];

const ROUTE_CHECKS = [
  {
    key: 'pendingCollections',
    method: 'GET',
    publicPath: '/api/n8n/pending-collections',
    routePath: '/pending-collections',
    sourceRouter: n8nRoutes,
  },
  {
    key: 'whatsapp',
    method: 'GET',
    publicPath: '/api/whatsapp/status',
    routePath: '/status',
    sourceRouter: whatsappRoutes,
  },
  {
    key: 'sendStatement',
    method: 'POST',
    publicPath: '/api/cobranza/cliente/:rfc/send-statement',
    routePath: '/cliente/:rfc/send-statement',
    sourceRouter: cobranzaRoutes,
  },
  {
    key: 'paymentDetection',
    method: 'POST',
    publicPath: '/api/n8n/payment-detections',
    routePath: '/payment-detections',
    sourceRouter: n8nRoutes,
  },
] as const;

function routerHasRoute(sourceRouter: Router, method: string, routePath: string): boolean {
  const stack = (sourceRouter as any).stack;
  if (!Array.isArray(stack)) return false;

  return stack.some((layer: any) => {
    const route = layer.route;
    return route?.path === routePath && Boolean(route.methods?.[method.toLowerCase()]);
  });
}

function routeChecks(checkedAt: string): ReadinessCheck[] {
  return ROUTE_CHECKS.map(route => {
    const available = routerHasRoute(route.sourceRouter, route.method, route.routePath);
    return {
      id: route.key,
      label: route.publicPath,
      status: available ? 'ok' : 'error',
      message: available ? 'Backend route is registered.' : 'Backend route is not registered.',
      method: route.method,
      path: route.publicPath,
      action: available ? undefined : `Register ${route.method} ${route.publicPath}.`,
      checkedAt,
    };
  });
}

function workflowDirectoryCandidates() {
  return [
    path.resolve(process.cwd(), 'n8n', 'workflows'),
    path.resolve(process.cwd(), '..', 'n8n', 'workflows'),
    path.resolve(__dirname, '..', '..', '..', 'n8n', 'workflows'),
  ];
}

async function findWorkflowDirectory() {
  for (const candidate of workflowDirectoryCandidates()) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // Try the next known project layout.
    }
  }
  return null;
}

async function checkN8nWorkflows() {
  const directory = await findWorkflowDirectory();
  if (!directory) {
    return {
      status: 'error' as CheckStatus,
      expected: EXPECTED_N8N_WORKFLOWS,
      valid: [],
      missing: EXPECTED_N8N_WORKFLOWS,
      invalid: [],
    };
  }

  const valid: string[] = [];
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const fileName of EXPECTED_N8N_WORKFLOWS) {
    const filePath = path.join(directory, fileName);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      JSON.parse(raw);
      valid.push(fileName);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        missing.push(fileName);
      } else {
        invalid.push(fileName);
      }
    }
  }

  return {
    status: missing.length || invalid.length ? 'error' as CheckStatus : 'ok' as CheckStatus,
    expected: EXPECTED_N8N_WORKFLOWS,
    valid,
    missing,
    invalid,
  };
}

async function databaseCheck(checkedAt: string): Promise<ReadinessCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      id: 'database',
      label: 'Database',
      status: 'ok',
      message: 'Database reachable.',
      checkedAt,
    };
  } catch {
    return {
      id: 'database',
      label: 'Database',
      status: 'error',
      message: 'Database check failed.',
      action: 'Verify DATABASE_URL and database availability in the current environment.',
      checkedAt,
    };
  }
}

function authCheck(checkedAt: string): ReadinessCheck {
  const mechanisms: string[] = [];
  if (process.env.API_KEY) mechanisms.push('api_key');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) mechanisms.push('jwt');

  return {
    id: 'auth',
    label: 'Backend auth',
    status: mechanisms.length > 0 ? 'ok' : 'error',
    message: mechanisms.length > 0
      ? `Auth configured with ${mechanisms.join(' and ')}.`
      : 'No API key or valid JWT secret is configured.',
    action: mechanisms.length > 0 ? undefined : 'Configure API_KEY or JWT_SECRET for protected endpoints.',
    checkedAt,
  };
}

function isEmailConfiguredFromEnv() {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'resend') {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }
  if (provider === 'smtp') {
    return Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
    );
  }
  return false;
}

function integrationChecks(checkedAt: string): ReadinessCheck[] {
  const evolutionConfigured = Boolean(
    process.env.EVOLUTION_API_URL &&
    process.env.EVOLUTION_INSTANCE &&
    process.env.EVOLUTION_API_KEY,
  );
  const emailConfigured = isEmailConfiguredFromEnv();
  const paymentProviderConfigured = Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.GROQ_API_KEY,
  );

  return [
    {
      id: 'evolution',
      label: 'Evolution API',
      status: evolutionConfigured ? 'ok' : 'warning',
      message: evolutionConfigured
        ? 'WhatsApp automation appears configured.'
        : 'WhatsApp automation is not fully configured; manual wa.me fallback remains available.',
      action: evolutionConfigured ? undefined : 'Configure Evolution only in a safe test/staging environment.',
      checkedAt,
    },
    {
      id: 'email',
      label: 'Email delivery',
      status: emailConfigured ? 'ok' : 'warning',
      message: emailConfigured
        ? 'Email delivery appears configured.'
        : 'Email delivery is not fully configured; statement delivery will use another channel or manual fallback.',
      action: emailConfigured ? undefined : 'Configure Resend or SMTP test credentials if email E2E is required.',
      checkedAt,
    },
    {
      id: 'paymentDetectionProvider',
      label: 'Payment detection provider',
      status: paymentProviderConfigured ? 'ok' : 'warning',
      message: paymentProviderConfigured
        ? 'A cloud payment detection provider appears configured.'
        : 'Cloud payment detection providers are not configured; deterministic/manual detection can still run.',
      action: paymentProviderConfigured ? undefined : 'Use deterministic/manual detection or configure a test provider key.',
      checkedAt,
    },
  ];
}

function n8nWorkflowCheck(result: Awaited<ReturnType<typeof checkN8nWorkflows>>, checkedAt: string): ReadinessCheck {
  const missing = result.missing.length;
  const invalid = result.invalid.length;
  const ok = result.status === 'ok';

  return {
    id: 'n8nWorkflows',
    label: 'n8n workflow exports',
    status: ok ? 'ok' : 'error',
    message: ok
      ? `${result.valid.length} n8n workflow exports are present and JSON parseable.`
      : `n8n workflow check failed: ${missing} missing, ${invalid} invalid.`,
    action: ok ? undefined : 'Restore missing workflow exports or fix invalid JSON under n8n/workflows.',
    checkedAt,
  };
}

router.get('/e2e-readiness', async (_req, res) => {
  const checkedAt = new Date().toISOString();
  const [database, n8nWorkflows] = await Promise.all([
    databaseCheck(checkedAt),
    checkN8nWorkflows(),
  ]);
  const checks: ReadinessCheck[] = [
    database,
    authCheck(checkedAt),
    ...routeChecks(checkedAt),
    n8nWorkflowCheck(n8nWorkflows, checkedAt),
    ...integrationChecks(checkedAt),
  ];
  const summary = {
    total: checks.length,
    ok: checks.filter(check => check.status === 'ok').length,
    warning: checks.filter(check => check.status === 'warning').length,
    error: checks.filter(check => check.status === 'error').length,
  };
  const warnings = checks
    .filter(check => check.status === 'warning')
    .map(check => check.message);
  const actions = checks
    .map(check => check.action)
    .filter((action): action is string => Boolean(action));
  const ready = summary.error === 0 && summary.warning === 0;

  res.json({
    service: 'collecta-backend',
    ready,
    ok: ready,
    status: summary.error ? 'blocked' : summary.warning ? 'degraded' : 'ready',
    generatedAt: checkedAt,
    environment: process.env.NODE_ENV || 'development',
    summary,
    checks,
    warnings,
    actions,
  });
});

export default router;
