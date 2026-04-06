import { prisma } from '../lib/prisma';

export interface ImportRow {
  rfc: string;
  nombre?: string;
  monto: number;
  concepto: string;
  fechaVence?: string;
  telefono?: string;
  email?: string;
}

export interface ImportResult {
  clientesCreados: number;
  clientesActualizados: number;
  operacionesCreadas: number;
  operacionesOmitidas: number;
  errores: string[];
}

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$/;

export async function processImportBatch(rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    clientesCreados: 0,
    clientesActualizados: 0,
    operacionesCreadas: 0,
    operacionesOmitidas: 0,
    errores: []
  };

  for (const row of rows) {
    try {
      if (!row.rfc || !RFC_REGEX.test(row.rfc.toUpperCase())) {
        result.errores.push(`RFC inválido: ${row.rfc}`);
        result.operacionesOmitidas++;
        continue;
      }

      const rfcUpper = row.rfc.toUpperCase();
      let client = await prisma.client.findUnique({ where: { rfc: rfcUpper } });

      if (!client) {
        client = await prisma.client.create({
          data: {
            rfc: rfcUpper,
            nombre: row.nombre || rfcUpper,
            telefono: row.telefono,
            email: row.email
          }
        });
        result.clientesCreados++;
      } else if (row.nombre || row.telefono || row.email) {
        client = await prisma.client.update({
          where: { id: client.id },
          data: {
            nombre: row.nombre || client.nombre,
            telefono: row.telefono || client.telefono,
            email: row.email || client.email
          }
        });
        result.clientesActualizados++;
      }

      const fechaVence = row.fechaVence 
        ? new Date(row.fechaVence) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const existingOp = await prisma.operation.findFirst({
        where: {
          clientId: client.id,
          tipo: row.concepto,
          monto: row.monto
        }
      });

      if (existingOp) {
        result.operacionesOmitidas++;
        continue;
      }

      await prisma.operation.create({
        data: {
          clientId: client.id,
          tipo: row.concepto,
          descripcion: row.concepto,
          monto: row.monto,
          fechaVence,
          estatus: 'PENDIENTE'
        }
      });
      result.operacionesCreadas++;

    } catch (error: any) {
      result.errores.push(`Error procesando ${row.rfc}: ${error.message}`);
      result.operacionesOmitidas++;
    }
  }

  return result;
}
