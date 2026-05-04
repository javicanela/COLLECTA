import { Router, Request, Response, NextFunction } from 'express';
import { processImportBatch, ImportRow } from '../services/importService';
import { aiCascade } from '../services/aiCascade';
import { z } from 'zod';
import { analyzeSmartImportSamples } from '../services/smartImport/analyze';
import { commitSmartImportRows } from '../services/smartImport/commit';
import { smartImportAnalyzeSchema, smartImportCommitSchema } from '../services/smartImport/schemas';

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
    const result = await commitSmartImportRows(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Smart import commit failed', details: error.message });
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
