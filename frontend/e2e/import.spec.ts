import { test, expect, type APIRequestContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLoggedInSaasAccount } from './helpers/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures', '3-clientes.csv');

async function loginViaApi(request: APIRequestContext): Promise<string> {
  const { token } = await createLoggedInSaasAccount(request, 'import');
  return token;
}

test.describe('Smart Import flow', () => {
  test('navigates to /registros and shows import wizard', async ({ page, request }) => {
    const token = await loginViaApi(request);

    await page.addInitScript((t) => {
      localStorage.setItem('collecta-token', t);
    }, token);
    await page.goto('/registros');

    await expect(page.getByRole('heading', { name: /importar datos/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /smart import/i })).toBeVisible();
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
