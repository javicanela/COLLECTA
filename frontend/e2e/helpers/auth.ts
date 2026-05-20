import { expect, type APIRequestContext } from '@playwright/test';

export const API_BASE = 'http://localhost:3001/api';

export interface SaasAccount {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}

export function makeSaasAccount(label: string): SaasAccount {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    organizationName: `E2E ${label} ${suffix}`,
    name: `Admin ${label}`,
    email: `e2e-${label}-${suffix}@collecta.test`.toLowerCase(),
    password: `CollectaTest-${suffix}-Pass1`,
  };
}

export async function signupSaasAccount(request: APIRequestContext, account: SaasAccount): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/signup`, {
    data: account,
  });
  expect(res.status()).toBe(201);
  const body = await res.json() as { token: string };
  expect(body.token).toEqual(expect.any(String));
  return body.token;
}

export async function loginSaasAccount(request: APIRequestContext, account: SaasAccount): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: {
      email: account.email,
      password: account.password,
    },
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as { token: string };
  expect(body.token).toEqual(expect.any(String));
  return body.token;
}

export async function createLoggedInSaasAccount(
  request: APIRequestContext,
  label: string,
): Promise<{ account: SaasAccount; token: string }> {
  const account = makeSaasAccount(label);
  await signupSaasAccount(request, account);
  const token = await loginSaasAccount(request, account);
  return { account, token };
}

