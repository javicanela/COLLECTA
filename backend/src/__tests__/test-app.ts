import express from 'express';
import cors from 'cors';
import request from 'supertest';
import dotenv from 'dotenv';

// Set test environment BEFORE anything else
process.env.NODE_ENV = 'test';

// Load .env (won't override NODE_ENV since it's already set)
dotenv.config({ override: false });

// Set API_KEY if not already set
process.env.API_KEY = process.env.API_KEY || 'test_api_key_12345678901234567890';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_123456789012345678901234567890';
process.env.ADMIN_USER = process.env.ADMIN_USER || 'admin';
process.env.ADMIN_PASS = process.env.ADMIN_PASS || 'test-admin-password';

import { prisma } from '../lib/prisma';
import authRoutes from '../routes/auth';
import clientRoutes from '../routes/clients';
import operationRoutes from '../routes/operations';
import configRoutes from '../routes/config';
import logsRoutes from '../routes/logs';
import importRoutes from '../routes/import';
import n8nRoutes from '../routes/n8n';
import whatsappRoutes from '../routes/whatsapp';
import webhookRoutes from '../routes/webhooks';
import cobranzaRoutes, { cobranzaPublicRouter } from '../routes/cobranza';
import agentRoutes from '../routes/agent';
import diagnosticsRoutes from '../routes/diagnostics';
import { requireAuth } from '../middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', requireAuth, clientRoutes);
app.use('/api/operations', requireAuth, operationRoutes);
app.use('/api/config', requireAuth, configRoutes);
app.use('/api/logs', requireAuth, logsRoutes);
app.use('/api/import', requireAuth, importRoutes);
app.use('/api/cobranza', cobranzaPublicRouter);
app.use('/api/cobranza', requireAuth, cobranzaRoutes);
app.use('/api/n8n', requireAuth, n8nRoutes);
app.use('/api/whatsapp', requireAuth, whatsappRoutes);
app.use('/api/agent', requireAuth, agentRoutes);
app.use('/api/diagnostics', requireAuth, diagnosticsRoutes);
app.use('/api/webhooks', webhookRoutes);

export const req = request(app);
export { prisma };

export const TEST_AUTH = {
  headers: { Authorization: `Bearer ${process.env.API_KEY}` },
};
