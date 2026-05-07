import type { SourceFileKind } from '../domain/parsed-document';

function extensionOf(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  const dotIndex = lowerName.lastIndexOf('.');
  return dotIndex >= 0 ? lowerName.slice(dotIndex + 1) : '';
}

export function detectFileKind(file: File): SourceFileKind {
  const extension = extensionOf(file.name);
  const mimeType = file.type.toLowerCase();

  if (extension === 'csv' || mimeType.includes('csv')) return 'csv';
  if (extension === 'xlsx' || extension === 'xlsm' || mimeType.includes('spreadsheetml.sheet') || mimeType.includes('sheet.macroenabled')) return 'xlsx';
  if (extension === 'xls' || mimeType === 'application/vnd.ms-excel') return 'xls';
  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf_text';
  if (extension === 'docx' || mimeType.includes('wordprocessingml.document')) return 'docx';
  if (extension === 'json' || mimeType === 'application/json') return 'json';
  if (extension === 'xml' || mimeType === 'application/xml' || mimeType === 'text/xml' || mimeType.endsWith('+xml')) return 'xml';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension) || mimeType.startsWith('image/')) return 'image_ocr';

  return 'unknown';
}
