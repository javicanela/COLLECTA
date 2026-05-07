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

export interface StatementDeliveryResult {
  success: boolean;
  channel: 'WHATSAPP' | 'EMAIL' | 'MANUAL_FALLBACK';
  clientId: string;
  mediaUrl?: string;
  messageId?: string;
  emailMessageId?: string;
  fallbackWaUrl?: string;
  error?: string;
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

export interface PaymentReviewCandidate {
  id: string;
  tipo: string;
  descripcion?: string | null;
  monto: number;
  fechaVence: string;
  estatus: OperationEstatus | string;
  client?: Pick<Client, 'nombre' | 'rfc'> | null;
}

export interface PaymentReviewPayload {
  event?: string;
  receiptKey?: string;
  status?: string;
  clientId?: string | null;
  operationId?: string | null;
  rfc?: string | null;
  amount?: number | null;
  paymentDate?: string | null;
  reference?: string | null;
  source?: string | null;
  provider?: string | null;
  reasons?: string[];
  rawMessage?: string;
}

export interface PaymentReviewItem {
  id: string;
  createdAt: string;
  client?: Pick<Client, 'id' | 'nombre' | 'rfc' | 'telefono'> | null;
  payload: PaymentReviewPayload;
  candidates: PaymentReviewCandidate[];
}

export interface PaymentReviewReport {
  total: number;
  pending: PaymentReviewItem[];
}

export type DiagnosticsCheckStatus =
  | 'ok'
  | 'warning'
  | 'error'
  | 'skipped'
  | 'unknown'
  | 'pass'
  | 'passed'
  | 'warn'
  | 'fail'
  | 'failed'
  | 'ready'
  | 'degraded'
  | 'blocked';

export interface DiagnosticsReadinessSummary {
  total?: number;
  ok?: number;
  warning?: number;
  error?: number;
  skipped?: number;
  passed?: number;
  warnings?: number;
  failed?: number;
}

export interface DiagnosticsReadinessCheck {
  id?: string;
  key?: string;
  name?: string;
  label?: string;
  status?: DiagnosticsCheckStatus | string;
  ok?: boolean;
  message?: string;
  warning?: string;
  action?: string;
  remediation?: string;
  checkedAt?: string;
}

export interface DiagnosticsReadinessResponse {
  ok?: boolean;
  status?: DiagnosticsCheckStatus | string;
  generatedAt?: string;
  updatedAt?: string;
  environment?: string;
  summary?: DiagnosticsReadinessSummary;
  checks?: DiagnosticsReadinessCheck[] | Record<string, DiagnosticsReadinessCheck>;
  warnings?: string[];
  actions?: string[];
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
