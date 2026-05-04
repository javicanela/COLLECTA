import { detectBrowserCapabilities } from './detect-capabilities';
import { sanitizeSmartImportSamples } from './sanitize-samples';
import { analyzeSmartImport } from './super-identifier';
import type {
  SmartImportCapabilities,
  SmartImportEscalationInput,
  SmartImportEscalationOptions,
  SmartImportProviderConfig,
  SmartImportProviderDefinition,
} from './provider-types';
import type { SmartImportAnalysis } from './types';

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

  const sanitized = sanitizeSmartImportSamples(input);
  void sanitized;

  return withEscalationEvidence(
    deterministic,
    ['deterministic', bestProvider.id],
    [
      `provider:${bestProvider.id}:boundary_ready`,
      `provider:${bestProvider.id}:placeholder_no_remote_call`,
    ],
  );
}
