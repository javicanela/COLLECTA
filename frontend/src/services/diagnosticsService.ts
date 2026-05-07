import { api } from './api';
import type { DiagnosticsReadinessResponse } from '../types';

export const DiagnosticsService = {
  getE2EReadiness: () => api.get<DiagnosticsReadinessResponse>('/diagnostics/e2e-readiness'),
};
