import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$/;

const clientCreateSchema = z.object({
  rfc: z.string().regex(RFC_REGEX, 'RFC con formato inválido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  regimen: z.string().optional(),
  categoria: z.string().optional(),
  asesor: z.string().optional(),
  notas: z.string().optional(),
});

const clientUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').optional(),
  telefono: z.string().nullish(),
  email: z.union([z.string().email('Email inválido'), z.literal(''), z.null()]).optional(),
  regimen: z.string().nullish(),
  categoria: z.string().nullish(),
  asesor: z.string().nullish(),
  notas: z.string().nullish(),
  estado: z.enum(['ACTIVO', 'SUSPENDIDO']).optional(),
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`[VALIDATE] Raw body:`, req.body);
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log(`[VALIDATE] Validation failed:`, result.error.issues);
      const errors = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    req.body = result.data;
    console.log(`[VALIDATE] Parsed body:`, req.body);
    next();
  };
}

import { NextFunction } from 'express';

router.get('/', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      include: { operations: true },
      orderBy: { nombre: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching clients' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id as string },
      include: { operations: true, logEntries: true }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching client' });
  }
});

router.post('/', validateBody(clientCreateSchema), async (req: Request, res: Response) => {
  try {
    const { rfc, nombre, telefono, email, regimen, categoria, asesor, notas } = req.body;
    const rfcUpper = rfc.toUpperCase();

    const client = await prisma.client.create({
      data: { rfc: rfcUpper, nombre, telefono, email, regimen, categoria, asesor, notas }
    });
    res.status(201).json(client);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'RFC already exists' });
    res.status(500).json({ error: 'Error creating client' });
  }
});

router.put('/:id', validateBody(clientUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { nombre, telefono, email, regimen, categoria, asesor, notas, estado } = req.body;
    const updateData: Record<string, unknown> = { nombre, telefono, email, regimen, categoria, asesor, notas, estado };
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
    const client = await prisma.client.update({
      where: { id: req.params.id as string },
      data: updateData
    });
    res.json(client);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'RFC already exists' });
    res.status(500).json({ error: 'Error updating client' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    console.log(`[DELETE CLIENT] Attempting to delete client: ${clientId}`);
    
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      console.log(`[DELETE CLIENT] Client not found: ${clientId}`);
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const opCount = await prisma.operation.count({ where: { clientId } });
    console.log(`[DELETE CLIENT] Client "${client.nombre}" has ${opCount} operations`);
    
    await prisma.client.delete({ where: { id: clientId } });
    console.log(`[DELETE CLIENT] Successfully deleted client: ${clientId}`);
    
    res.json({ message: 'Client deleted', deletedOperations: opCount });
  } catch (error: any) {
    console.error('[DELETE CLIENT] Error deleting client:', error);
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'No se puede eliminar: hay operaciones relacionadas' });
    }
    res.status(500).json({ error: 'Error deleting client' });
  }
});

router.patch('/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id as string } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    const updated = await prisma.client.update({
      where: { id: req.params.id as string },
      data: { estado: client.estado === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO' }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error toggling status' });
  }
});

router.get('/by-rfc/:rfc', async (req: Request, res: Response) => {
  try {
    const rfcParam = req.params.rfc as string;
    const rfcUpper = rfcParam.toUpperCase();
    const client = await prisma.client.findUnique({
      where: { rfc: rfcUpper },
      include: { operations: true }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching client by RFC' });
  }
});

export default router;
