import { beforeAll, beforeEach, afterAll, vi } from 'vitest';

// Mock the logger BEFORE any module imports that use it
vi.mock('../lib/logger', () => ({
  logger: {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  },
}));

import { prisma } from './test-app';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.operation.deleteMany();
  await prisma.client.deleteMany();
  await prisma.config.deleteMany();
  await prisma.logEntry.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
