import { api } from './api';
import type { Operation } from '../types';

export const OperationService = {
  getAll: (filters?: any) => {
    const query = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return api.get<Operation[]>(`/operations${query}`);
  },
  getById: (id: string) => api.get<Operation>(`/operations/${id}`),
  create: (op: Partial<Operation>) => api.post<Operation>('/operations', op),
  update: (id: string, op: Partial<Operation>) => api.put<Operation>(`/operations/${id}`, op),
  delete: (id: string) => api.del(`/operations/${id}`),
  
  // Acciones específicas
  registrarPago: (id: string) => api.patch<Operation>(`/operations/${id}/pay`, {}),
  unpay: (id: string) => api.patch<Operation>(`/operations/${id}/unpay`, {}),
  archive: (id: string) => api.patch<Operation>(`/operations/${id}/archive`, {}),
  unarchive: (id: string) => api.patch<Operation>(`/operations/${id}/unarchive`, {}),
  toggleExclude: (id: string) => api.patch<Operation>(`/operations/${id}/toggle-exclude`, {}),
  
  extract: (data: { headers: string[], rows: any[][], provider?: string }) => 
    api.post<{ mapping: any, _source: string }>('/extract', data),
};
