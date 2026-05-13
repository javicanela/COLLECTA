import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services/authService';
import { getExternalAuthAccessToken, signOutExternalAuth } from '../services/externalAuthProvider';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
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

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await authService.login(email, password);
      setStoredToken(result.token);
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      set({ isLoading: false });
      console.error('Login failed:', err);
      return false;
    }
  },

  logout: () => {
    clearStoredToken();
    void signOutExternalAuth();
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
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
