import { prisma } from '../lib/prisma';

export async function generateWhatsAppMessage(clientId: string, operations: any[]): Promise<string> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error('Client not found');

  const configRows = await prisma.config.findMany();
  const cfg: Record<string, string> = {};
  configRows.forEach(c => cfg[c.key] = c.value);

  const pendiente = operations.filter(o => !o.fechaPago);
  const totalPendiente = pendiente.reduce((sum, o) => sum + Number(o.monto), 0);

  const conceptosList = pendiente.map((o: any, i: number) => 
    `${i + 1}. ${o.concepto || o.descripcion || o.tipo}: $${Number(o.monto).toLocaleString('es-MX')}`
  ).join('\n');

  const fmx = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  const ffd = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  let mensaje = `*${cfg['nombre_despacho'] || 'Collecta'}* - Recordatorio de Pago

Estimado *${client.nombre}*, le informamos que tiene los siguiente conceptos pendientes:

${conceptosList}

*TOTAL PENDIENTE: ${fmx(totalPendiente)}*

Para realizar su pago, puede usar los siguientes datos:
- Beneficiario: ${cfg['beneficiario'] || ''}
- Banco: ${cfg['banco'] || ''}
- CLABE: ${cfg['clabe'] || ''}

${cfg['depto'] || ''} | ${cfg['tel'] || ''}`;

  return mensaje;
}

export function buildWaUrl(phone: string, msg: string): string {
  let tel = phone.replace(/\D/g, '');
  if (!tel.startsWith('52')) tel = '52' + tel;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}
