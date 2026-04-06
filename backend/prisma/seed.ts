import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up
  await prisma.operation.deleteMany({});
  await prisma.client.deleteMany({});

  // 1. Clients
  const clients = [
    {
      rfc: 'XA-XX-010101-001',
      nombre: 'Constructora del Norte S.A.',
      regimen: 'General de Ley Personas Morales',
      categoria: 'VIP',
      asesor: 'Lic. Javier Canela',
      estado: 'ACTIVO',
    },
    {
      rfc: 'XA-XX-010101-002',
      nombre: 'Distribuidora Baja S. de R.L.',
      regimen: 'RESICO',
      categoria: 'General',
      asesor: 'Ing. Mateo Lopez',
      estado: 'ACTIVO',
    },
    {
      rfc: 'XA-XX-010101-003',
      nombre: 'Consultoría Integral MX',
      regimen: 'Sueldos y Salarios',
      categoria: 'Deudor',
      asesor: 'Lic. Javier Canela',
      estado: 'ACTIVO',
    },
  ];

  const createdClients = [];
  for (const c of clients) {
    const client = await prisma.client.create({ data: c });
    createdClients.push(client);
  }

  // 2. Operations
  const now = new Date();
  const operations = [
    {
      clientId: createdClients[0].id,
      tipo: 'IVA Mensual',
      descripcion: 'Declaración mensual de IVA - Febrero 2026',
      monto: 12500.50,
      fechaVence: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
      estatus: 'PENDIENTE',
      asesor: 'Lic. Javier Canela',
    },
    {
      clientId: createdClients[0].id,
      tipo: 'ISR Retenciones',
      descripcion: 'Retenciones por honorarios',
      monto: 3420.00,
      fechaVence: new Date(), // Hoy
      estatus: 'HOY VENCE',
      asesor: 'Lic. Javier Canela',
    },
    {
      clientId: createdClients[1].id,
      tipo: 'Pago Provisional ISR',
      descripcion: 'ISR RESICO Mensual',
      monto: 850.00,
      fechaVence: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10),
      fechaPago: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
      estatus: 'PAGADO',
      asesor: 'Ing. Mateo Lopez',
    },
    {
      clientId: createdClients[2].id,
      tipo: 'Multa SAT',
      descripcion: 'Multa por presentación extemporánea',
      monto: 5600.00,
      fechaVence: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
      estatus: 'VENCIDO',
      asesor: 'Lic. Javier Canela',
    },
    {
      clientId: createdClients[1].id,
      tipo: 'Honorarios BajaTax',
      descripcion: 'Servicios de contabilidad Marzo',
      monto: 1500.00,
      fechaVence: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15),
      estatus: 'PENDIENTE',
      asesor: 'Ing. Mateo Lopez',
    },
  ];

  for (const op of operations) {
    await prisma.operation.create({ data: op });
  }

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
