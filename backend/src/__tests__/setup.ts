import { beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = 'test';
process.env.API_KEY = process.env.API_KEY || 'test_api_key_12345678901234567890';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_123456789012345678901234567890';
process.env.ADMIN_USER = process.env.ADMIN_USER || 'admin';
process.env.ADMIN_PASS = process.env.ADMIN_PASS || 'test-admin-password';

// Mock the logger BEFORE any module imports that use it
vi.mock('../lib/logger', () => ({
  logger: {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  },
}));

let prisma: PrismaClient | null = null;
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

beforeAll(async () => {
  prisma = new PrismaClient();
  if (hasDatabaseUrl) {
    await prisma.$connect();
  }
});

beforeEach(async () => {
  if (!hasDatabaseUrl || !prisma) {
    return;
  }
  await prisma.operation.deleteMany();
  await prisma.client.deleteMany();
  await prisma.config.deleteMany();
  await prisma.logEntry.deleteMany();
});

afterAll(async () => {
  if (hasDatabaseUrl && prisma) {
    await prisma.$disconnect();
  }
});
