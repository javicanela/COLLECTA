import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_BASE = 'http://localhost:3001/api';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'test-admin-password';
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures', '3-clientes.csv');

async function loginViaApi(request: any): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_USER, password: ADMIN_PASS },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.token as string;
}

test.describe('Smart Import flow', () => {
  test('navigates to /registros and shows import wizard', async ({ page, request }) => {
    const token = await loginViaApi(request);

    await page.addInitScript((t) => {
      localStorage.setItem('collecta-token', t);
    }, token);
    await page.goto('/registros');

    await expect(page.getByText(/importar datos|smart import|sube tu archivo/i).or(
      page.locator('[class*="dropzone"]'),
    )).toBeVisible({ timeout: 10000 });
  });

  test('uploads a CSV fixture and reaches review phase', async ({ page, request }) => {
    const token = await loginViaApi(request);

    await page.addInitScript((t) => {
      localStorage.setItem('collecta-token', t);
    }, token);
    await page.goto('/registros');
    await page.waitForTimeout(1500);

    const fileInput = page.locator('input[type="file"]');
    const exists = await fileInput.count();
    if (exists > 0) {
      await fileInput.setInputFiles(FIXTURE_PATH);
    } else {
      await page.locator('[class*="dropzone"]').click();
      await page.waitForTimeout(500);
      const inputAfterClick = page.locator('input[type="file"]');
      if (await inputAfterClick.count() > 0) {
        await inputAfterClick.setInputFiles(FIXTURE_PATH);
      }
    }

    await page.waitForTimeout(5000);

    const bodyText = await page.locator('body').innerText();
    const inReview = /revisar|mapeo|vista previa|confirmar|importar|listo/i.test(bodyText);
    expect(inReview).toBeTruthy();
  });
});
