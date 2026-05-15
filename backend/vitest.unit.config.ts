import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: [
      'dist/**',
      'node_modules/**',
      'src/__tests__/clients.test.ts',
      'src/__tests__/collectionsE2E.*.test.ts',
      'src/__tests__/operations.test.ts',
      'src/__tests__/paymentConfirmationCorrelation.test.ts',
      'src/__tests__/phase8.smoke.test.ts',
      'src/__tests__/webhookIdempotency.test.ts',
    ],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
  },
});
