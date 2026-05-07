import { describe, expect, it } from 'vitest';
import { detectFileKind } from './detect-file-kind';
import type { SourceFileKind } from '../domain/parsed-document';

function makeFile(name: string, type = ''): File {
  return new File(['sample'], name, { type });
}

describe('detectFileKind', () => {
  it.each<[string, string, SourceFileKind]>([
    ['clientes.csv', 'text/csv', 'csv'],
    ['clientes.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
    ['clientes.xls', 'application/vnd.ms-excel', 'xls'],
    ['clientes.xlsm', 'application/vnd.ms-excel.sheet.macroEnabled.12', 'xlsx'],
    ['estado.pdf', 'application/pdf', 'pdf_text'],
    ['reporte.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
    ['clientes.json', 'application/json', 'json'],
    ['clientes.xml', 'application/xml', 'xml'],
    ['scan.png', 'image/png', 'image_ocr'],
    ['scan.jpg', 'image/jpeg', 'image_ocr'],
    ['scan.webp', 'image/webp', 'image_ocr'],
  ])('detects %s as %s', (fileName, mimeType, expectedKind) => {
    expect(detectFileKind(makeFile(fileName, mimeType))).toBe(expectedKind);
  });

  it('returns unknown for unsupported files', () => {
    expect(detectFileKind(makeFile('notes.txt', 'text/plain'))).toBe('unknown');
  });
});
