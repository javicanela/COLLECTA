import type { SmartImportAnalysis, SmartImportSource, WorkbookSheetSummary } from './types';

export type SmartImportProviderId =
  | 'deterministic'
  | 'transformers-js'
  | 'webllm'
  | 'ollama'
  | 'byok-cloud';

export interface SmartImportCapabilities {
  webGpu: boolean;
  webAssembly: boolean;
  webWorker: boolean;
  secureContext: boolean;
}

export interface SmartImportProviderConfig {
  transformersEnabled?: boolean;
  webLlmEnabled?: boolean;
  ollamaEndpoint?: string;
  byok?: {
    enabled: boolean;
    provider: string;
  };
}

export interface SmartImportProviderDefinition {
  id: SmartImportProviderId;
  label: string;
  strength: number;
  privacy: 'local' | 'self-hosted' | 'byok-cloud';
  isConfigured: (capabilities: SmartImportCapabilities, config: SmartImportProviderConfig) => boolean;
}

export interface SmartImportEscalationInput {
  source: SmartImportSource;
  sheets: WorkbookSheetSummary[];
  preferredSheetId?: string;
  preferredRegionId?: string;
}

export interface SmartImportEscalationOptions {
  capabilities?: SmartImportCapabilities;
  config?: SmartImportProviderConfig;
}

export interface SmartImportProvider {
  definition: SmartImportProviderDefinition;
  analyze: (input: SmartImportEscalationInput) => Promise<SmartImportAnalysis>;
}
