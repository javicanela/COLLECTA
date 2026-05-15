import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'test-admin-password';

async function loginViaApi(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_USER, password: ADMIN_PASS },
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as { token: string };
  return body.token as string;
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
        rfc: 'E2E991234XX',
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
        fechaVence: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        asesor: 'Test Agent',
      },
    });
    expect(opRes.ok()).toBeTruthy();

    await page.addInitScript((t) => {
      localStorage.setItem('collecta-token', t);
    }, token);
    await page.goto('/');

    await expect(page.getByText(/e2e/i).or(page.getByText(/E2E991234XX/i))).toBeVisible({ timeout: 10000 });
  });
});
