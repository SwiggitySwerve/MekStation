/**
 * The e2e fault route: guard, arm, one-shot consumption.
 *
 * The guard rows are the route's own mutant killers - a fault lever
 * reachable outside the Playwright-launched server would be a live
 * footgun, so unauthorized shapes answer 404 exactly like the
 * vault-identity seam. The one-shot rows prove the arm is consumed at
 * the failure point: exactly one append fails, the next succeeds.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import {
  DurableMatchStore,
  E2E_FAULT_SENTINELS,
  _isE2EFaultArmed,
  _isFailAtHeadUpdateArmed,
  _resetE2EFaultsForTests,
  _setE2EFaultProcessExitForTests,
  _setFailAtHeadUpdateForTests,
} from '@/lib/multiplayer/server/DurableMatchStore';
import { commitThenPublish } from '@/lib/multiplayer/server/ServerMatchHostPublication';
import handler from '@/pages-modules/api/e2eFaultRoute';

function stubRes() {
  const record: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      record.status = code;
      return res;
    },
    json(body: unknown) {
      record.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
    end() {
      return res;
    },
  };
  return { res: res as unknown as NextApiResponse, record };
}

function req(input: {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
}): NextApiRequest {
  return {
    method: input.method,
    body: input.body ?? {},
    headers: input.headers ?? {},
    query: {},
  } as unknown as NextApiRequest;
}

const RUN_ID = 'fault-suite-run';

describe('e2e fault route', () => {
  const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedRun = process.env.PLAYWRIGHT_E2E_RUN_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env.PLAYWRIGHT_E2E_RUN_ID = RUN_ID;
    _resetE2EFaultsForTests();
    _setFailAtHeadUpdateForTests(false);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = savedMode;
    process.env.PLAYWRIGHT_E2E_RUN_ID = savedRun;
    _resetE2EFaultsForTests();
    _setFailAtHeadUpdateForTests(false);
  });

  it('answers 404 outside e2e mode even with the right token', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'false';
    const { res, record } = stubRes();
    await handler(
      req({
        method: 'POST',
        body: { kind: 'append-head-update', mode: 'once' },
        headers: { 'x-playwright-e2e-run-id': RUN_ID },
      }),
      res,
    );
    expect(record.status).toBe(404);
    expect(_isFailAtHeadUpdateArmed()).toBe(false);
  });

  it('answers 404 for a wrong per-run token', async () => {
    const { res, record } = stubRes();
    await handler(
      req({
        method: 'POST',
        body: { kind: 'append-head-update', mode: 'once' },
        headers: { 'x-playwright-e2e-run-id': 'someone-else' },
      }),
      res,
    );
    expect(record.status).toBe(404);
    expect(_isFailAtHeadUpdateArmed()).toBe(false);
  });

  it('refuses any shape but the supported one-shot fault', async () => {
    const { res, record } = stubRes();
    await handler(
      req({
        method: 'POST',
        body: { kind: 'append-head-update', mode: 'sticky' },
        headers: { 'x-playwright-e2e-run-id': RUN_ID },
      }),
      res,
    );
    expect(record.status).toBe(400);
    expect(_isFailAtHeadUpdateArmed()).toBe(false);
  });

  it('arms exactly one append failure, and the next append succeeds', async () => {
    const { res, record } = stubRes();
    await handler(
      req({
        method: 'POST',
        body: { kind: 'append-head-update', mode: 'once' },
        headers: { 'x-playwright-e2e-run-id': RUN_ID },
      }),
      res,
    );
    expect(record).toEqual({
      status: 200,
      body: { success: true, armed: true },
    });

    const store = new DurableMatchStore({ path: ':memory:' });
    const now = new Date().toISOString();
    await store.createMatch({
      matchId: 'm-fault',
      hostPlayerId: 'pA',
      playerIds: ['pA', 'pB'],
      sideAssignments: [
        { playerId: 'pA', side: 'player' },
        { playerId: 'pB', side: 'opponent' },
      ],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 4, turnLimit: 5 },
    });
    const event = (sequence: number) =>
      ({
        id: `evt-${sequence}`,
        type: 'phase_changed',
        sequence,
        timestamp: now,
        payload: {},
      }) as never;

    // The ARMED append fails - and consumes the arm at the throw.
    await expect(
      store.appendCommandBatch('m-fault', {
        commandId: 'cmd-armed',
        actorId: 'pA',
        expectedRevision: 0,
        events: [event(0)],
      }),
    ).rejects.toThrow('test-crash-at-head-update');
    expect(_isFailAtHeadUpdateArmed()).toBe(false);
    // Nothing partial survived the rollback.
    expect(await store.getEvents('m-fault')).toHaveLength(0);
    expect(await store.listPendingPublications('m-fault')).toEqual([]);

    // The NEXT append is untouched by the consumed arm.
    const second = await store.appendCommandBatch('m-fault', {
      commandId: 'cmd-after',
      actorId: 'pA',
      expectedRevision: 0,
      events: [event(0)],
    });
    expect(second.kind).toBe('committed');
    store.close();
  });

  it('consumes a process exit before commit at the transactional failure point', async () => {
    const exitCodes: number[] = [];
    _setE2EFaultProcessExitForTests((code) => {
      exitCodes.push(code);
    });
    const { res, record } = stubRes();
    await handler(
      req({
        method: 'POST',
        body: { kind: 'process-exit-before-commit', mode: 'once' },
        headers: { 'x-playwright-e2e-run-id': RUN_ID },
      }),
      res,
    );
    expect(record.status).toBe(200);

    const store = await seededStore();
    await expect(
      store.appendCommandBatch('m-fault', batch('cmd-before-exit')),
    ).rejects.toThrow('test-process-exit-before-commit');

    expect(exitCodes).toEqual([1]);
    expect(_isE2EFaultArmed('process-exit-before-commit')).toBe(false);
    expect(await store.getEvents('m-fault')).toEqual([]);
    expect(await store.listPendingPublications('m-fault')).toEqual([]);
    expect(E2E_FAULT_SENTINELS['process-exit-before-commit']).toBeDefined();
    store.close();
  });

  it('consumes a process exit after commit before the publication loop', async () => {
    const exitCodes: number[] = [];
    const published: unknown[] = [];
    _setE2EFaultProcessExitForTests((code) => {
      exitCodes.push(code);
    });
    const { res } = stubRes();
    await handler(
      req({
        method: 'POST',
        body: { kind: 'process-exit-after-commit', mode: 'once' },
        headers: { 'x-playwright-e2e-run-id': RUN_ID },
      }),
      res,
    );

    const store = await seededStore();
    await expect(
      commitThenPublish({
        matchId: 'm-fault',
        events: [event(0)],
        appendEvent: async () => undefined,
        broadcast: () => {},
        broadcastEvent: async (message) => {
          published.push(message);
        },
        closeMatch: async () => {},
        publications: store,
        commitBatch: {
          commandId: 'cmd-after-exit',
          actorId: 'pA',
          append: (input) => store.appendCommandBatch('m-fault', input),
        },
      }),
    ).rejects.toThrow('test-process-exit-after-commit');

    expect(exitCodes).toEqual([1]);
    expect(_isE2EFaultArmed('process-exit-after-commit')).toBe(false);
    expect(await store.getEvents('m-fault')).toHaveLength(1);
    expect(await store.listPendingPublications('m-fault')).toHaveLength(1);
    expect(published).toEqual([]);
    expect(E2E_FAULT_SENTINELS['process-exit-after-commit']).toBeDefined();
    store.close();
  });
});

function event(sequence: number) {
  return {
    id: `evt-${sequence}`,
    type: 'phase_changed',
    sequence,
    timestamp: new Date().toISOString(),
    payload: {},
  } as never;
}

function batch(commandId: string) {
  return {
    commandId,
    actorId: 'pA',
    expectedRevision: 0,
    events: [event(0)],
  };
}

async function seededStore(): Promise<DurableMatchStore> {
  const store = new DurableMatchStore({ path: ':memory:' });
  const now = new Date().toISOString();
  await store.createMatch({
    matchId: 'm-fault',
    hostPlayerId: 'pA',
    playerIds: ['pA', 'pB'],
    sideAssignments: [
      { playerId: 'pA', side: 'player' },
      { playerId: 'pB', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  return store;
}
