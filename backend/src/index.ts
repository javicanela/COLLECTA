import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import operationRoutes from './routes/operations';
import configRoutes from './routes/config';
import extractRoutes from './routes/extract';
import logsRoutes from './routes/import';
import importRoutes from './routes/import';
import cobranzaRoutes from './routes/cobranza';
import n8nRoutes from './routes/n8n';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware - MUST be first
app.use(helmet());

// Rate limiting - global: 100 req/15min (500 en dev)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 100 : 9999,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Demasiadas peticiones, intente más tarde' },
});
app.use(globalLimiter);

// Moderate rate limiting for AI extraction (no es destructivo, pero sí costoso)
const extractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 60 : 9999,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Límite de extracción AI excedido, intenta en unos minutos' },
});

// Request logging middleware
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: _res.statusCode,
      duration_ms: duration,
    });
  });
  next();
});

// CORS configuration
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Health check - sanitized to not expose internal details
app.get('/api/health', async (_req, res) => {
  const requestId = crypto.randomUUID();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.setHeader('X-Request-ID', requestId);
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.setHeader('X-Request-ID', requestId);
    res.status(500).json({ status: 'error', error: isProduction ? 'Internal server error' : 'Database connection failed' });
  }
});

// Routes - auth endpoints don't require auth (obviously)
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/extract', extractLimiter, extractRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/cobranza', cobranzaRoutes);
app.use('/api/n8n', n8nRoutes);

// Log all requests for debugging
app.use((req, _res, next) => {
  if (req.method === 'DELETE' || req.method === 'PUT') {
    console.log(`[ROUTER] ${req.method} request to: ${req.path}, body:`, req.body);
  }
  next();
});

// Error handler - don't expose error messages in production
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = crypto.randomUUID();
  logger.error({
    error: err.message,
    stack: err.stack,
    request_id: requestId,
  });
  res.setHeader('X-Request-ID', requestId);
  res.status(500).json({ error: isProduction ? 'Internal server error' : err.message });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info({
    msg: 'server_start',
    port: PORT,
    env: isProduction ? 'production' : 'development',
  });
});

export default app;
