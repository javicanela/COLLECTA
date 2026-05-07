import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type WorkflowNode = {
  id?: string;
  name?: string;
  type?: string;
  parameters?: Record<string, unknown>;
};

type Workflow = {
  name?: string;
  nodes?: WorkflowNode[];
  connections?: Record<string, unknown>;
};

type StringLeaf = {
  path: string;
  value: string;
};

const repoRoot = path.resolve(__dirname, '../../..');
const workflowDir = path.join(repoRoot, 'n8n', 'workflows');

const workflowFiles = [
  '01_reporte_diario_cartera.json',
  '02_cobranza_automatica_whatsapp.json',
  '03_deteccion_pagos_gemini_vision.json',
  '04_cobranza_email_pdf.json',
] as const;

const protectedCollectaRoutes = [
  '/api/n8n/',
  '/api/logs',
  '/api/cobranza/cliente/',
  '/api/cobranza/operation/',
  '/api/whatsapp/',
  '/api/agent/',
  '/api/clients',
  '/api/operations',
  '/api/import',
  '/api/config',
  '/api/extract',
];

const secretPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: 'OpenAI-style API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
  { label: 'JWT token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

function workflowPath(fileName: string) {
  return path.join(workflowDir, fileName);
}

function readWorkflow(fileName: string): Workflow {
  const raw = fs.readFileSync(workflowPath(fileName), 'utf8');
  return JSON.parse(raw) as Workflow;
}

function collectStringLeaves(value: unknown, pathParts: string[] = []): StringLeaf[] {
  if (typeof value === 'string') {
    return [{ path: pathParts.join('.'), value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStringLeaves(item, [...pathParts, String(index)]));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectStringLeaves(child, [...pathParts, key]),
    );
  }

  return [];
}

function nodeUrl(node: WorkflowNode): string | null {
  const url = node.parameters?.url;
  return typeof url === 'string' ? url : null;
}

function isProtectedCollectaUrl(url: string) {
  if (!url.includes('/api/')) return false;
  if (url.includes('/api/cobranza/media/')) return false;

  return protectedCollectaRoutes.some(route => url.includes(route));
}

function headerParameters(node: WorkflowNode) {
  const headerParameters = node.parameters?.headerParameters as
    | { parameters?: Array<{ name?: unknown; value?: unknown }> }
    | undefined;

  return headerParameters?.parameters ?? [];
}

function authorizationHeader(node: WorkflowNode) {
  return headerParameters(node).find(header =>
    typeof header.name === 'string' && header.name.toLowerCase() === 'authorization',
  );
}

function hasHardcodedBearer(value: string) {
  const bearerMatch = value.match(/Bearer\s+([^"',\s]+)/i);
  if (!bearerMatch) return false;

  const token = bearerMatch[1];
  return !token.includes('$env.API_KEY') && !token.includes('{{');
}

function hasHardcodedSecretAssignment(value: string) {
  const assignmentPattern =
    /(api[_-]?key|apikey|token|secret|password|pass|authorization)\s*[:=]\s*["']?([^"',\s}]+)/gi;

  for (const match of value.matchAll(assignmentPattern)) {
    const candidate = match[2];
    if (!candidate || candidate.includes('$env.') || candidate.includes('{{')) {
      continue;
    }
    if (candidate.length >= 8) {
      return true;
    }
  }

  return false;
}

describe('n8n workflow export integrity', () => {
  it('parses the four expected workflow JSON files', () => {
    for (const fileName of workflowFiles) {
      const workflow = readWorkflow(fileName);

      expect(workflow.name).toEqual(expect.any(String));
      expect(Array.isArray(workflow.nodes)).toBe(true);
      expect(workflow.nodes?.length).toBeGreaterThan(0);
      expect(workflow.connections).toEqual(expect.any(Object));
    }
  });

  it('does not hardcode secrets in exported workflow strings', () => {
    const offenders = workflowFiles.flatMap(fileName => {
      const workflow = readWorkflow(fileName);
      return collectStringLeaves(workflow, [fileName])
        .map(leaf => {
          const matchedPattern = secretPatterns.find(({ pattern }) => pattern.test(leaf.value));
          if (matchedPattern) {
            return { ...leaf, reason: matchedPattern.label };
          }
          if (hasHardcodedBearer(leaf.value)) {
            return { ...leaf, reason: 'literal Bearer token' };
          }
          if (hasHardcodedSecretAssignment(leaf.value)) {
            return { ...leaf, reason: 'literal secret assignment' };
          }
          return null;
        })
        .filter((leaf): leaf is StringLeaf & { reason: string } => leaf !== null);
    });

    expect(offenders).toEqual([]);
  });

  it('uses Bearer API auth on protected Collecta HTTP nodes only', () => {
    const missingAuth = workflowFiles.flatMap(fileName => {
      const workflow = readWorkflow(fileName);
      return (workflow.nodes ?? [])
        .filter(node => node.type === 'n8n-nodes-base.httpRequest')
        .map(node => ({ fileName, node, url: nodeUrl(node) }))
        .filter(({ url }) => url !== null && isProtectedCollectaUrl(url))
        .filter(({ node }) => {
          const authHeader = authorizationHeader(node);
          return (
            node.parameters?.sendHeaders !== true ||
            !authHeader ||
            typeof authHeader.value !== 'string' ||
            !/^=?Bearer\s+\{\{\$env\.API_KEY\}\}$/.test(authHeader.value)
          );
        })
        .map(({ fileName: file, node, url }) => ({
          file,
          nodeId: node.id,
          nodeName: node.name,
          url,
        }));
    });

    expect(missingAuth).toEqual([]);
  });

  it('keeps workflow 04 wired to send-statement when the backend route exists', () => {
    const cobranzaRoutes = fs.readFileSync(path.join(repoRoot, 'backend', 'src', 'routes', 'cobranza.ts'), 'utf8');
    if (!cobranzaRoutes.includes('send-statement')) {
      return;
    }

    const workflow = readWorkflow('04_cobranza_email_pdf.json');
    const sendStatementNodes = (workflow.nodes ?? []).filter(node => {
      const url = nodeUrl(node);
      return url?.includes('/api/cobranza/cliente/') && url.includes('/send-statement');
    });

    expect(sendStatementNodes).toHaveLength(1);
    expect(sendStatementNodes[0]).toMatchObject({
      id: 'send-statement',
      type: 'n8n-nodes-base.httpRequest',
    });
  });
});
