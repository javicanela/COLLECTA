import { Router, Request, Response, NextFunction } from 'express';
import { aiCascade, testProvider } from '../services/aiCascade';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const providerEnum = z.enum(['gemini', 'groq', 'openrouter', 'auto', 'regex']);

const extractSchema = z.object({
  headers: z.array(z.string()).min(1, 'headers requerido'),
  rows: z.array(z.array(z.unknown())).min(1, 'rows requerido'),
  provider: providerEnum.optional(),
});

const testProviderSchema = z.object({
  provider: z.enum(['gemini', 'groq', 'openrouter']),
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

router.post('/', validateBody(extractSchema), async (req: Request, res: Response) => {
  try {
    const { headers, rows, provider } = req.body;

    const result = await aiCascade(headers, rows, provider || 'auto');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Extraction failed', details: error.message });
  }
});

router.post('/test', async (_req: Request, res: Response) => {
  try {
    const testHeaders = ['RFC', 'Nombre', 'Monto', 'Fecha'];
    const testRows = [['XAXX010101000', 'Cliente Test', '$1,500.00', '15/03/2026']];

    const result = await aiCascade(testHeaders, testRows, 'auto');
    res.json({
      success: true,
      provider: result._source,
      mapping: result.mapping,
      message: `AI connection successful via ${result._source}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/test-provider', validateBody(testProviderSchema), async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;

    const result = await testProvider(provider);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/provider-status', async (_req: Request, res: Response) => {
  try {
    const configRows = await prisma.config.findMany({
      where: { key: { in: ['gemini_api_key', 'groq_api_key', 'openrouter_api_key', 'ai_last_provider'] } },
    });
    const cfg: Record<string, string> = {};
    for (const row of configRows) cfg[row.key] = row.value;

    const envGemini = process.env.GEMINI_API_KEY || '';
    const envGroq = process.env.GROQ_API_KEY || '';
    const envOpenRouter = process.env.OPENROUTER_API_KEY || '';

    res.json({
      gemini: { hasKey: !!(cfg['gemini_api_key']?.trim() || envGemini), source: cfg['gemini_api_key']?.trim() ? 'config' : (envGemini ? 'env' : 'none') },
      groq: { hasKey: !!(cfg['groq_api_key']?.trim() || envGroq), source: cfg['groq_api_key']?.trim() ? 'config' : (envGroq ? 'env' : 'none') },
      openrouter: { hasKey: !!(cfg['openrouter_api_key']?.trim() || envOpenRouter), source: cfg['openrouter_api_key']?.trim() ? 'config' : (envOpenRouter ? 'env' : 'none') },
      lastProvider: cfg['ai_last_provider'] || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
