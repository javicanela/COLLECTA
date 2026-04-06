import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services/authService';

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

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  token: localStorage.getItem('collecta-token'),
  isAuthenticated: !!localStorage.getItem('collecta-token'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await authService.login(email, password);
      localStorage.setItem('collecta-token', result.token);
      set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      set({ isLoading: false });
      console.error('Login failed:', err);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('collecta-token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('collecta-token');
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null });
      return;
    }
    try {
      const result = await authService.verify(token);
      set({ user: result.user, token, isAuthenticated: true });
    } catch {
      localStorage.removeItem('collecta-token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  updateUser: (updatedUser) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedUser } : null,
    })),
}));
