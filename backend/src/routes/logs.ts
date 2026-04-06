import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const logCreateSchema = z.object({
  clientId: z.string().optional(),
  tipo: z.string().min(1, 'tipo requerido'),
  variante: z.enum(['VENCIDO', 'HOY VENCE', 'RECORDATORIO', 'MASIVO']).optional(),
  resultado: z.enum(['ENVIADO', 'BLOQUEADO', 'ERROR']),
  mensaje: z.string().max(5000).optional(),
  telefono: z.string().optional(),
  modo: z.enum(['PRUEBA', 'PRODUCCIÓN']).optional(),
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: import('express').NextFunction) => {
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

router.get('/', async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.logEntry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { nombre: true, rfc: true }
        }
      }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching logs' });
  }
});

router.post('/', validateBody(logCreateSchema), async (req: Request, res: Response) => {
  try {
    const { clientId, tipo, variante, resultado, mensaje, telefono, modo } = req.body;
    
    const log = await prisma.logEntry.create({
      data: {
        clientId: clientId || null,
        tipo,
        variante: variante || null,
        resultado,
        mensaje: mensaje || null,
        telefono: telefono || null,
        modo: modo || 'PRUEBA',
      },
      include: {
        client: { select: { nombre: true, rfc: true } }
      }
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Error creating log entry' });
  }
});

export default router;
