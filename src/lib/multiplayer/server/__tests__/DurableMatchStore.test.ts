/**
 * DurableMatchStore unit + contract tests — harden-multiplayer-transport
 * (M2), tasks 1.x.
 *
 * The durable store is exercised against the SAME contract as
 * `InMemoryMatchStore` (round-trip meta + event log, sequence-collision
 * rejection, ascending-order guarantee, idempotent close) plus its own
 * durability behaviors: survives a re-open, transactional append,
 * active-match enumeration, and 7-day retention pruning.
 *
 * Every store in this suite is opened at `:memory:` so the tests never
 * touch disk; `:memory:` still exercises the full SQLite transactional
 * path including the `(match_id, sequence)` unique constraint.
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  COMPLETED_MATCH_RETENTION_MS,
  DurableMatchStore,
} from '../DurableMatchStore';
import {
  MatchNotFoundError,
  MatchStoreSequenceCollisionError,
  type IMatchMeta,
} from '../IMatchStore';

function makeMeta(
  matchId: string,
  overrides: Partial<IMatchMeta> = {},
): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20 },
    ...overrides,
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: new Date().toISOString(),
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
  } as IGameEvent;
}

describe('DurableMatchStore', () => {
  let store: DurableMatchStore;

  beforeEach(() => {
    store = new DurableMatchStore({ path: ':memory:' });
  });

  afterEach(() => {
    store.close();
  });

  // ---------------------------------------------------------------------------
  // IMatchStore contract — same shape as InMemoryMatchStore.test.ts
  // ---------------------------------------------------------------------------

  it('creates a match and exposes meta', async () => {
    await store.createMatch(makeMeta('m-1'));
    const got = await store.getMatchMeta('m-1');
    expect(got.matchId).toBe('m-1');
    expect(store.size()).toBe(1);
  });

  it('rejects duplicate createMatch with the same id', async () => {
    await store.createMatch(makeMeta('dup'));
    await expect(store.createMatch(makeMeta('dup'))).rejects.toThrow(
      /already exists/,
    );
  });

  it('appends events in ascending order', async () => {
    await store.createMatch(makeMeta('m-2'));
    await store.appendEvent('m-2', makeEvent('m-2', 0));
    await store.appendEvent('m-2', makeEvent('m-2', 1));
    await store.appendEvent('m-2', makeEvent('m-2', 2));
    const events = await store.getEvents('m-2');
    expect(events.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it('rejects a sequence collision with MatchStoreSequenceCollisionError', async () => {
    await store.createMatch(makeMeta('m-3'));
    await store.appendEvent('m-3', makeEvent('m-3', 0));
    await expect(
      store.appendEvent('m-3', makeEvent('m-3', 0)),
    ).rejects.toBeInstanceOf(MatchStoreSequenceCollisionError);
  });

  it('leaves the store untouched after a rejected colliding append', async () => {
    await store.createMatch(makeMeta('m-3b'));
    await store.appendEvent('m-3b', makeEvent('m-3b', 0));
    await expect(
      store.appendEvent('m-3b', makeEvent('m-3b', 0)),
    ).rejects.toBeInstanceOf(MatchStoreSequenceCollisionError);
    const events = await store.getEvents('m-3b');
    expect(events).toHaveLength(1); // the colliding write did not land
  });

  it('returns events filtered by fromSeq', async () => {
    await store.createMatch(makeMeta('m-4'));
    for (let i = 0; i < 5; i++) {
      await store.appendEvent('m-4', makeEvent('m-4', i));
    }
    const tail = await store.getEvents('m-4', 3);
    expect(tail.map((e) => e.sequence)).toEqual([3, 4]);
  });

  it('throws MatchNotFoundError for an unknown match', async () => {
    await expect(store.getEvents('nope')).rejects.toBeInstanceOf(
      MatchNotFoundError,
    );
    await expect(store.getMatchMeta('nope')).rejects.toBeInstanceOf(
      MatchNotFoundError,
    );
    await expect(
      store.appendEvent('nope', makeEvent('nope', 0)),
    ).rejects.toBeInstanceOf(MatchNotFoundError);
  });

  it('updateMatchMeta merges patch + bumps updatedAt', async () => {
    await store.createMatch(makeMeta('m-5'));
    const before = await store.getMatchMeta('m-5');
    await new Promise((r) => setTimeout(r, 5));
    await store.updateMatchMeta('m-5', { status: 'active' });
    const after = await store.getMatchMeta('m-5');
    expect(after.status).toBe('active');
    expect(after.updatedAt >= before.updatedAt).toBe(true);
  });

  it('updateMatchMeta clears roomCode on explicit null', async () => {
    await store.createMatch(makeMeta('m-5b', { roomCode: 'ABC123' }));
    await store.updateMatchMeta('m-5b', { roomCode: null });
    const after = await store.getMatchMeta('m-5b');
    expect(after.roomCode).toBeUndefined();
  });

  it('closeMatch is idempotent and flips status to completed', async () => {
    await store.createMatch(makeMeta('m-6'));
    await store.closeMatch('m-6');
    await store.closeMatch('m-6'); // must not throw
    const meta = await store.getMatchMeta('m-6');
    expect(meta.status).toBe('completed');
  });

  it('closeMatch on an unknown match is a no-op', async () => {
    await expect(store.closeMatch('ghost')).resolves.toBeUndefined();
  });

  it('resolves a match by its room code only while in lobby', async () => {
    await store.createMatch(makeMeta('m-7', { roomCode: 'ROOM01' }));
    const found = await store.getMatchByRoomCode('room01');
    expect(found?.matchId).toBe('m-7');
    // Once active the invite stops resolving.
    await store.updateMatchMeta('m-7', { status: 'active' });
    expect(await store.getMatchByRoomCode('room01')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Durability — survives a re-open against the same on-disk file
  // ---------------------------------------------------------------------------

  it('survives a process restart (re-open) with the full event log intact', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dbPath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mp-durable-')),
      'matches.db',
    );

    const first = new DurableMatchStore({ path: dbPath });
    await first.createMatch(makeMeta('restart-1', { status: 'active' }));
    for (let i = 0; i < 30; i++) {
      await first.appendEvent('restart-1', makeEvent('restart-1', i));
    }
    first.close();

    // Re-open: the durable store reads the same SQLite file.
    const second = new DurableMatchStore({ path: dbPath });
    const meta = await second.getMatchMeta('restart-1');
    expect(meta.matchId).toBe('restart-1');
    const events = await second.getEvents('restart-1');
    expect(events.map((e) => e.sequence)).toEqual(
      Array.from({ length: 30 }, (_, i) => i),
    );
    second.close();

    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Recovery surface — listActiveMatches
  // ---------------------------------------------------------------------------

  it('enumerates only active matches via listActiveMatches', async () => {
    await store.createMatch(makeMeta('lobby-m', { status: 'lobby' }));
    await store.createMatch(makeMeta('active-1', { status: 'active' }));
    await store.createMatch(makeMeta('active-2', { status: 'active' }));
    await store.createMatch(makeMeta('done-m', { status: 'completed' }));
    const active = await store.listActiveMatches();
    expect(active.map((m) => m.matchId).sort()).toEqual([
      'active-1',
      'active-2',
    ]);
  });

  // ---------------------------------------------------------------------------
  // Retention — 7-day prune of completed matches
  // ---------------------------------------------------------------------------

  it('prunes completed matches older than the 7-day retention window', async () => {
    const now = Date.now();
    const old = new Date(
      now - COMPLETED_MATCH_RETENTION_MS - 60_000,
    ).toISOString();
    await store.createMatch(
      makeMeta('stale', { status: 'completed', updatedAt: old }),
    );
    await store.createMatch(makeMeta('fresh', { status: 'completed' }));
    await store.createMatch(makeMeta('live', { status: 'active' }));

    const pruned = store.pruneExpiredMatches(now);
    expect(pruned).toBe(1);
    expect(store.size()).toBe(2);
    await expect(store.getMatchMeta('stale')).rejects.toBeInstanceOf(
      MatchNotFoundError,
    );
    await expect(store.getMatchMeta('fresh')).resolves.toBeDefined();
  });
});
