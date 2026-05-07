import { promises as fs } from 'fs';
import path from 'path';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import n8nRoutes from './n8n';
import whatsappRoutes from './whatsapp';
import cobranzaRoutes from './cobranza';

type CheckStatus = 'ok' | 'warning' | 'error';

type Warning = {
  code: string;
  message: string;
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

function checkRoutes() {
  return Object.fromEntries(
    ROUTE_CHECKS.map(route => {
      const available = routerHasRoute(route.sourceRouter, route.method, route.routePath);
      return [
        route.key,
        {
          status: available ? 'ok' : 'error',
          available,
          method: route.method,
          path: route.publicPath,
        },
      ];
    }),
  );
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

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok' as CheckStatus,
      reachable: true,
    };
  } catch {
    return {
      status: 'error' as CheckStatus,
      reachable: false,
      detail: 'database_check_failed',
    };
  }
}

function checkAuth() {
  const mechanisms: string[] = [];
  if (process.env.API_KEY) mechanisms.push('api_key');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) mechanisms.push('jwt');

  return {
    status: mechanisms.length > 0 ? 'ok' as CheckStatus : 'error' as CheckStatus,
    configured: mechanisms.length > 0,
    mechanisms,
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

function integrationWarnings(): Warning[] {
  const warnings: Warning[] = [];

  if (!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_INSTANCE && process.env.EVOLUTION_API_KEY)) {
    warnings.push({
      code: 'whatsapp_integration_unconfigured',
      message: 'WhatsApp automation is not fully configured; manual wa.me fallback remains available.',
    });
  }

  if (!isEmailConfiguredFromEnv()) {
    warnings.push({
      code: 'email_integration_unconfigured',
      message: 'Email delivery is not fully configured; statement delivery will use another channel or manual fallback.',
    });
  }

  if (!(process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY)) {
    warnings.push({
      code: 'payment_detection_provider_unconfigured',
      message: 'Cloud payment detection providers are not configured; deterministic/manual detection can still run.',
    });
  }

  return warnings;
}

function hasError(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value.status === 'error') return true;
  return Object.values(value).some(item => hasError(item));
}

router.get('/e2e-readiness', async (_req, res) => {
  const [database, n8nWorkflows] = await Promise.all([
    checkDatabase(),
    checkN8nWorkflows(),
  ]);
  const auth = checkAuth();
  const routes = checkRoutes();
  const warnings = integrationWarnings();
  const checks = {
    database,
    auth,
    routes,
    n8nWorkflows,
  };
  const blocked = hasError(checks);

  res.json({
    service: 'collecta-backend',
    status: blocked ? 'blocked' : warnings.length ? 'degraded' : 'ready',
    timestamp: new Date().toISOString(),
    checks,
    warnings,
  });
});

export default router;
