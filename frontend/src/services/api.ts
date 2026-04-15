/**
 * Collecta V5 - API Services
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://collecta-personal-token.up.railway.app/api'
    : 'http://localhost:3001/api');
const API_KEY = import.meta.env.VITE_API_KEY || '';

function getAuthToken(): string | null {
  try {
    return localStorage.getItem('collecta-token');
  } catch {
    return null;
  }
}

/**
 * Wrapper genérico para fetch con manejo de errores mejorado
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const authHeader = token
    ? `Bearer ${token}`
    : API_KEY
      ? `Bearer ${API_KEY}`
      : '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authHeader && { 'Authorization': authHeader }),
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
  } catch (e) {
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
    } catch {}
    throw new Error(errorBody.message || errorBody.error || `Error en la petición: ${response.status}`);
  }

  try {
    return JSON.parse(rawResponse);
  } catch (e) {
    console.error('Error parseando JSON:', rawResponse.substring(0, 500));
    throw new Error('La API respondió pero el formato es inválido (JSON inválido)');
  }
}

/**
 * Cliente API - Métodos CRUD
 */
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body: any = {}) => apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any) => apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: any = {}) => apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
