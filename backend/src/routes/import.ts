import { Router, Request, Response, NextFunction } from 'express';
import { processImportBatch, ImportRow } from '../services/importService';
import { aiCascade } from '../services/aiCascade';
import { z } from 'zod';
import { analyzeSmartImportSamples } from '../services/smartImport/analyze';
import { commitSmartImportRows } from '../services/smartImport/commit';
import { analyzeWithByokProvider } from '../services/smartImport/provider-proxy';
import { parseBufferToSheets } from '../services/smartImport/extract-server';
import { smartImportAnalyzeSchema, smartImportCommitSchema } from '../services/smartImport/schemas';
import { requireOrg } from '../lib/tenant';
import multer from 'multer';

const router = Router();

const importSchema = z.object({
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.unknown())).min(1),
  provider: z.enum(['gemini', 'groq', 'openrouter', 'auto', 'regex']).optional(),
});

void importSchema;

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({ error: 'Validation failed', details });
      return;
    }
    req.body = result.data;
    next();
  };
}

router.post('/analyze', validateBody(smartImportAnalyzeSchema), async (req: Request, res: Response) => {
  try {
    const result = analyzeSmartImportSamples(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Smart import analyze failed', details: error.message });
  }
});

router.post('/commit', validateBody(smartImportCommitSchema), async (req: Request, res: Response) => {
  try {
    const result = await commitSmartImportRows(req.body, undefined, requireOrg(req));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Smart import commit failed', details: error.message });
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const providerAnalyzeSchema = z.object({
  sheets: z.array(z.object({
    name: z.string(),
    rows: z.array(z.array(z.unknown())),
  })).min(1),
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  model: z.string().optional(),
});

router.post('/provider-analyze', async (req: Request, res: Response) => {
  try {
    const parsed = providerAnalyzeSchema.parse(req.body);
    const result = await analyzeWithByokProvider(parsed.sheets, {
      provider: parsed.provider,
      apiKey: parsed.apiKey,
      model: parsed.model,
    });
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    res.status(500).json({ error: 'Provider analysis failed', details: error.message });
  }
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const sheets = parseBufferToSheets(req.file.buffer, req.file.originalname, req.file.mimetype);
    const source = {
      sourceId: `upload_${Date.now()}`,
      fileName: req.file.originalname,
      fileType: (req.file.originalname.endsWith('.csv') ? 'csv' : 'xlsx') as 'csv' | 'xlsx',
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    };

    const result = analyzeSmartImportSamples({ source, sheets });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: 'Upload processing failed', details: error.message });
  }
});

router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { headers, rows, provider } = req.body;
    
    const mappingResult = await aiCascade(headers, rows, provider || 'auto');
    
    // mappingResult.mapping tiene formato { "0": "rfc", "1": "nombre", ... }
    // Necesitamos invertirlo para mapear por índice
    const indexToField: Record<string, string> = {};
    for (const [col, target] of Object.entries(mappingResult.mapping)) {
      indexToField[col] = target;
    }
    
    const mappedRows: ImportRow[] = rows.map((row: any[]) => {
      const obj: any = {};
      row.forEach((value, index) => {
        const field = indexToField[index] || indexToField[index.toString()];
        if (field && value !== undefined && value !== null && value !== '') {
          obj[field] = value;
        }
      });
      return obj as ImportRow;
    });

    const result = await processImportBatch(mappedRows);
    res.json({
      success: true,
      mapping: mappingResult.mapping,
      _source: mappingResult._source,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

export default router;
