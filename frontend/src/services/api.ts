/**
 * Collecta V5 - API Services
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? '/api'
    : 'http://localhost:3001/api');

function getAuthToken(): string | null {
  try {
    return localStorage.getItem('collecta-token');
  } catch {
    return null;
  }
}

function clearAuthToken(): void {
  try {
    localStorage.removeItem('collecta-token');
  } catch {
    // ignore storage failures in private mode
  }
}

function notifySessionExpired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('collecta:session-expired'));
}

/**
 * Wrapper genérico para fetch con manejo de errores mejorado
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  if (options.headers) {
    const extraHeaders = options.headers as Record<string, string>;
    Object.assign(headers, extraHeaders);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers,
    ...options,
  });

  const contentType = response.headers.get('content-type');
  let rawResponse = '';
  
  try {
    rawResponse = await response.text();
  } catch {
    rawResponse = '[No se pudo leer la respuesta]';
  }

  if (!contentType || !contentType.includes('application/json')) {
    console.error('Respuesta no-JSON recibida:', {
      status: response.status,
      contentType,
      body: rawResponse.substring(0, 500)
    });
    throw new Error(`La API respondió pero el formato es inválido (Content-Type: ${contentType || 'desconocido'}). Respuesta: ${rawResponse.substring(0, 200)}`);
  }

  if (!response.ok) {
    let errorBody: Record<string, string> = {};
    try {
      errorBody = JSON.parse(rawResponse);
    } catch {
      // ignore parse errors; we'll fall back to status
    }
    if (response.status === 401 && token) {
      clearAuthToken();
      notifySessionExpired();
    }
    throw new Error(errorBody.message || errorBody.error || `Error en la petición: ${response.status}`);
  }

  try {
    return JSON.parse(rawResponse);
  } catch {
    console.error('Error parseando JSON:', rawResponse.substring(0, 500));
    throw new Error('La API respondió pero el formato es inválido (JSON inválido)');
  }
}

/**
 * Cliente API - Métodos CRUD
 */
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body: unknown = {}, options: RequestInit = {}) => apiRequest<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) => apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown = {}) => apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
