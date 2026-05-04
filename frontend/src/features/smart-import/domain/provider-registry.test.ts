import { describe, expect, it } from 'vitest';
import { cleanCsvRows } from '../__fixtures__/sample-workbooks';
import { runSmartImportEscalation, selectBestConfiguredProvider } from './provider-registry';

describe('provider registry', () => {
  it('selects the strongest explicitly configured provider without making paid cloud default', () => {
    expect(selectBestConfiguredProvider(
      { webGpu: true, webAssembly: true, webWorker: true, secureContext: true },
      {
        transformersEnabled: true,
        webLlmEnabled: true,
        ollamaEndpoint: 'http://localhost:11434',
        byok: { enabled: true, provider: 'openrouter' },
      },
    )?.id).toBe('byok-cloud');

    expect(selectBestConfiguredProvider(
      { webGpu: true, webAssembly: true, webWorker: true, secureContext: true },
      { transformersEnabled: true, webLlmEnabled: true },
    )?.id).toBe('webllm');

    expect(selectBestConfiguredProvider(
      { webGpu: false, webAssembly: true, webWorker: true, secureContext: true },
      {},
    )).toBeNull();
  });

  it('always runs deterministic analysis and records fallback evidence when no stronger engine is available', async () => {
    const analysis = await runSmartImportEscalation({
      source: { sourceId: 'clean-csv', fileName: 'clean.csv', fileType: 'csv' },
      sheets: [{ sheetId: 'clean', name: 'clean.csv', rows: cleanCsvRows }],
    }, {
      capabilities: { webGpu: false, webAssembly: true, webWorker: true, secureContext: true },
      config: {},
    });

    expect(analysis.providerUsed).toBe('deterministic');
    expect(analysis.providersAttempted).toEqual(['deterministic']);
    expect(analysis.challengeResult.status).toMatch(/confirmed|changed|downgraded/);
    expect(analysis.warnings).toContain('provider:fallback_deterministic_no_advanced_engine');
  });
});
