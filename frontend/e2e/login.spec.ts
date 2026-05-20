import { test, expect } from '@playwright/test';
import { API_BASE, makeSaasAccount, signupSaasAccount } from './helpers/auth';

test.describe('Login flow', () => {
  test('shows login form when unauthenticated', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: /ingresar/i })).toBeVisible();
  });

  test('logs in with valid credentials and lands on dashboard', async ({ page }) => {
    const account = makeSaasAccount('login-ui');
    await signupSaasAccount(page.request, account);

    await page.goto('/');

    await page.getByRole('textbox', { name: /usuario/i }).fill(account.email);
    await page.getByLabel(/contrase/i).fill(account.password);
    await page.locator('form').getByRole('button', { name: /ingresar/i }).click();

    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/);
  });

  test('creates a SaaS account from the public signup UI', async ({ page }) => {
    const account = makeSaasAccount('signup-ui');

    await page.goto('/');
    await page.getByRole('button', { name: /^crear cuenta$/i }).click();

    await page.getByLabel(/despacho/i).fill(account.organizationName);
    await page.getByLabel(/^nombre/i).fill(account.name);
    await page.getByRole('textbox', { name: /correo/i }).fill(account.email);
    await page.getByLabel(/contrase/i).fill(account.password);
    await page.getByRole('button', { name: /crear cuenta y entrar/i }).click();

    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/cartera/i).first()).toBeVisible();
  });

  test('rejects invalid SaaS credentials', async ({ request }) => {
    const account = makeSaasAccount('login-error');
    await signupSaasAccount(request, account);

    const res = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: account.email,
        password: `${account.password}-wrong`,
      },
    });

    expect(res.status()).toBe(401);
  });
});
