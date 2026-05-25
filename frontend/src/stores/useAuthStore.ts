import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services/authService';
import { getExternalAuthAccessToken, signOutExternalAuth } from '../services/externalAuthProvider';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (input: { organizationName: string; name: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearAuthError: () => void;
  updateUser: (user: Partial<User>) => void;
}

function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('collecta-token');
}

function setStoredToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('collecta-token', token);
}

function clearStoredToken(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('collecta-token');
}

const initialToken = getStoredToken();

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  token: initialToken,
  isAuthenticated: false,
  isLoading: !!initialToken,
  authError: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, authError: null });
    try {
      const result = await authService.login(email, password);
      setStoredToken(result.token);
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false, authError: null });
      return true;
    } catch (err) {
      set({
        isLoading: false,
        authError: getAuthErrorMessage(err, 'Credenciales inválidas. Intenta de nuevo.'),
      });
      console.error('Login failed:', err);
      return false;
    }
  },

  signup: async (input) => {
    set({ isLoading: true, authError: null });
    try {
      const result = await authService.signup(input);
      setStoredToken(result.token);
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false, authError: null });
      return true;
    } catch (err) {
      set({
        isLoading: false,
        authError: getAuthErrorMessage(err, 'No pudimos crear la cuenta. Revisa los datos e intenta de nuevo.'),
      });
      console.error('Signup failed:', err);
      return false;
    }
  },

  logout: () => {
    clearStoredToken();
    void signOutExternalAuth();
    set({ user: null, token: null, isAuthenticated: false, authError: null });
  },

  clearAuthError: () => set({ authError: null }),

  checkAuth: async () => {
    set({ isLoading: true, authError: null });
    let token = getStoredToken();
    if (!token) {
      token = await getExternalAuthAccessToken();
      if (token) setStoredToken(token);
    }
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null, isLoading: false });
      return;
    }
    try {
      const result = await authService.verify(token);
      set({ user: result.user, token, isAuthenticated: true, isLoading: false });
    } catch {
      clearStoredToken();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (updatedUser) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedUser } : null,
    })),
}));
