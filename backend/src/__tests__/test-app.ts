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

import { prisma } from '../lib/prisma';
import clientRoutes from '../routes/clients';
import operationRoutes from '../routes/operations';
import configRoutes from '../routes/config';
import logsRoutes from '../routes/logs';
import { requireAuth } from '../middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/clients', requireAuth, clientRoutes);
app.use('/api/operations', requireAuth, operationRoutes);
app.use('/api/config', requireAuth, configRoutes);
app.use('/api/logs', requireAuth, logsRoutes);

export const req = request(app);
export { prisma };

export const TEST_AUTH = {
  headers: { Authorization: `Bearer ${process.env.API_KEY}` },
};
