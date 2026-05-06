import type { Client, Operation } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createEstadoCuentaPdfBuffer, type EstadoCuentaData } from './pdfGenerator';

export class StatementPdfError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'StatementPdfError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function buildFileName(rfc: string, date = new Date()) {
  return `estado_cuenta_${rfc}_${date.toISOString().slice(0, 10)}.pdf`;
}

function toStatementData(
  client: Client,
  operations: Operation[],
  configRows: Array<{ key: string; value: string }>,
): EstadoCuentaData {
  const config: Record<string, string> = {};
  for (const row of configRows) {
    config[row.key] = row.value;
  }

  const pendientes = operations.map(operation => ({
    tipo: operation.tipo,
    descripcion: operation.descripcion || operation.tipo,
    monto: operation.monto,
    fechaVence: operation.fechaVence.toISOString(),
    diasRestantes: Math.ceil((operation.fechaVence.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  }));

  return {
    cliente: {
      nombre: client.nombre,
      rfc: client.rfc,
      telefono: client.telefono || undefined,
      email: client.email || undefined,
    },
    pendientes,
    pagados: [],
    totalPendiente: pendientes.reduce((sum, item) => sum + item.monto, 0),
    totalPagado: 0,
    config,
  };
}

export async function generateClientStatementPdfBuffer(clientRfc: string): Promise<{
  buffer: Buffer;
  fileName: string;
  client: Client;
  operations: Operation[];
}> {
  const rfc = clientRfc.trim().toUpperCase();
  const client = await prisma.client.findUnique({ where: { rfc } });

  if (!client) {
    throw new StatementPdfError('CLIENT_NOT_FOUND', 'Client not found', 404);
  }

  const [operations, configRows] = await Promise.all([
    prisma.operation.findMany({
      where: {
        clientId: client.id,
        fechaPago: null,
        excluir: false,
        archived: false,
        estatus: { not: 'PAGADO' },
      },
      orderBy: { fechaVence: 'asc' },
    }),
    prisma.config.findMany(),
  ]);

  const data = toStatementData(client, operations, configRows);
  const buffer = await createEstadoCuentaPdfBuffer(data);

  return {
    buffer,
    fileName: buildFileName(rfc),
    client,
    operations,
  };
}
