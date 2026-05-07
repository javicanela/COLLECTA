# Smart Import Multimodal Security And Performance

Date: 2026-05-06

## Purpose

This document defines the security, privacy, retention, and browser performance
rules for Collecta Smart Import Plan 03. The default product behavior remains:
web-first, deterministic-first, provider-agnostic, privacy-safe, no cloud by
default, preview before commit.

This report is documentation only. It does not authorize schema changes,
backend binary upload, mandatory cloud OCR, or automatic commit behavior.

## Operating Defaults

- Parse files in the browser whenever the format can be handled locally.
- Run deterministic detection and mandatory challenge before asking the user to
  fix mappings.
- Use dynamic imports for heavy parsers so CSV/XLSX stay fast.
- Send only confirmed canonical rows to the backend during commit.
- Never send original files, full workbooks, raw OCR text, or unsanitized samples
  to providers without explicit user confirmation.
- Treat every uploaded file as untrusted input, including prompt-like text inside
  PDFs, DOCX, XML, images, spreadsheets, and JSON.

## Recommended Limits

These are initial product limits for the browser implementation. The UI should
show a controlled error or warning when a file exceeds a limit, not crash or hang.

| Type | Soft limit | Hard limit | Processing policy |
|---|---:|---:|---|
| CSV | 10 MB | 25 MB | Use PapaParse streaming/chunking for large files; preview at most 5,000 rows. |
| XLS/XLSX | 10 MB | 20 MB | Parse sheets locally; preview at most 5,000 rows per selected sheet; ignore macros. |
| XLSM | 10 MB | 20 MB | Treat as workbook data only; never execute or inspect VBA as code. |
| JSON | 3 MB | 5 MB | Reject excessive depth, huge arrays, and non-table payloads with controlled warnings. |
| XML | 3 MB | 5 MB | Validate before parse; reject DTD/entity payloads, excessive depth, and huge node counts. |
| DOCX | 5 MB | 10 MB | Extract text/tables only; never render unsanitized HTML output into the DOM. |
| PDF textual | 10 MB or 15 pages | 15 MB or 25 pages | Extract text by page with PDF.js worker; warn if tables are heuristic. |
| PDF scanned OCR | 3 pages | 5 MB or 3 pages | OCR only when explicitly enabled; render capped pages to images for worker OCR. |
| PNG/JPG/WebP image OCR | 3 MB | 5 MB | OCR only when explicitly enabled; downscale large images before OCR. |
| Unknown/binary | n/a | n/a | Reject with unsupported type error. |

Additional caps:

- Maximum detected sheets per workbook: 20.
- Maximum columns sampled per sheet: 30 for provider samples.
- Maximum rows sampled per sheet: 25 for provider samples.
- Maximum XML depth: 12 levels unless real customer files justify increasing it.
- Maximum XML nodes inspected: 50,000.
- Maximum PDF render scale for OCR: 150 DPI equivalent for first release.

## Cancellation Strategy

Every extractor and analysis path should accept an `AbortSignal` through the
extractor context. The wizard should expose a cancel action during:

- `reading`
- `extracting_text`
- `ocr_running`
- `analyzing`

On cancellation:

- Stop parsing or stop after the current chunk/page if the library cannot abort
  immediately.
- Terminate OCR workers and release PDF.js worker resources.
- Revoke object URLs.
- Drop in-memory buffers, parsed text blocks, canvas references, and partial
  preview rows.
- Return a controlled `cancelled` state with no backend commit.
- Avoid logging raw rows, raw document text, or file contents during cleanup.

Long-running tasks should report progress by stage, page, chunk, or row count.
If a task cannot provide reliable progress, the UI should still show elapsed time
and allow cancellation.

## Web Worker And OCR Strategy

Heavy work must stay off the main browser thread when it can block interaction:

- Use PDF.js worker for PDF parsing.
- Use Tesseract.js worker for OCR.
- Prefer PapaParse worker/chunk mode for large CSV files.
- Keep OCR behind a feature flag or explicit user action, because OCR models and
  WASM assets are heavy.
- Use dynamic imports for `pdfjs-dist`, `tesseract.js`, `mammoth`, and
  `fast-xml-parser`.
- Do not include OCR or PDF parsing libraries in the initial CSV/XLSX path unless
  measurements show no meaningful bundle impact.

OCR rules:

- OCR runs locally by default. Cloud OCR is not part of the default path.
- OCR should start from selected pages/images, not full-document processing.
- OCR output is treated as sensitive raw document text.
- OCR confidence, duration, page count, and warning codes may be recorded, but
  recognized text must not be sent to telemetry or logs.

## Data That Must Not Leave The Browser Without Confirmation

The following data stays in browser memory unless the user explicitly confirms a
preview commit or explicitly opts into provider escalation:

