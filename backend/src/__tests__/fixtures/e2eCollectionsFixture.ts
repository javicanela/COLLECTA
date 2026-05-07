import type { Client, Operation, PrismaClient } from '@prisma/client';

export const E2E_RFC_PREFIX = 'E2E';

export const e2eClients = [
  {
    key: 'primary',
    rfc: 'E2E010101AA1',
    nombre: 'E2E Cliente Cobranza',
    telefono: '+52 664 900 0001',
    email: 'e2e.collecta@example.com',
    asesor: 'E2E QA',
  },
] as const;

type E2EClientKey = typeof e2eClients[number]['key'];

type E2EFixture = {
  clients: Record<E2EClientKey, Client>;
  operations: {
    vencida: Operation;
    hoy: Operation;
    porVencer: Operation;
    excluida: Operation;
    pagada: Operation;
    archivada: Operation;
  };
};

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('52') ? digits : `52${digits}`;
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function hasSafeDatabaseMarker(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, '')).toLowerCase();
  const username = decodeURIComponent(parsed.username || '').toLowerCase();
  const marker = `${host} ${databaseName} ${username}`;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

  return (
    localHosts.has(host) ||
    /(^|[^a-z0-9])(test|e2e|local)([^a-z0-9]|$)/.test(marker) ||
    marker.includes('_test') ||
    marker.includes('-test')
  );
}

export function assertSafeTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('E2E fixture seeding is blocked outside NODE_ENV=test');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !hasSafeDatabaseMarker(databaseUrl)) {
    throw new Error('E2E fixture seeding requires a clearly test/local DATABASE_URL');
  }
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])];
}

function e2ePhones(clientPhones: Array<string | null | undefined> = []) {
  const rawPhones = unique([
    ...e2eClients.map(client => client.telefono),
    ...clientPhones,
  ]);
  return unique([...rawPhones, ...rawPhones.map(normalizePhone)]);
}

export async function cleanupE2EData(prisma: PrismaClient) {
  assertSafeTestDatabase();

  const clients = await prisma.client.findMany({
    where: { rfc: { startsWith: E2E_RFC_PREFIX } },
    select: { id: true, telefono: true },
  });
  const clientIds = clients.map(client => client.id);
  const phones = e2ePhones(clients.map(client => client.telefono));
  const clientScoped = clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : [];

  await prisma.whatsAppMessage.deleteMany({
    where: {
      OR: [
        ...clientScoped,
        { phone: { in: phones } },
        { content: { contains: E2E_RFC_PREFIX } },
      ],
    },
  });

  const actions = await prisma.agentAction.findMany({
    where: {
      OR: [
        ...clientScoped,
        { phone: { in: phones } },
        { message: { contains: E2E_RFC_PREFIX } },
      ],
    },
    select: { id: true, executionId: true },
  });

  if (actions.length > 0) {
    await prisma.agentAction.deleteMany({
      where: { id: { in: actions.map(action => action.id) } },
    });
  }

  for (const executionId of unique(actions.map(action => action.executionId))) {
    const remainingActions = await prisma.agentAction.count({ where: { executionId } });
    if (remainingActions === 0) {
      await prisma.agentExecution.delete({ where: { id: executionId } }).catch(() => undefined);
    }
  }

  await prisma.logEntry.deleteMany({
    where: {
      OR: [
        ...clientScoped,
        { telefono: { in: phones } },
        { mensaje: { contains: E2E_RFC_PREFIX } },
      ],
    },
  });

  if (clientIds.length > 0) {
    await prisma.operation.deleteMany({
      where: { clientId: { in: clientIds } },
    });
  }

  await prisma.client.deleteMany({
    where: { rfc: { startsWith: E2E_RFC_PREFIX } },
  });
}

export async function seedE2ECollectionsFixture(prisma: PrismaClient): Promise<E2EFixture> {
  assertSafeTestDatabase();
  await cleanupE2EData(prisma);

  const today = startOfLocalDay();
  const primary = await prisma.client.create({
    data: {
      rfc: e2eClients[0].rfc,
      nombre: e2eClients[0].nombre,
      telefono: e2eClients[0].telefono,
      email: e2eClients[0].email,
      asesor: e2eClients[0].asesor,
      estado: 'ACTIVO',
    },
  });

  const baseOperation = {
    clientId: primary.id,
    tipo: 'FISCAL',
    asesor: e2eClients[0].asesor,
    estatus: 'PENDIENTE',
  };

  const operations = {
    vencida: await prisma.operation.create({
      data: {
        ...baseOperation,
        descripcion: 'E2E vencida',
        monto: 1100,
        fechaVence: addDays(today, -2),
      },
    }),
    hoy: await prisma.operation.create({
      data: {
        ...baseOperation,
        descripcion: 'E2E hoy',
        monto: 2200,
        fechaVence: today,
      },
    }),
    porVencer: await prisma.operation.create({
      data: {
        ...baseOperation,
        descripcion: 'E2E por vencer',
        monto: 3300,
        fechaVence: addDays(today, 3),
      },
    }),
    excluida: await prisma.operation.create({
      data: {
        ...baseOperation,
        descripcion: 'E2E excluida',
        monto: 4400,
        fechaVence: addDays(today, -1),
        excluir: true,
      },
    }),
    pagada: await prisma.operation.create({
      data: {
        ...baseOperation,
        descripcion: 'E2E pagada',
        monto: 5500,
        fechaVence: addDays(today, -3),
        estatus: 'PAGADO',
        fechaPago: today,
      },
    }),
    archivada: await prisma.operation.create({
      data: {
        ...baseOperation,
        descripcion: 'E2E archivada',
        monto: 6600,
        fechaVence: addDays(today, -4),
        archived: true,
      },
    }),
  };

  return {
    clients: { primary },
    operations,
  };
}
