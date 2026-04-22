import { API_BASE_URL } from './api';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface VerifyResponse {
  valid: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async verify(token: string): Promise<VerifyResponse> {
    return request<VerifyResponse>('/auth/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  logout(): void {
    localStorage.removeItem('collecta-token');
  },

  getToken(): string | null {
    return localStorage.getItem('collecta-token');
  },
};
