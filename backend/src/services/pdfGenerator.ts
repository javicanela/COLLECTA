import { prisma } from '../lib/prisma';

export interface EstadoCuentaData {
  cliente: {
    nombre: string;
    rfc: string;
    telefono?: string;
    email?: string;
  };
  pendientes: Array<{
    tipo: string;
    descripcion: string;
    monto: number;
    fechaVence: string;
    diasRestantes: number;
  }>;
  pagados: Array<{
    tipo: string;
    descripcion: string;
    monto: number;
    fechaPago: string;
  }>;
  totalPendiente: number;
  totalPagado: number;
  config: Record<string, string>;
}

export async function generateEstadoCuenta(rfc: string): Promise<EstadoCuentaData> {
  const client = await prisma.client.findUnique({ where: { rfc: rfc.toUpperCase() } });
  if (!client) throw new Error('Client not found');

  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

  const operations = await prisma.operation.findMany({
    where: {
      clientId: client.id,
      fechaVence: { gte: tresMesesAtras }
    },
    orderBy: { fechaVence: 'desc' }
  });

  const configRows = await prisma.config.findMany();
  const cfg: Record<string, string> = {};
  configRows.forEach(c => cfg[c.key] = c.value);

  const pendientes = operations
    .filter(o => !o.fechaPago && !o.excluir)
    .map(o => ({
      tipo: o.tipo,
      descripcion: o.descripcion || o.tipo,
      monto: o.monto,
      fechaVence: o.fechaVence.toISOString(),
      diasRestantes: Math.ceil((new Date(o.fechaVence).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }));

  const pagados = operations
    .filter(o => o.fechaPago)
    .map(o => ({
      tipo: o.tipo,
      descripcion: o.descripcion || o.tipo,
      monto: o.monto,
      fechaPago: o.fechaPago!.toISOString()
    }));

  return {
    cliente: {
      nombre: client.nombre,
      rfc: client.rfc,
      telefono: client.telefono || undefined,
      email: client.email || undefined
    },
    pendientes,
    pagados,
    totalPendiente: pendientes.reduce((sum, p) => sum + p.monto, 0),
    totalPagado: pagados.reduce((sum, p) => sum + p.monto, 0),
    config: cfg
  };
}
