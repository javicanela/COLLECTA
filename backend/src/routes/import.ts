import { Router, Request, Response } from 'express';
import { processImportBatch, ImportRow } from '../services/importService';
import { aiCascade } from '../services/aiCascade';
import { z } from 'zod';

const router = Router();

const importSchema = z.object({
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.unknown())).min(1),
  provider: z.enum(['gemini', 'groq', 'openrouter', 'auto', 'regex']).optional(),
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
