/**
 * Collecta V5 - Global Types
 * Sincronizado con backend/prisma/schema.prisma
 */

export interface User {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ClienteEstado = 'ACTIVO' | 'SUSPENDIDO';

export interface Client {
  id: string;
  rfc: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  regimen?: string | null;
  categoria?: string | null;
  asesor?: string | null;
  estado: ClienteEstado;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
  operations?: Operation[];
}

export type OperationEstatus = 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'HOY VENCE' | 'POR VENCER' | 'AL CORRIENTE' | 'EXCLUIDO';

export interface Operation {
  id: string;
  clientId: string;
  client?: Client;
  tipo: string;
  descripcion?: string | null;
  monto: number;
  fechaVence: string;
  fechaPago?: string | null;
  estatus: OperationEstatus;
  asesor?: string | null;
  calculatedStatus?: OperationEstatus;
  diasRestantes?: number;
  excluir: boolean;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LogEntry {
  id: string;
  clientId?: string | null;
  client?: Client | null;
  tipo: string;
  variante?: string | null;
  resultado: string;
  mensaje?: string | null;
  telefono?: string | null;
  modo: 'PRUEBA' | 'PRODUCCIÓN';
  createdAt?: string;
}

export interface Config {
  key: string;
  value: string;
}

// Tipos para API Responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
