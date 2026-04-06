import { api } from './api';
import type { Client } from '../types';

export const ClientService = {
  getAll: () => api.get<Client[]>('/clients'),
  getById: (id: string) => api.get<Client>(`/clients/${id}`),
  getByRfc: (rfc: string) => api.get<Client>(`/clients/rfc/${rfc}`),
  create: (client: Partial<Client>) => api.post<Client>('/clients', client),
  update: (id: string, client: Partial<Client>) => api.put<Client>(`/clients/${id}`, client),
  delete: (id: string) => api.del(`/clients/${id}`),
  toggleStatus: (id: string) => api.patch<Client>(`/clients/${id}/toggle-status`, {}),
};