- Original uploaded files.
- Full workbook rows and sheets.
- Raw PDF text.
- Raw OCR output.
- Raw DOCX text or HTML conversion output.
- Raw XML/JSON payloads.
- RFCs, names, emails, phone numbers, addresses, notes, and comments.
- File names, because accounting file names can contain client names.
- Screenshots, rendered PDF pages, or image buffers used for OCR.
- Provider prompts that include unsanitized values.

The backend receives only confirmed canonical import rows during commit. A future
backend parser may receive binaries only after a separate product decision,
explicit user confirmation, and equivalent retention controls.

## Provider Sanitization

Before any sample is sent to an advanced provider, the sample must pass a
sanitization boundary equivalent to `sanitizeSmartImportSamples()`:

- Limit sample rows and columns.
- Keep headers only when useful for mapping.
- Partially redact RFC values.
- Anonymize emails.
- Partially redact phone numbers.
- Replace or truncate names and free text.
- Preserve dates and amounts only when needed for accounting inference.
- Strip formulas, HTML, scripts, comments, hidden metadata, and document
  instructions.
- Never include original files or full documents.

Provider output must be validated against a strict JSON schema before it can
influence the preview. If the provider echoes sensitive sample values, Collecta
must discard those echoed values and keep only mapping decisions, confidence,
warnings, and short reasoning summaries.

## XML Risks

XML is high risk because a small file can expand into a large in-memory
structure. The XML extractor must:

- Reject files above the XML hard limit.
- Validate before parsing.
- Reject `DOCTYPE`, DTD, external entities, and processing instructions.
- Disable entity expansion and external resource loading.
- Enforce depth, node count, attribute count, and text length limits.
- Avoid converting arbitrary XML directly into DOM.
- Avoid rendering XML-derived HTML.
- Return controlled warnings for invalid XML, excessive nesting, repeated huge
  nodes, or ambiguous table structure.

The parser should look for repeated record-like nodes and convert only bounded
samples into table candidates.

## PDF Risks

PDF parsing is high risk for performance and input complexity. The PDF path must:

- Reject files above the PDF hard limit.
- Cap page count before extraction.
- Process pages incrementally.
- Ignore attachments, embedded files, JavaScript actions, forms, annotations,
  and remote links for Smart Import purposes.
- Treat encrypted/password-protected PDFs as unsupported in the first release
  unless a user-facing unlock flow is designed.
- Return controlled errors for corrupt PDFs.
- Render pages for OCR only when OCR is enabled and page count/DPI limits pass.
- Release canvas/image resources after OCR.

PDF table extraction should be presented as heuristic. If the extracted text does
not provide enough accounting signals, return `PDF_REQUIRES_OCR` or a similar
warning instead of pretending the mapping is reliable.

## Local Retention

Default retention policy:

- Do not persist original files in `localStorage`, `sessionStorage`,
  `IndexedDB`, backend storage, or logs.
- Keep parsed files in memory only for the current import session.
- Clear file buffers and parsed intermediate artifacts on cancel, error, page
  refresh, or successful commit.
- Do not autosave raw previews unless a future encrypted and explicit draft
  feature is designed.
- Do not persist provider prompts or provider raw responses if they contain
  sensitive text.

After commit, Collecta should retain only the normalized business records the
user confirmed, following the existing `Client` and `Operation` semantics.

## Telemetry Without Sensitive Data

Recommended telemetry fields:

- File type.
- Size bucket, not exact file name.
- Row/page/sheet count buckets.
- Parser kind and version.
- Parse duration bucket.
- OCR duration bucket.
- Cancellation stage.
- Warning/error codes.
- Provider id attempted.
- Provider success/fallback status.
- Confidence bucket.
- Commit confirmed or abandoned.

Telemetry must not include:

- Raw file names.
- RFCs.
- Names.
- Emails.
- Phone numbers.
- Cell values.
- Raw text blocks.
- OCR text.
- Provider prompts.
- Provider raw completions.

Use stable warning codes such as `XML_TOO_DEEP`, `PDF_TOO_MANY_PAGES`,
`OCR_DISABLED`, `PROVIDER_SCHEMA_INVALID`, and
`provider:fallback_deterministic_no_advanced_engine` so production issues can be
debugged without sensitive data.

## Acceptance Checklist

- CSV/XLSX imports still work without loading OCR/PDF dependencies.
- Oversized files fail with controlled UI feedback.
- OCR and PDF parsing are cancelable.
- No original file is persisted locally.
- No provider receives unsanitized data.
- XML and PDF paths enforce hard limits before expensive parsing.
- Telemetry contains only metadata, counts, buckets, warning codes, and timings.
- Preview remains editable and commit remains explicit.
