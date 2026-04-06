/**
 * Collecta V5 - Constants
 * Centralized constants for the application
 */

export const OPERATION_TIPOS = [
  'FISCAL',
  'DECLARACIÓN ANUAL',
  'NÓMINA',
  'CONTABILIDAD',
  'IMSS',
  'OTRO',
] as const;

export const STATUS_ORDER: Record<string, number> = {
  'VENCIDO': 0,
  'HOY VENCE': 1,
  'POR VENCER': 2,
  'AL CORRIENTE': 3,
  'PENDIENTE': 4,
  'PAGADO': 5,
  'EXCLUIDO': 6,
};

export const STATUS_COLORS: Record<string, string> = {
  'VENCIDO': 'bg-red-100 text-red-800 border-red-200',
  'HOY VENCE': 'bg-amber-100 text-amber-800 border-amber-200',
  'POR VENCER': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'AL CORRIENTE': 'bg-blue-100 text-blue-800 border-blue-200',
  'PENDIENTE': 'bg-blue-100 text-blue-800 border-blue-200',
  'PAGADO': 'bg-green-100 text-green-800 border-green-200',
  'EXCLUIDO': 'bg-gray-100 text-gray-600 border-gray-200',
};

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 50,
} as const;

export const WA_VARIABLES = [
  'NOMBRE_DESPACHO',
  'CLIENTE',
  'MONTO',
  'CONCEPTO',
  'FECHA',
  'DIAS',
  'BENEFICIARIO',
  'BANCO',
  'CLABE',
  'DEPTO',
  'TEL_DESPACHO',
  'EMAIL_DESPACHO',
] as const;

export const CLIENTE_ESTADOS = ['ACTIVO', 'SUSPENDIDO'] as const;

export const MODO_OPTIONS = ['PRUEBA', 'PRODUCCIÓN'] as const;

export const API_PROVIDERS = ['GEMINI', 'GROQ', 'OPENROUTER', 'REGEX'] as const;
