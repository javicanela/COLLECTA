import { test, expect } from '@playwright/test';
import { createLoggedInSaasAccount } from './helpers/auth';

test.describe('Mobile shell', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens navigation from the mobile menu and reaches clientes', async ({ page, request }) => {
    const { token } = await createLoggedInSaasAccount(request, 'mobile-nav');

    await page.addInitScript((storedToken) => {
      localStorage.setItem('collecta-token', storedToken);
    }, token);
    await page.goto('/');

    await expect(page.getByRole('button', { name: /abrir menú/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /abrir menú/i }).click();

    await expect(page.getByRole('navigation', { name: /navegación principal/i })).toBeVisible();
    await page.getByRole('link', { name: /clientes/i }).click();

    await expect(page).toHaveURL(/\/directorio$/);
    await expect(page.getByRole('button', { name: /abrir menú/i })).toBeVisible();
  });
});
