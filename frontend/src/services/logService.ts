import { api } from './api';
import type { LogEntry } from '../types';

export const LogService = {
  getAll: () => api.get<LogEntry[]>('/logs'),
  create: (log: Partial<LogEntry>) => api.post<LogEntry>('/logs', log),
};
