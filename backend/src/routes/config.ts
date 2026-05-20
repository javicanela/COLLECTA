import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { organizationScopedConfigKey, requireOrg } from '../lib/tenant';
import { requireAdminConfirm } from '../middleware/auth';

// Solo purge y restore son verdaderamente destructivos
const destructiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Límite excedido para operaciones destructivas' },
});

const router = Router();

function validarCLABE(c: string): boolean {
  const s = c.replace(/\s/g, '');
  return s.length === 18 && /^\d{18}$/.test(s);
}

const configValueSchema = z.string().max(512000, 'Valor demasiado grande (máx 500KB)');

const configBulkSchema = z.array(z.object({
  key: z.string().min(1),
  value: z.string().max(512000),
}));

const configPutSchema = z.object({
  value: configValueSchema,
});

const purgeSchema = z.object({
  type: z.enum(['all', 'logs', 'staging']),
});

const restoreSchema = z.object({
  data: z.object({
    clients: z.array(z.unknown()),
    operations: z.array(z.unknown()),
    logs: z.array(z.unknown()),
    config: z.array(z.unknown()),
  }),
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
    const organizationId = requireOrg(req);
    const configs = await prisma.config.findMany({ where: { organizationId } });
    const configObj: Record<string, string> = {};
    configs.forEach((c: any) => { configObj[c.key] = c.value; });
    res.json(configObj);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching config' });
  }
});

router.put('/:key', validateBody(configPutSchema), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req);
    const { value } = req.body;
    if (req.params.key === 'clabe' && value && !validarCLABE(value)) {
      return res.status(400).json({ error: 'CLABE inválida: debe ser exactamente 18 dígitos numéricos' });
    }
    const config = await prisma.config.upsert({
      where: organizationScopedConfigKey(organizationId, req.params.key as string),
      update: { value },
      create: { organizationId, key: req.params.key as string, value }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error saving config' });
  }
});

router.post('/bulk', validateBody(configBulkSchema), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req);
    const entries = req.body;
    const clabeEntry = entries.find((e: {key: string; value: string}) => e.key === 'clabe');
    if (clabeEntry && clabeEntry.value && !validarCLABE(clabeEntry.value)) {
      return res.status(400).json({ error: 'CLABE inválida: debe ser exactamente 18 dígitos numéricos' });
    }
    const promises = entries.map((e: {key: string; value: string}) =>
      prisma.config.upsert({
        where: organizationScopedConfigKey(organizationId, e.key),
        update: { value: e.value },
        create: { organizationId, key: e.key, value: e.value }
      })
    );
    await Promise.all(promises);
    res.json({ message: 'Config saved', count: entries.length });
  } catch (error) {
    res.status(500).json({ error: 'Error saving config' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req);
    const clientsCount = await prisma.client.count({ where: { organizationId } });
    const operationsCount = await prisma.operation.count({ where: { organizationId } });
    const logsCount = await prisma.logEntry.count({ where: { organizationId } });
    
    res.json({
      clients: clientsCount,
      operations: operationsCount,
      logs: logsCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

router.get('/backup', async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req);
    const clients = await prisma.client.findMany({ where: { organizationId } });
    const operations = await prisma.operation.findMany({ where: { organizationId } });
    const logs = await prisma.logEntry.findMany({ where: { organizationId } });
    const config = await prisma.config.findMany({ where: { organizationId } });
    
    res.json({
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: { clients, operations, logs, config }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating backup' });
  }
});

router.post('/restore', destructiveLimiter, requireAdminConfirm, validateBody(restoreSchema), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req);
    const { clients, operations, logs, config } = req.body.data;
    
    await prisma.$transaction(async (tx) => {
      await tx.logEntry.deleteMany({ where: { organizationId } });
      await tx.operation.deleteMany({ where: { organizationId } });
      await tx.client.deleteMany({ where: { organizationId } });
      await tx.config.deleteMany({ where: { organizationId } });
      
      if (config && config.length > 0) {
        await tx.config.createMany({
          data: config.map((row: any) => ({ ...row, organizationId })),
        });
      }
      if (clients && clients.length > 0) {
        await tx.client.createMany({
          data: clients.map((row: any) => ({ ...row, organizationId })),
        });
      }
      if (operations && operations.length > 0) {
        await tx.operation.createMany({
          data: operations.map((row: any) => ({ ...row, organizationId })),
        });
      }
      if (logs && logs.length > 0) {
        await tx.logEntry.createMany({
          data: logs.map((row: any) => ({ ...row, organizationId })),
        });
      }
    });

    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    logger.error({ error: 'Restore failed', details: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Error restoring backup' });
  }
});

router.post('/purge', destructiveLimiter, requireAdminConfirm, validateBody(purgeSchema), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req);
    const { type } = req.body;
    
    if (type === 'all') {
      await prisma.logEntry.deleteMany({ where: { organizationId } });
      await prisma.operation.deleteMany({ where: { organizationId } });
      await prisma.client.deleteMany({ where: { organizationId } });
    } else if (type === 'logs') {
      await prisma.logEntry.deleteMany({ where: { organizationId } });
    } else if (type === 'staging') {
      await prisma.operation.deleteMany({ where: { organizationId, estatus: 'PENDIENTE' }});
    }

    res.json({ message: `Purged ${type} successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Error purging data' });
  }
});

export default router;
