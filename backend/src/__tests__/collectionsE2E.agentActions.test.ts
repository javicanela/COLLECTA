import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupE2EData, seedE2ECollectionsFixture } from './fixtures/e2eCollectionsFixture';
import { prisma, req, TEST_AUTH } from './test-app';

describe('Collections E2E: agent execution and approval', () => {
  beforeEach(async () => {
    await cleanupE2EData(prisma);
  });

  afterEach(async () => {
    await cleanupE2EData(prisma);
  });

  it('plans one pending handoff action and approves it through the real routes', async () => {
    const fixture = await seedE2ECollectionsFixture(prisma);

    const started = await req
      .post('/api/agent/execution/start')
      .set(TEST_AUTH.headers)
      .send({});

    expect(started.status).toBe(201);
    expect(started.body.summary).toMatchObject({
      planned: 1,
      approvalRequired: 1,
      automatic: 0,
    });

    const pending = await req
      .get('/api/agent/actions/pending')
      .set(TEST_AUTH.headers);

    expect(pending.status).toBe(200);
    const [action] = pending.body.actions.filter((item: { phone: string }) =>
      item.phone === fixture.clients.primary.telefono,
    );
    expect(action).toMatchObject({
      type: 'WHATSAPP_MESSAGE',
      status: 'PENDING',
      phone: fixture.clients.primary.telefono,
    });

    const approved = await req
      .post(`/api/agent/actions/approve/${action.id}`)
      .set(TEST_AUTH.headers)
      .send({});

    expect(approved.status).toBe(200);
    expect(approved.body.action).toMatchObject({
      id: action.id,
      status: 'EXECUTING',
    });

    const stored = await prisma.agentAction.findUnique({ where: { id: action.id } });
    expect(stored?.status).toBe('EXECUTING');

    const approvalLog = await prisma.logEntry.findFirst({
      where: {
        tipo: 'AGENT_ACTION_APPROVED',
        telefono: fixture.clients.primary.telefono,
      },
    });
    expect(approvalLog).toMatchObject({
      resultado: 'APPROVED',
      modo: 'CONTROLLED_OPERATOR',
    });
  });
});
