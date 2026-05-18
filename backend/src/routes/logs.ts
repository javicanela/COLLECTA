import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { requireOrg } from '../lib/tenant';

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

router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req);
    const logs = await prisma.logEntry.findMany({
      where: { organizationId },
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
    const organizationId = requireOrg(req);
    const { clientId, tipo, variante, resultado, mensaje, telefono, modo } = req.body;
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId },
        select: { id: true },
      });
      if (!client) return res.status(404).json({ error: 'Client not found' });
    }
    
    const log = await prisma.logEntry.create({
      data: {
        organizationId,
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
