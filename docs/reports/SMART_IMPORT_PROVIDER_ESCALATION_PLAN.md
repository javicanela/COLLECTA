# Smart Import Provider Escalation Plan

Date: 2026-05-06

## Purpose

This document defines the future provider escalation contract for Collecta Smart
Import. The goal is to let stronger local, self-hosted, BYOK, or cloud engines
improve mapping decisions without making any provider mandatory and without
weakening Collecta's privacy defaults.

Smart Import remains web-first, deterministic-first, provider-agnostic, no cloud
by default, and preview-before-commit.

## Current Baseline

The frontend already has a provider boundary in:

- `frontend/src/features/smart-import/domain/provider-types.ts`
- `frontend/src/features/smart-import/domain/provider-registry.ts`
- `frontend/src/features/smart-import/domain/sanitize-samples.ts`

The current registry treats these as optional advanced providers:

- `transformers-js`
- `webllm`
- `ollama`
- `byok-cloud`

If none are configured, Smart Import succeeds with deterministic analysis and
records fallback evidence. That behavior must remain valid.

## Escalation Principles

- Deterministic analysis always runs first.
- The mandatory challenge can confirm, downgrade, or replace the initial region
  before any provider result is trusted.
- Providers propose improvements; they do not commit data.
- Providers receive sanitized samples only.
- Providers return structured JSON only.
- Provider output must be schema-validated and bounded.
- Provider failure must never block normal deterministic import.
- No provider-specific SDK, key, model, service, or account can become required
  for CSV/XLSX/JSON/XML baseline imports.

## Provider-Agnostic Interface

Future providers should implement a narrow adapter interface. The adapter can
wrap WebLLM, Ollama, BYOK cloud, or a future backend service without leaking
provider-specific details into the Smart Import domain.

```ts
export type SmartImportProviderPrivacy =
  | 'local'
  | 'self-hosted'
  | 'byok-cloud'
  | 'managed-cloud';

export type SmartImportDocumentKind =
  | 'csv'
  | 'xlsx'
  | 'xls'
  | 'json'
  | 'xml'
  | 'docx'
  | 'pdf_text'
  | 'pdf_ocr'
  | 'image_ocr';

export type SmartImportProviderInput = {
  schemaVersion: 'smart-import.provider-input.v1';
  documentKind: SmartImportDocumentKind;
  sanitizedSamples: unknown[];
  candidateMappings: unknown[];
  detectedRegions: unknown[];
  canonicalFields: string[];
  warnings: string[];
  constraints: {
    locale: 'es-MX';
    maxMappings: number;
    returnRawValues: false;
  };
};

export type SmartImportProviderOutput = {
  schemaVersion: 'smart-import.provider-output.v1';
  providerId: string;
  status: 'ok' | 'partial' | 'failed' | 'unsupported';
  mappings: unknown[];
  confidence: number;
  reasoningSummary: string;
  risks: string[];
  warnings: string[];
};

export interface SmartImportProviderAdapter {
  id: string;
  label: string;
  privacy: SmartImportProviderPrivacy;
  isAvailable(): Promise<boolean>;
  analyze(
    input: SmartImportProviderInput,
    options: { signal: AbortSignal },
  ): Promise<SmartImportProviderOutput>;
}
```

The provider input intentionally excludes original files, full rows, raw OCR
text, raw PDF text, and secrets.

## Provider Options

### WebLLM

- Privacy: local.
- Runs in the browser when WebGPU and workers are available.
- Good future option for client-side reasoning over sanitized samples.
- Must be optional, dynamically loaded, and allowed to fail back to deterministic
  analysis on unsupported devices.
- Should never be included in the initial bundle for basic CSV/XLSX imports.

### Ollama

- Privacy: self-hosted.
- Runs against an explicitly configured local or customer-controlled endpoint.
- Useful for teams that want stronger models without managed cloud providers.
- Must require explicit endpoint configuration and user confirmation before
  sending sanitized samples.
- Must not assume `localhost` is safe for every deployment context.

### BYOK Cloud

- Privacy: byok-cloud.
- Uses a provider and key configured by the customer.
- Must be opt-in and provider-agnostic.
- Prefer backend proxying for key protection; do not expose long-lived provider
  secrets in frontend storage.
- The customer must be told that sanitized samples leave the browser before the
  call runs.

### Managed Cloud Future

