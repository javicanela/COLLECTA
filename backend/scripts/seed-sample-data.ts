import { PrismaClient } from '@prisma/client';
import { evaluateTestDbSafety } from '../src/lib/dbSafety';

const clients = [
  { rfc: 'SAFE010101AA1', nombre: 'Cliente de prueba 01', telefono: '5215555550101', email: 'prueba01@collecta.test' },
  { rfc: 'SAFE020202BB2', nombre: 'Cliente de prueba 02', telefono: '5215555550102', email: 'prueba02@collecta.test' },
  { rfc: 'SAFE030303CC3', nombre: 'Cliente de prueba 03', telefono: '5215555550103', email: 'prueba03@collecta.test' },
  { rfc: 'SAFE040404DD4', nombre: 'Cliente de prueba 04', telefono: '5215555550104', email: 'prueba04@collecta.test' },
  { rfc: 'SAFE050505EE5', nombre: 'Cliente de prueba 05', telefono: '5215555550105', email: 'prueba05@collecta.test' },
  { rfc: 'SAFE060606FF6', nombre: 'Cliente de prueba 06', telefono: '5215555550106', email: 'prueba06@collecta.test' },
  { rfc: 'SAFE070707GG7', nombre: 'Cliente de prueba 07', telefono: '5215555550107', email: 'prueba07@collecta.test' },
  { rfc: 'SAFE080808HH8', nombre: 'Cliente de prueba 08', telefono: '5215555550108', email: 'prueba08@collecta.test' },
  { rfc: 'SAFE090909II9', nombre: 'Cliente de prueba 09', telefono: '5215555550109', email: 'prueba09@collecta.test' },
  { rfc: 'SAFE101010JJ0', nombre: 'Cliente de prueba 10', telefono: '5215555550110', email: 'prueba10@collecta.test' },
];

async function main() {
  const safety = evaluateTestDbSafety(process.env.DATABASE_URL || '', process.env);
  if (!safety.safe) {
    console.error('[seed-sample-data] Abort:', safety.reason);
    process.exit(2);
  }

  const prisma = new PrismaClient();

  for (const c of clients) {
    const cli = await prisma.client.upsert({
      where: { rfc: c.rfc },
      update: c,
      create: c,
    });

    await prisma.operation.upsert({
      where: { id: `seed-op-${c.rfc}` },
      update: {},
      create: {
        id: `seed-op-${c.rfc}`,
        clientId: cli.id,
        tipo: 'HONORARIOS',
        descripcion: 'Operacion de prueba controlada',
        monto: 1500,
        fechaVence: new Date(Date.now() + 7 * 86400000),
        estatus: 'PENDIENTE',
      },
    });
  }

  console.log('[seed-sample-data] OK - 10 clientes y 10 operaciones de prueba upserted.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
