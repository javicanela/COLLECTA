import { PrismaClient } from '@prisma/client';
import { evaluateTestDbSafety } from '../src/lib/dbSafety';

const clients = [
  { rfc: 'DEMO010101AAA', nombre: 'Demo Cliente 01', telefono: '5215555550101', email: 'demo01@example.com' },
  { rfc: 'DEMO020202BBB', nombre: 'Demo Cliente 02', telefono: '5215555550102', email: 'demo02@example.com' },
  { rfc: 'DEMO030303CCC', nombre: 'Demo Cliente 03', telefono: '5215555550103', email: 'demo03@example.com' },
  { rfc: 'DEMO040404DDD', nombre: 'Demo Cliente 04', telefono: '5215555550104', email: 'demo04@example.com' },
  { rfc: 'DEMO050505EEE', nombre: 'Demo Cliente 05', telefono: '5215555550105', email: 'demo05@example.com' },
  { rfc: 'DEMO060606FFF', nombre: 'Demo Cliente 06', telefono: '5215555550106', email: 'demo06@example.com' },
  { rfc: 'DEMO070707GGG', nombre: 'Demo Cliente 07', telefono: '5215555550107', email: 'demo07@example.com' },
  { rfc: 'DEMO080888HHH', nombre: 'Demo Cliente 08', telefono: '5215555550108', email: 'demo08@example.com' },
  { rfc: 'DEMO090909III', nombre: 'Demo Cliente 09', telefono: '5215555550109', email: 'demo09@example.com' },
  { rfc: 'DEMO101010JJJ', nombre: 'Demo Cliente 10', telefono: '5215555550110', email: 'demo10@example.com' },
];

async function main() {
  const safety = evaluateTestDbSafety(process.env.DATABASE_URL || '', process.env);
  if (!safety.safe) {
    console.error('[seed-demo-data] Abort:', safety.reason);
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
        descripcion: 'Operacion demo',
        monto: 1500,
        fechaVence: new Date(Date.now() + 7 * 86400000),
        estatus: 'PENDIENTE',
      },
    });
  }

  console.log('[seed-demo-data] OK - 10 clientes y 10 operaciones demo upserted.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
