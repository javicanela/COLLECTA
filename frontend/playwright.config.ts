import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `cd "${BACKEND_DIR}" && set AUTH_RATE_LIMIT_MAX=9999&& npm run test:prepare && npm run dev:test`,
      port: 3001,
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
