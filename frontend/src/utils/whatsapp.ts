import type { Operation } from '../types';

export type PhoneType = 'NACIONAL' | 'EXTRANJERO';

export interface NormalizedPhone {
  original: string;
  normalized: string;
  tipo: PhoneType;
}

export function normalizePhone(phone: string): NormalizedPhone {
  const cleaned = phone.replace(/\D/g, '');
  const original = phone;
  
  if (phone.startsWith('+')) {
    if (cleaned.startsWith('52')) {
      return { original, normalized: cleaned, tipo: 'NACIONAL' };
    }
    return { original, normalized: cleaned, tipo: 'EXTRANJERO' };
  }
  
  if (cleaned.startsWith('52')) {
    return { original, normalized: cleaned, tipo: 'NACIONAL' };
  }
  
  if (cleaned.length === 10) {
    return { original, normalized: '52' + cleaned, tipo: 'NACIONAL' };
  }
  
  return { original, normalized: cleaned, tipo: 'EXTRANJERO' };
}

export function formatPhoneDisplay(phone: string): string {
  const { tipo, normalized } = normalizePhone(phone);
  const flag = tipo === 'NACIONAL' ? '🇲🇽' : '🌎';
  return `${flag} +${normalized}`;
}

export function buildWaUrl(phone: string, msg: string): string {
  const { normalized } = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
}

export function reemplazarVariables(
  template: string,
  op: Operation,
  cfg: Record<string, string>,
  clientOps?: Operation[]
): string {
  const diasRaw = op.fechaVence
    ? Math.ceil((new Date(op.fechaVence).getTime() - Date.now()) / 86400000)
    : 0;
  const dias = Math.abs(isNaN(diasRaw) ? 0 : diasRaw);
  const fmx = (n: number | null | undefined) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);
  const ffd = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const totalPendiente = clientOps
    ? clientOps.filter(o => !o.fechaPago && !o.excluir).reduce((sum, o) => sum + (o.monto || 0), 0)
    : op.monto;
  const cantidadOps = clientOps ? clientOps.filter(o => !o.fechaPago && !o.excluir).length : 1;

  return template
    .replace(/{NOMBRE_DESPACHO}/g, cfg['nombre_despacho'] || 'Collecta')
    .replace(/{CLIENTE}/g, op.client?.nombre || '')
    .replace(/{MONTO}/g, fmx(op.monto))
    .replace(/{TOTAL}/g, fmx(totalPendiente))
    .replace(/{CANTIDAD}/g, String(cantidadOps))
    .replace(/{CONCEPTO}/g, op.descripcion || '')
    .replace(/{FECHA}/g, ffd(op.fechaVence))
    .replace(/{DIAS}/g, String(dias))
    .replace(/{BENEFICIARIO}/g, cfg['beneficiario'] || '')
    .replace(/{BANCO}/g, cfg['banco'] || '')
    .replace(/{CLABE}/g, cfg['clabe'] || '')
    .replace(/{DEPTO}/g, cfg['depto'] || '')
    .replace(/{TEL_DESPACHO}/g, cfg['tel'] || '')
    .replace(/{EMAIL_DESPACHO}/g, cfg['email'] || '');
}

export const DEFAULT_MSG_VENCIDO = `*{NOMBRE_DESPACHO}* - Recordatorio de Pago Vencido
Estimado *{CLIENTE}*, Su cuenta presenta un saldo total vencido de *{TOTAL}* ({CANTIDAD} {CANTIDAD, plural, one {operacion} other {operaciones}} pendiente{s})
Detalle de la operacion mas urgente: {MONTO} - {CONCEPTO} | Vence: {FECHA} (*{DIAS} dias de retraso*)
Datos para Transferencia: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO} | {EMAIL_DESPACHO}`;

export const DEFAULT_MSG_HOY = `*{NOMBRE_DESPACHO}* - Vencimiento Hoy
Estimado *{CLIENTE}*, Su cuenta tiene un saldo pendiente de *{TOTAL}* ({CANTIDAD} {CANTIDAD, plural, one {operacion} other {operaciones}})
La operacion que vence hoy: *{MONTO}* - {CONCEPTO}
Datos para Transferencia: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO}`;

export const DEFAULT_MSG_RECORDATORIO = `*{NOMBRE_DESPACHO}* - Recordatorio de Pago
Estimado *{CLIENTE}*, Le informamos que su saldo pendiente es de *{TOTAL}* ({CANTIDAD} {CANTIDAD, plural, one {operacion} other {operaciones}})
Proxima operacion a vencer: {MONTO} - {CONCEPTO} | Vence: {FECHA} ({DIAS} dias restantes)
Datos para Transferencia: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO}`;
