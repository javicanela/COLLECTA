import { test, expect } from '@playwright/test';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'test-admin-password';

test.describe('Login flow', () => {
  test('shows login form when unauthenticated', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
  });

  test('logs in with valid credentials and lands on dashboard', async ({ page }) => {
    await page.goto('/');

    await page.fill('#login-email', ADMIN_USER);
    await page.fill('#login-password', ADMIN_PASS);
    await page.getByRole('button', { name: /ingresar/i }).click();

    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/);
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.fill('#login-email', 'wrong@correo.mx');
    await page.fill('#login-password', 'wrong-password');
    await page.getByRole('button', { name: /ingresar/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });
});