- Privacy: managed-cloud.
- Only acceptable as a future optional adapter with explicit product, legal, and
  customer consent.
- Must not become a default requirement.
- Must use the same sanitized input and validated JSON output contracts as every
  other provider.

## Sanitization Requirement

Provider escalation is blocked unless sanitized samples exist. The sanitizer
must:

- Limit rows and columns.
- Redact RFCs.
- Anonymize emails.
- Redact phones.
- Replace or truncate names and long free text.
- Preserve amounts and dates only when needed for inference.
- Strip formulas, HTML, scripts, hidden metadata, and file-level instructions.
- Remove raw OCR/PDF/DOCX/XML text unless transformed into bounded sanitized
  samples.

If sanitization fails or the user has not confirmed remote/self-hosted
escalation, the provider call must not run. Smart Import should continue with
the deterministic result and a warning code.

## Expected JSON Response

Providers must return valid JSON that can be parsed and checked against a schema.
The response must not include raw sensitive values from the input.

```json
{
  "schemaVersion": "smart-import.provider-output.v1",
  "providerId": "webllm",
  "status": "ok",
  "mappings": [
    {
      "sourceColumn": 0,
      "sourceHeader": "RFC",
      "field": "client.rfc",
      "confidence": 0.96,
      "reasoningSummary": "Header and masked value pattern match RFC.",
      "alternatives": [
        {
          "field": "ignore",
          "confidence": 0.12
        }
      ],
      "warnings": []
    }
  ],
  "confidence": 0.88,
  "reasoningSummary": "Sample looks like a receivables workbook with client and operation columns.",
  "risks": [
    "low_confidence_status_column"
  ],
  "warnings": []
}
```

Validation rules:

- `schemaVersion` must match the expected version.
- `status` must be one of the allowed values.
- `confidence` values must be between 0 and 1.
- `field` values must be in Collecta's canonical field list or `ignore`.
- `reasoningSummary` must be short and must not echo raw client data.
- Unknown fields should be ignored or rejected according to the adapter schema.

## Fallback Behavior

Provider fallback must be boring and reliable:

1. Run deterministic Smart Import.
2. Run mandatory challenge.
3. Select the strongest available optional provider only if configured and
   permitted.
4. Sanitize samples.
5. Call provider with timeout and `AbortSignal`.
6. Validate provider JSON.
7. Merge only improvements that pass schema, confidence, and challenge checks.
8. If anything fails, keep deterministic analysis and attach warning evidence.

Fallback warning examples:

- `provider:fallback_deterministic_no_advanced_engine`
- `provider:webllm:unsupported_device`
- `provider:ollama:unreachable`
- `provider:byok-cloud:user_confirmation_required`
- `provider:byok-cloud:sanitization_failed`
- `provider:cloud:schema_invalid`
- `provider:timeout`

Provider errors must not:

- Delete deterministic results.
- Prevent preview.
- Trigger automatic commit.
- Leak provider prompts or raw responses into logs.
- Expose provider secrets to the browser.

## Prohibited Dependencies

The following are explicitly prohibited:

- Mandatory Gemini, Groq, OpenRouter, OpenAI, WebLLM, Ollama, PaddleOCR cloud, or
  any other provider dependency.
- Cloud OCR as the default path.
- Backend binary upload as the default path.
- Provider-specific response formats in the Smart Import domain layer.
- Storing provider keys in committed files.
- Sending original files or full documents to providers.
- Requiring a configured provider for deterministic import tests to pass.

## Handoff Notes For Implementation

- Keep provider adapters outside the deterministic analyzer.
- Keep cloud/self-hosted calls behind explicit config and confirmation.
- Keep the existing `providersAttempted` and `providerUsed` evidence in the final
  analysis.
- Validate provider output before merging.
- Prefer warnings over thrown fatal errors when deterministic fallback is still
  usable.
- Add tests for unavailable provider, invalid JSON, timeout, unsupported device,
  failed sanitization, and successful provider suggestion.

## Acceptance Checklist

- Smart Import works with no provider configured.
- No provider receives unsanitized data.
- WebLLM/Ollama/BYOK/cloud remain optional adapters.
- Provider output is valid JSON and schema-checked.
- Provider failure falls back to deterministic analysis.
- Preview remains editable.
- Commit remains explicit.
- No mandatory provider dependency is introduced.
