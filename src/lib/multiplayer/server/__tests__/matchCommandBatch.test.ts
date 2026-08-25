/**
 * Atomic match command batches (adopt-combat-event-journal-authority,
 * PR 1, tasks 1.1-1.3).
 *
 * The match store appends events ONE AT A TIME. A command that produces
 * several events therefore has no all-or-nothing boundary: a crash or a
 * constraint failure partway through leaves some of a command's events
 * committed and the rest gone, and every reader afterwards sees a
 * command that half happened. Nothing in the store can tell that apart
 * from a command that legitimately produced fewer events.
 *
 * These rows are written RED first, against a contract the store does
 * not implement yet:
 *
 *  - a batch commits entirely or not at all;
 *  - revisions are contiguous, so a gap is a detectable fault rather
 *    than something a reader has to tolerate;
 *  - a command carries a stable identity, so a retry after an ambiguous
 *    failure is recognised instead of applied twice;
 *  - reusing that identity for DIFFERENT work is an integrity conflict,
 *    not a silent overwrite;
 *  - and all of it survives a reopen, because a durability claim that
 *    only holds in one process is not durability.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta } from '../IMatchStore';

const MATCH_ID = 'match-batch';

/** SQLite leaves -wal/-shm beside the file; all three must go. */
function removeDatabase(file: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${file}${suffix}`, { force: true });
  }
}

function makeMeta(matchId: string): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20 },
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: '3025-01-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
  } as IGameEvent;
}

describe('atomic match command batches', () => {
  let store: DurableMatchStore;

  beforeEach(async () => {
    store = new DurableMatchStore({ path: ':memory:' });
    await store.createMatch(makeMeta(MATCH_ID));
  });

  afterEach(() => {
    store.close();
  });

  it('commits every event of a command or none of them', async () => {
    const result = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-1',
      actorId: 'p1',
      expectedRevision: 0,
      events: [makeEvent(MATCH_ID, 0), makeEvent(MATCH_ID, 1)],
    });

    expect(result.kind).toBe('committed');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(2);
  });

  it('rejects an out-of-order batch before writing any of it', () => {
    // NOTE what this does and does NOT prove. The contiguity rule runs
    // before the transaction, so this row proves the batch is refused
    // WITHOUT reaching the insert loop - it is not an atomicity proof.
    // The rollback row below is; an earlier version of this suite
    // conflated the two and passed with the transaction removed.
    return store
      .appendCommandBatch(MATCH_ID, {
        commandId: 'cmd-2',
        actorId: 'p1',
        expectedRevision: 1,
        events: [makeEvent(MATCH_ID, 1), makeEvent(MATCH_ID, 0)],
      })
      .then(async (result) => {
        expect(result.kind).toBe('non-contiguous');
        expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(0);
      });
  });

  it('rolls back events already inserted when a later one fails', async () => {
    // A well-formed batch that fails PARTWAY THROUGH the insert loop:
    // the first event serializes, the second throws. Without a
    // transaction the first row would survive and the command would
    // have half happened - which is the entire failure this contract
    // exists to prevent.
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const poisoned = makeEvent(MATCH_ID, 1);
    (poisoned as { payload: unknown }).payload = circular;

    await expect(
      store.appendCommandBatch(MATCH_ID, {
        commandId: 'cmd-poison',
        actorId: 'p1',
        expectedRevision: 0,
        events: [makeEvent(MATCH_ID, 0), poisoned],
      }),
    ).rejects.toThrow();

    // The first event is gone with the second, and no receipt survives
    // to make a retry look like a duplicate.
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(0);
    const retry = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-poison',
      actorId: 'p1',
      expectedRevision: 0,
      events: [makeEvent(MATCH_ID, 0)],
    });
    expect(retry.kind).toBe('committed');
  });

  it('refuses a batch that would leave a gap in the revisions', async () => {
    // Skipping a revision is not a smaller log, it is an UNDETECTABLE
    // one: a reader cannot tell a skipped revision from an event it
    // failed to receive.
    const result = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-gap',
      actorId: 'p1',
      expectedRevision: 0,
      events: [makeEvent(MATCH_ID, 0), makeEvent(MATCH_ID, 2)],
    });

    expect(result.kind).toBe('non-contiguous');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(0);
  });

  it('reports a revision conflict without writing anything', async () => {
    await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-1',
      actorId: 'p1',
      expectedRevision: 0,
      events: [makeEvent(MATCH_ID, 0)],
    });

    // The batch is internally well-formed - it starts exactly at the
    // revision the caller believes in. What is stale is the BELIEF: the
    // stream already moved to 1 while this caller was deciding.
    const result = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-2',
      actorId: 'p2',
      expectedRevision: 0,
      events: [makeEvent(MATCH_ID, 0)],
    });

    expect(result.kind).toBe('revision-conflict');
    if (result.kind !== 'revision-conflict') return;
    expect(result.actualRevision).toBe(1);
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(1);
  });

  it('recognises an identical retry instead of applying it twice', async () => {
    const batch = {
      commandId: 'cmd-retry',
      actorId: 'p1',
      expectedRevision: 0,
      events: [makeEvent(MATCH_ID, 0)],
    };
    const first = await store.appendCommandBatch(MATCH_ID, batch);
    expect(first.kind).toBe('committed');

    // A client that never saw the acknowledgement retries. Applying it
    // again would double every effect the command had.
    const retry = await store.appendCommandBatch(MATCH_ID, batch);

    expect(retry.kind).toBe('duplicate-command');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(1);
  });

  it('rejects a reused command identity carrying different work', async () => {
    await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-x',
      actorId: 'p1',
      expectedRevision: 0,
      events: [makeEvent(MATCH_ID, 0)],
    });

    // Same identity, different actor. Treating this as a retry would
    // let one player's command be silently attributed to another's.
    const result = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-x',
      actorId: 'p2',
      expectedRevision: 1,
      events: [makeEvent(MATCH_ID, 1)],
    });

    expect(result.kind).toBe('integrity-conflict');
    expect(await store.getEvents(MATCH_ID, 0)).toHaveLength(1);
  });

  it('keeps receipts and revisions across a reopen', async () => {
    // A file of this run's own, removed both before and after: a
    // leftover database from an earlier run would make this row pass by
    // reading someone else's receipts.
    const file = path.join(
      __dirname,
      '../../../../../test-results/gm-two-player',
      `batch-reopen-${process.pid}.db`,
    );
    removeDatabase(file);
    const first = new DurableMatchStore({ path: file });
    try {
      await first.createMatch(makeMeta('match-reopen'));
      await first.appendCommandBatch('match-reopen', {
        commandId: 'cmd-durable',
        actorId: 'p1',
        expectedRevision: 0,
        events: [makeEvent('match-reopen', 0), makeEvent('match-reopen', 1)],
      });
    } finally {
      first.close();
    }

    const reopened = new DurableMatchStore({ path: file });
    try {
      // A durability claim that only holds in one process is not
      // durability: the retry must still be recognised after restart.
      const retry = await reopened.appendCommandBatch('match-reopen', {
        commandId: 'cmd-durable',
        actorId: 'p1',
        expectedRevision: 0,
        events: [makeEvent('match-reopen', 0), makeEvent('match-reopen', 1)],
      });
      expect(retry.kind).toBe('duplicate-command');
      expect(await reopened.getEvents('match-reopen', 0)).toHaveLength(2);
    } finally {
      reopened.close();
      removeDatabase(file);
    }
  });
});
