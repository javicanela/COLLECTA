import { z } from 'zod';

const cellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const fileTypeSchema = z.enum([
  'csv',
  'xlsx',
  'xls',
  'pdf_text',
  'pdf_ocr',
  'docx',
  'image_ocr',
  'json',
  'xml',
  'unknown',
]);
const sourceTraceSchema = z.object({
  fileName: z.string().min(1),
  sheetName: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
  regionId: z.string().optional(),
  extractor: z.string().min(1),
});

export const smartImportAnalyzeSchema = z.object({
  source: z.object({
    sourceId: z.string().min(1),
    fileName: z.string().min(1),
    fileType: fileTypeSchema,
    mimeType: z.string().optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
  }),
  sheets: z.array(z.object({
    sheetId: z.string().min(1),
    name: z.string().min(1),
    rows: z.array(z.array(cellSchema)).min(1),
  })).min(1),
});

const canonicalRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  sourceRowIndex: z.number().int().min(0),
  source: sourceTraceSchema.optional(),
  client: z.object({
    rfc: z.string().optional(),
    nombre: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().optional(),
    regimen: z.string().optional(),
    categoria: z.string().optional(),
    asesor: z.string().optional(),
  }),
  operation: z.object({
    tipo: z.string().optional(),
    descripcion: z.string().optional(),
    monto: z.number().optional(),
    fechaVence: z.string().optional(),
    fechaPago: z.string().optional(),
    estatus: z.string().optional(),
    asesor: z.string().optional(),
    excluir: z.boolean().optional(),
    archived: z.boolean().optional(),
  }),
  warnings: z.array(z.string()).default([]),
});

export const smartImportCommitSchema = z.object({
  confirmedRows: z.array(canonicalRowSchema).min(1),
});

export type SmartImportAnalyzeBody = z.infer<typeof smartImportAnalyzeSchema>;
export type SmartImportCommitBody = z.infer<typeof smartImportCommitSchema>;
