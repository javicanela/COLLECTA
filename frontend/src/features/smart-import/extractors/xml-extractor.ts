import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ParsedDocument, ParsedTextBlock } from '../domain/parsed-document';
import {
  buildStructuredTable,
  flattenStructuredRecord,
  isStructuredRecord,
  stringifyStructuredValue,
  type StructuredRecord,
} from './structured-data';
import type { DocumentExtractor } from './types';

const EXTRACTOR_NAME = 'xml-extractor';

const parser = new XMLParser({
  attributeNamePrefix: '@',
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  textNodeName: '#text',
  trimValues: true,
});

type XmlTableCandidate = {
  path: string;
  records: StructuredRecord[];
};

function validationMessage(validationResult: unknown): string {
  if (typeof validationResult !== 'object' || validationResult === null) {
    return 'invalid XML';
  }

  const validationError = validationResult as { err?: { msg?: string } };
  return validationError.err?.msg ?? 'invalid XML';
}

function assertValidXml(text: string): void {
  const validationResult = XMLValidator.validate(text);

  if (validationResult === true) {
    return;
  }

  throw new Error(`Smart Import XML parse error: ${validationMessage(validationResult)}`);
}

function findXmlTableCandidates(value: unknown, path = ''): XmlTableCandidate[] {
  if (Array.isArray(value)) {
    const records = value.filter(isStructuredRecord);
    return records.length > 0 ? [{ path, records }] : [];
  }

  if (!isStructuredRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => (
    findXmlTableCandidates(child, path ? `${path}.${key}` : key)
  ));
}

function buildXmlTextBlock(parsed: unknown, file: File, documentId: string): ParsedTextBlock | null {
  if (!isStructuredRecord(parsed)) {
    const text = stringifyStructuredValue(parsed).trim();

    return text
      ? {
          id: `${documentId}-text-1`,
          text,
          confidence: 1,
          source: {
            fileName: file.name,
            extractor: EXTRACTOR_NAME,
          },
        }
      : null;
  }

  const text = Object.entries(flattenStructuredRecord(parsed))
    .map(([path, value]) => `${path}: ${stringifyStructuredValue(value)}`)
    .filter((line) => line.trim() !== '')
    .join('\n');

  return text
    ? {
        id: `${documentId}-text-1`,
        text,
        confidence: 1,
        source: {
          fileName: file.name,
          extractor: EXTRACTOR_NAME,
        },
      }
    : null;
}

export const xmlExtractor: DocumentExtractor = {
  kind: 'xml',
  canHandle: (file) => {
    const lowerName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    return lowerName.endsWith('.xml') || mimeType === 'application/xml' || mimeType === 'text/xml' || mimeType.endsWith('+xml');
  },
  extract: async (file): Promise<ParsedDocument> => {
    const startedAt = performance.now();
    const documentId = crypto.randomUUID();
    const text = await file.text();
    assertValidXml(text);
    const parsed = parser.parse(text) as unknown;
    const tables = findXmlTableCandidates(parsed).map((candidate, tableIndex) => (
      buildStructuredTable({
        id: `${documentId}-table-${tableIndex + 1}`,
        label: candidate.path || file.name,
        file,
        extractor: EXTRACTOR_NAME,
        records: candidate.records,
      })
    ));
    const textBlock = tables.length === 0 ? buildXmlTextBlock(parsed, file, documentId) : null;

    return {
      id: documentId,
      fileName: file.name,
      kind: 'xml',
      mimeType: file.type,
      sizeBytes: file.size,
      tables,
      textBlocks: textBlock ? [textBlock] : [],
      warnings: tables.length === 0 ? ['XML_NO_REPEATED_NODES_TABLE'] : [],
      metrics: {
        parseMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  },
};
