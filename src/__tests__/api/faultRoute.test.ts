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

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DurableMatchStore,
  clearStaleE2EFaultSentinels,
  e2eFaultSentinelPath,
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
        body: { kind: 'append-head-update', mode: 'once', matchId: 'm-fault' },
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
        body: { kind: 'append-head-update', mode: 'once', matchId: 'm-fault' },
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
        body: { kind: 'append-head-update', mode: 'once', matchId: 'm-fault' },
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
        body: {
          kind: 'process-exit-before-commit',
          mode: 'once',
          matchId: 'm-fault',
        },
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
    expect(e2eFaultSentinelPath('process-exit-before-commit')).toBe(
      join('data', '.e2e-fault', RUN_ID, 'process-exit-before-commit'),
    );
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
        body: {
          kind: 'process-exit-after-commit',
          mode: 'once',
          matchId: 'm-fault',
        },
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
    expect(e2eFaultSentinelPath('process-exit-after-commit')).toBe(
      join('data', '.e2e-fault', RUN_ID, 'process-exit-after-commit'),
    );
    store.close();
  });
});

/**
 * The lever's own contract, which it did not meet (finding #72).
 *
 * The catalog header governing E2E-61..70 and design D9 both require every
 * fault seam to carry "explicit session scope". It carried none: the arm
 * was process-wide, so the next batch append on ANY match consumed it.
 * And the cross-graph sentinels were repo-relative
 * (`data/.e2e-fault-append-head-update`), not run-scoped, so a run that
 * armed a fault and died before consuming it left a live landmine for the
 * next run to trip over.
 *
 * Both are safe today only because the runner is single-worker and runs one
 * group at a time. Neither is safe for a failure pack that arms several
 * faults across several tests, which is what these rows exist to permit.
 */
describe('e2e fault route session scope (finding #72)', () => {
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

  it('refuses an arm that names no session scope', async () => {
    // An unscoped arm is the defect itself: it cannot say which session it
    // belongs to, so whichever append runs next wears it. `matchId` is
    // omitted deliberately here - that omission IS the case under test.
    const { res, record } = stubRes();
    await handler(
      req({
        method: 'POST',
        body: { kind: 'append-head-update', mode: 'once' },
        headers: { 'x-playwright-e2e-run-id': RUN_ID },
      }),
      res,
    );

    expect(record.status).toBe(400);
    expect(_isE2EFaultArmed('append-head-update')).toBe(false);
  });

  it("leaves a foreign match untouched by another match's armed fault", async () => {
    // The finding, stated as behaviour: arm against match A, drive match B,
    // and B must commit normally. Before the fix B took A's fault.
    await armFault({ kind: 'append-head-update', matchId: 'm-scoped-a' });

    const store = await seededStore(['m-scoped-a', 'm-scoped-b']);
    const committed = await store.appendCommandBatch(
      'm-scoped-b',
      batch('cmd-foreign-match'),
    );

    expect(committed.kind).toBe('committed');
    // ...and A's arm is still waiting for A, not burned by B.
    expect(_isE2EFaultArmed('append-head-update')).toBe(true);
    store.close();
  });

  it("leaves the foreign match's sentinel on disk, still armed and still able to fire", async () => {
    // The row above is NOT enough, and a mutant proved it: moving the
    // unlink ABOVE the scope compare in `consumeSentinelFault` left every
    // row green. `_isE2EFaultArmed` ORs the in-graph flag with the
    // sentinel file, and the in-graph flag is correctly scoped - so it
    // stays true and MASKS a sentinel that was wrongly consumed. The
    // cross-graph arm would then be silently gone, which is the arm that
    // matters: the socket host's store lives in the tsx graph and sees
    // ONLY the file.
    //
    // The three assertions below are one row on purpose, and their order
    // is the claim: B is untouched, THEN A's sentinel is still on disk,
    // THEN A still fires. Split apart they each pass under the mutant.
    await armFault({ kind: 'append-head-update', matchId: 'm-scoped-a' });
    const sentinelForA = e2eFaultSentinelPath('append-head-update');

    const store = await seededStore(['m-scoped-a', 'm-scoped-b']);
    const committed = await store.appendCommandBatch(
      'm-scoped-b',
      batch('cmd-foreign-untouched'),
    );
    expect(committed.kind).toBe('committed');

    // The file itself, not `_isE2EFaultArmed` - reading the disk is the
    // only assertion the in-graph flag cannot answer for.
    expect(existsSync(sentinelForA ?? '')).toBe(true);

    await expect(
      store.appendCommandBatch('m-scoped-a', batch('cmd-owner-after-foreign')),
    ).rejects.toThrow('test-crash-at-head-update');
    expect(existsSync(sentinelForA ?? '')).toBe(false);
    store.close();
  });

  it('fires for the match it was armed against', async () => {
    // The positive control for the row above: scoping must narrow the
    // fault, never disarm it. Without this, "nothing ever fires" passes.
    await armFault({ kind: 'append-head-update', matchId: 'm-scoped-a' });

    const store = await seededStore(['m-scoped-a', 'm-scoped-b']);
    await expect(
      store.appendCommandBatch('m-scoped-a', batch('cmd-own-match')),
    ).rejects.toThrow('test-crash-at-head-update');

    expect(await store.getEvents('m-scoped-a')).toEqual([]);
    store.close();
  });

  it('writes its sentinel under the current run, never a shared repo path', async () => {
    // The landmine half of the finding. The legacy path was a fixed
    // repo-relative file with no run in it, so an aborted run's sentinel
    // was indistinguishable from this run's.
    await armFault({ kind: 'append-head-update', matchId: 'm-fault' });

    expect(existsSync(join('data', '.e2e-fault-append-head-update'))).toBe(
      false,
    );
    expect(
      existsSync(join('data', '.e2e-fault', RUN_ID, 'append-head-update')),
    ).toBe(true);
  });
});

