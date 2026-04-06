import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

router.use((req, _res, next) => {
  if (req.method === 'DELETE') {
    console.log(`[operations.ts] DELETE received: ${req.path}, params:`, req.params);
  }
  next();
});

const operationCreateSchema = z.object({
  clientId: z.string().min(1, 'clientId requerido'),
  tipo: z.string().min(1, 'tipo requerido'),
  descripcion: z.string().optional(),
  monto: z.number().min(0, 'monto debe ser positivo').optional(),
  fechaVence: z.string().datetime('fechaVence debe ser ISO datetime'),
  asesor: z.string().optional(),
});

const operationUpdateSchema = z.object({
  tipo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  monto: z.number().min(0).optional(),
  fechaVence: z.string().datetime().optional(),
  fechaPago: z.string().datetime().optional().nullable(),
  estatus: z.string().optional(),
  excluir: z.boolean().optional(),
  archived: z.boolean().optional(),
  asesor: z.string().optional(),
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

router.get('/', async (req: Request, res: Response) => {
  try {
    const { archived, status, asesor } = req.query;
    const operations = await prisma.operation.findMany({
      where: {
        archived: archived === 'true',
        ...(status ? { estatus: status as string } : {}),
        ...(asesor ? { asesor: asesor as string } : {}),
      },
      include: { client: true },
      orderBy: { fechaVence: 'asc' }
    });
    
    const enriched = (operations as any[]).map((op: any) => {
      const today = new Date();
      const vence = new Date(op.fechaVence);
      const diffDays = Math.ceil((vence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let calculatedStatus = op.estatus;
      if (op.fechaPago) {
        calculatedStatus = 'PAGADO';
      } else if (op.excluir) {
        calculatedStatus = 'EXCLUIDO';
      } else if (diffDays < 0) {
        calculatedStatus = 'VENCIDO';
      } else if (diffDays === 0) {
        calculatedStatus = 'HOY VENCE';
      } else if (diffDays <= 5) {
        calculatedStatus = 'POR VENCER';
      } else {
        calculatedStatus = 'AL CORRIENTE';
      }
      
      return { ...op, calculatedStatus, diasRestantes: diffDays };
    });
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching operations' });
  }
});

router.post('/', validateBody(operationCreateSchema), async (req: Request, res: Response) => {
  try {
    const { clientId, tipo, descripcion, monto, fechaVence, asesor } = req.body;
    const montoNum = monto ?? 0;
    const fechaVenceDate = new Date(fechaVence);

    const operation = await prisma.operation.create({
      data: { clientId, tipo, descripcion, monto: montoNum, fechaVence: fechaVenceDate, asesor },
      include: { client: true }
    });
    res.status(201).json(operation);
  } catch (error: any) {
    res.status(500).json({ error: 'Error creating operation' });
  }
});

router.put('/:id', validateBody(operationUpdateSchema), async (req: Request, res: Response) => {
  try {
    const data: Record<string, unknown> = { ...req.body };
    if (data.fechaVence) data.fechaVence = new Date(data.fechaVence as string);
    if (data.fechaPago) data.fechaPago = new Date(data.fechaPago as string);
    
    delete data.id;
    
    const operation = await prisma.operation.update({
      where: { id: req.params.id as string },
      data,
      include: { client: true }
    });
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Error updating operation' });
  }
});

router.patch('/:id/pay', async (req: Request, res: Response) => {
  try {
    const operation = await prisma.operation.update({
      where: { id: req.params.id as string },
      data: { fechaPago: new Date(), estatus: 'PAGADO' }
    });
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Error registering payment' });
  }
});

router.patch('/:id/unpay', async (req: Request, res: Response) => {
  try {
    const operation = await prisma.operation.update({
      where: { id: req.params.id as string },
      data: { fechaPago: null, estatus: 'PENDIENTE' },
      include: { client: true }
    });
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Error unmarking payment' });
  }
});

router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    const operation = await prisma.operation.update({
      where: { id: req.params.id as string },
      data: { archived: true }
    });
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Error archiving operation' });
  }
});

router.patch('/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const operation = await prisma.operation.update({
      where: { id: req.params.id as string },
      data: { archived: false }
    });
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Error unarchiving operation' });
  }
});

router.patch('/:id/toggle-exclude', async (req: Request, res: Response) => {
  try {
    const op = await prisma.operation.findUnique({ where: { id: req.params.id as string } });
    if (!op) return res.status(404).json({ error: 'Operation not found' });
    
    const updated = await prisma.operation.update({
      where: { id: req.params.id as string },
      data: { excluir: !op.excluir }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error toggling exclude' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    console.log(`[DELETE] Attempting to delete operation: ${req.params.id}`);
    await prisma.operation.delete({ where: { id: req.params.id as string } });
    console.log(`[DELETE] Successfully deleted operation: ${req.params.id}`);
    res.json({ message: 'Operation deleted' });
  } catch (error: any) {
    console.error('[DELETE] Error deleting operation:', error);
    res.status(500).json({ error: 'Error deleting operation' });
  }
});

router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const all = await prisma.operation.findMany({ where: { archived: false } });
    
    const stats = {
      total: all.length,
      vencidos: 0,
      hoyVence: 0,
      porVencer: 0,
      alCorriente: 0,
      pagados: 0,
      montoTotal: 0
    };
    
    all.forEach((op: any) => {
      if (op.fechaPago) { stats.pagados++; return; }
      const diff = Math.ceil((new Date(op.fechaVence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0) stats.vencidos++;
      else if (diff === 0) stats.hoyVence++;
      else if (diff <= 5) stats.porVencer++;
      else stats.alCorriente++;
      stats.montoTotal += op.monto;
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

router.get('/cliente/:rfc/historial', async (req: Request, res: Response) => {
  try {
    const rfcParam = req.params.rfc as string;
    const { meses } = req.query;
    const mesesNum = parseInt(meses as string) || 3;
    
    const client = await prisma.client.findUnique({
      where: { rfc: rfcParam.toUpperCase() }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - mesesNum);
    
    const operations = await prisma.operation.findMany({
      where: {
        clientId: client.id,
        fechaVence: { gte: fechaInicio }
      },
      orderBy: { fechaVence: 'desc' }
    });
    
    res.json(operations);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching historial' });
  }
});

export default router;
