import { detectBrowserCapabilities } from './detect-capabilities';
import { sanitizeSmartImportSamples } from './sanitize-samples';
import { analyzeSmartImport } from './super-identifier';
import { api } from '../../../services/api';
import type {
  SmartImportCapabilities,
  SmartImportEscalationInput,
  SmartImportEscalationOptions,
  SmartImportProviderConfig,
  SmartImportProviderDefinition,
} from './provider-types';
import type { MappingCandidate, SmartImportAnalysis } from './types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/import`
  : '/api/import';

export const SMART_IMPORT_PROVIDERS: SmartImportProviderDefinition[] = [
  {
    id: 'transformers-js',
    label: 'Transformers.js',
    strength: 40,
    privacy: 'local',
    isConfigured: (capabilities, config) => Boolean(config.transformersEnabled && capabilities.webAssembly && capabilities.webWorker),
  },
  {
    id: 'webllm',
    label: 'WebLLM',
    strength: 55,
    privacy: 'local',
    isConfigured: (capabilities, config) => Boolean(config.webLlmEnabled && capabilities.webGpu && capabilities.webWorker),
  },
  {
    id: 'ollama',
    label: 'Ollama',
    strength: 70,
    privacy: 'self-hosted',
    isConfigured: (_capabilities, config) => Boolean(config.ollamaEndpoint?.trim()),
  },
  {
    id: 'byok-cloud',
    label: 'BYOK cloud',
    strength: 90,
    privacy: 'byok-cloud',
    isConfigured: (_capabilities, config) => Boolean(config.byok?.enabled && config.byok.provider.trim()),
  },
];

export function selectBestConfiguredProvider(
  capabilities: SmartImportCapabilities,
  config: SmartImportProviderConfig,
): SmartImportProviderDefinition | null {
  return SMART_IMPORT_PROVIDERS
    .filter((provider) => provider.isConfigured(capabilities, config))
    .sort((a, b) => b.strength - a.strength)[0] ?? null;
}

function withEscalationEvidence(
  deterministic: SmartImportAnalysis,
  providersAttempted: string[],
  warnings: string[],
): SmartImportAnalysis {
  return {
    ...deterministic,
    providerUsed: 'deterministic',
    providersAttempted,
    warnings: [...deterministic.warnings, ...warnings],
  };
}

function mergeProviderMappings(
  deterministic: SmartImportAnalysis,
  providerMappings: Array<{ columnIndex: number; field: string; confidence: number }>,
): SmartImportAnalysis {
  const merged = deterministic.mappings.map((detMapping) => {
    const providerMatch = providerMappings.find(
      (pm) => pm.columnIndex === detMapping.columnIndex && pm.field !== 'ignore',
    );
    if (!providerMatch || providerMatch.confidence <= detMapping.confidence) return detMapping;

    return {
      ...detMapping,
      field: providerMatch.field as MappingCandidate['field'],
      confidence: Math.max(detMapping.confidence, providerMatch.confidence),
      reasonCodes: [...detMapping.reasonCodes, `provider:enhanced`],
    };
  });

  return {
    ...deterministic,
    mappings: merged,
    providerUsed: 'byok-cloud',
    providersAttempted: ['deterministic', 'byok-cloud'],
    warnings: [...deterministic.warnings, 'provider:byok_cloud_enhanced'],
  };
}

function buildProviderSheets(input: SmartImportEscalationInput) {
  return sanitizeSmartImportSamples(input).sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows,
  }));
}

async function callByokProvider(
  input: SmartImportEscalationInput,
  config: NonNullable<SmartImportProviderConfig['byok']>,
): Promise<Array<{ columnIndex: number; field: string; confidence: number }> | null> {
  try {
    const sheets = buildProviderSheets(input);
    const result = await api.post<{ mappings: Array<{ columnIndex: number; field: string; confidence: number }> }>(
      `${API_BASE}/provider-analyze`,
      {
        sheets,
        provider: config.provider,
        apiKey: config.apiKey || '',
        model: config.model,
      },
    );
    return result.mappings || null;
  } catch {
    return null;
  }
}

export async function runSmartImportEscalation(
  input: SmartImportEscalationInput,
  options: SmartImportEscalationOptions = {},
): Promise<SmartImportAnalysis> {
  const deterministic = analyzeSmartImport(input);
  const capabilities = options.capabilities ?? detectBrowserCapabilities();
  const config = options.config ?? {};
  const bestProvider = selectBestConfiguredProvider(capabilities, config);

  if (!bestProvider) {
    return withEscalationEvidence(
      deterministic,
      ['deterministic'],
      ['provider:fallback_deterministic_no_advanced_engine'],
    );
  }

  if (bestProvider.id === 'byok-cloud' && config.byok?.apiKey) {
    const providerMappings = await callByokProvider(input, config.byok);
    if (providerMappings && providerMappings.length > 0) {
      return mergeProviderMappings(deterministic, providerMappings);
    }
  }

  if (bestProvider.id === 'ollama' && config.ollamaEndpoint) {
    return withEscalationEvidence(
      deterministic,
      ['deterministic', 'ollama'],
      ['provider:ollama:endpoint_configured', 'provider:ollama:not_yet_implemented'],
    );
  }

  return withEscalationEvidence(
    deterministic,
    ['deterministic', bestProvider.id],
    [
      `provider:${bestProvider.id}:boundary_ready`,
      `provider:${bestProvider.id}:not_yet_implemented`,
    ],
  );
}