/**
 * E2E-63's letter names three failure points - "a middle event, head
 * update, or outbox insert" - and only the head update existed
 * (finding #75). These two rows are the other two, so the scenario can be
 * whole rather than claimed on a third of its own text.
 */
describe('e2e fault route batch failure points (finding #75)', () => {
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

  it.each(['append-event-insert', 'append-outbox-insert'] as const)(
    'arms %s and takes the whole batch down with it',
    async (kind) => {
      await armFault({ kind, matchId: 'm-fault' });

      const store = await seededStore(['m-fault']);
      await expect(
        store.appendCommandBatch('m-fault', multiEventBatch('cmd-partial')),
      ).rejects.toThrow(`test-${kind}`);

      // Atomicity is the whole point: a fault in the middle of the loop
      // must leave no events AND no publication rows behind.
      expect(await store.getEvents('m-fault')).toEqual([]);
      expect(await store.listPendingPublications('m-fault')).toEqual([]);
      expect(_isE2EFaultArmed(kind)).toBe(false);

      // And the next append is untouched by the consumed arm.
      const second = await store.appendCommandBatch(
        'm-fault',
        multiEventBatch('cmd-after-partial'),
      );
      expect(second.kind).toBe('committed');
      store.close();
    },
  );
});

/**
 * The start-up sweep (finding #72, landmine half).
 *
 * A run that arms a fault and dies before consuming it used to leave its
 * sentinel on disk under a fixed repo-relative name, indistinguishable
 * from a live one. Keying sentinels by run id makes a foreign one
 * identifiable; this sweep is what actually removes it, and it runs
 * before anything can trip over it.
 */
describe('stale fault sentinel sweep (finding #72)', () => {
  const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedRun = process.env.PLAYWRIGHT_E2E_RUN_ID;
  const foreignDir = join('data', '.e2e-fault', 'aborted-earlier-run');

  beforeEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env.PLAYWRIGHT_E2E_RUN_ID = RUN_ID;
    _resetE2EFaultsForTests();
    mkdirSync(foreignDir, { recursive: true });
    writeFileSync(
      join(foreignDir, 'append-head-update'),
      JSON.stringify({ matchId: 'm-from-a-dead-run' }),
    );
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = savedMode;
    process.env.PLAYWRIGHT_E2E_RUN_ID = savedRun;
    _resetE2EFaultsForTests();
    rmSync(join('data', '.e2e-fault', 'aborted-earlier-run'), {
      recursive: true,
      force: true,
    });
  });

  it("clears an aborted run's sentinels and keeps this run's", async () => {
    await armFault({ kind: 'append-head-update', matchId: 'm-fault' });
    const mine = e2eFaultSentinelPath('append-head-update');

    const cleared = clearStaleE2EFaultSentinels();

    expect(cleared).toBe(1);
    expect(existsSync(foreignDir)).toBe(false);
    // The sweep must never take this run's own arm with it - a cleanup
    // that disarms the live fault would make every failure row vacuous.
    expect(existsSync(mine ?? '')).toBe(true);
  });

  it('never sweeps outside e2e mode', () => {
    // The sweep deletes files. Outside e2e mode it must not run at all,
    // whatever happens to be sitting in the data directory.
    process.env.NEXT_PUBLIC_E2E_MODE = 'false';

    expect(clearStaleE2EFaultSentinels()).toBe(0);
    expect(existsSync(foreignDir)).toBe(true);
  });
});

/** Arm one fault through the route, asserting the route accepted it. */
async function armFault(input: {
  kind: string;
  matchId: string;
}): Promise<void> {
  const { res, record } = stubRes();
  await handler(
    req({
      method: 'POST',
      body: { kind: input.kind, mode: 'once', matchId: input.matchId },
      headers: { 'x-playwright-e2e-run-id': RUN_ID },
    }),
    res,
  );
  expect(record.status).toBe(200);
}

function event(sequence: number) {
  return {
    id: `evt-${sequence}`,
    type: 'phase_changed',
    sequence,
    timestamp: new Date().toISOString(),
    payload: {},
  } as never;
}

/** A batch with a real middle, so "fail the middle event" means something. */
function multiEventBatch(commandId: string) {
  return {
    commandId,
    actorId: 'pA',
    expectedRevision: 0,
    events: [event(0), event(1), event(2)],
  };
}

function batch(commandId: string) {
  return {
    commandId,
    actorId: 'pA',
    expectedRevision: 0,
    events: [event(0)],
  };
}

async function seededStore(
  matchIds: readonly string[] = ['m-fault'],
): Promise<DurableMatchStore> {
  const store = new DurableMatchStore({ path: ':memory:' });
  const now = new Date().toISOString();
  for (const matchId of matchIds) {
    await store.createMatch({
      matchId,
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
  }
  return store;
}
