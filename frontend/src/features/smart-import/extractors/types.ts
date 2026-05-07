import type { ParsedDocument, SourceFileKind } from '../domain/parsed-document';

export type ExtractorContext = {
  maxRowsPreview?: number;
  enableOcr?: boolean;
  signal?: AbortSignal;
};

export type DocumentExtractor = {
  kind: SourceFileKind;
  canHandle(file: File): boolean;
  extract(file: File, context: ExtractorContext): Promise<ParsedDocument>;
};
