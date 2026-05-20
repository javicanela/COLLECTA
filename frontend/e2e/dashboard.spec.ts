import { test, expect, type APIRequestContext } from '@playwright/test';
import { API_BASE, createLoggedInSaasAccount } from './helpers/auth';

async function loginViaApi(request: APIRequestContext): Promise<string> {
  const { token } = await createLoggedInSaasAccount(request, 'dashboard');
  return token;
}

test.describe('Dashboard (Cartera) flow', () => {
  test('shows cartera heading and sidebar after login', async ({ page, request }) => {
    const token = await loginViaApi(request);

    await page.addInitScript((t) => {
      localStorage.setItem('collecta-token', t);
    }, token);
    await page.goto('/');

    await expect(page.getByText(/cartera/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav')).toBeVisible();
  });

  test('creates a client and operation then verifies it appears in cartera', async ({ page, request }) => {
    const token = await loginViaApi(request);
    const authHeaders = { Authorization: `Bearer ${token}` };

    const clientRes = await request.post(`${API_BASE}/clients`, {
      headers: authHeaders,
      data: {
        nombre: 'E2E Test Client',
        rfc: 'ABC991234XX',
        telefono: '5550000001',
        email: 'e2e@test.mx',
      },
    });
    expect(clientRes.ok()).toBeTruthy();
    const client = await clientRes.json();
    const clientId = client.id || client.client?.id;
    expect(clientId).toBeTruthy();

    const opRes = await request.post(`${API_BASE}/operations`, {
      headers: authHeaders,
      data: {
        clientId,
        tipo: 'FACTURA',
        descripcion: 'E2E Test Operation',
        monto: 9999.99,
        fechaVence: new Date(Date.now() + 7 * 86400000).toISOString(),
        asesor: 'Test Agent',
      },
    });
    expect(opRes.ok()).toBeTruthy();

    await page.addInitScript((t) => {
      localStorage.setItem('collecta-token', t);
    }, token);
    await page.goto('/');

    await expect(page.getByText(/ABC991234XX/i).first()).toBeVisible({ timeout: 10000 });
  });
});
