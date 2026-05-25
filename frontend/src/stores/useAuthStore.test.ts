import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authServiceMocks = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  authService: authServiceMocks,
}));

vi.mock('../services/externalAuthProvider', () => ({
  getExternalAuthAccessToken: vi.fn(async () => null),
  signOutExternalAuth: vi.fn(async () => undefined),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    authServiceMocks.login.mockReset();
    authServiceMocks.signup.mockReset();
    authServiceMocks.verify.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces API login errors to the UI', async () => {
    authServiceMocks.login.mockRejectedValue(new Error('Credenciales invalidas'));

    const { useAuthStore } = await import('./useAuthStore');
    const ok = await useAuthStore.getState().login('admin@test.mx', 'wrong-pass');

    expect(ok).toBe(false);
    expect(useAuthStore.getState().authError).toBe('Credenciales invalidas');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('clears auth errors after a successful signup', async () => {
    authServiceMocks.signup.mockResolvedValue({
      token: 'fresh-token',
      user: {
        id: 'user-1',
        name: 'Admin',
        email: 'admin@test.mx',
        role: 'admin',
      },
    });

    const { useAuthStore } = await import('./useAuthStore');
    const ok = await useAuthStore.getState().signup({
      organizationName: 'Despacho',
      name: 'Admin',
      email: 'admin@test.mx',
      password: 'CollectaTest-123456',
    });

    expect(ok).toBe(true);
    expect(useAuthStore.getState().authError).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
