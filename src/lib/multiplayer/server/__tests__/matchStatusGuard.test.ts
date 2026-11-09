/**
 * M-H1 (Wave 4): every MatchStatus writer goes through one transition guard.
 *
 * Runs against both stores. `patchMatchMeta` is the shared chokepoint for
 * `updateMatchMeta` and `closeMatch`; create is guarded separately because
 * no production path creates a finished match.
 */

import type Database from 'better-sqlite3';

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta, type IMatchStore } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

const TRANSITION_ERROR = { name: 'InvalidMatchStatusTransitionError' };

function makeMeta(
  matchId: string,
  status: IMatchMeta['status'] = 'lobby',
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
    status,
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20 },
  };
}

/** A match in `status`, reached only through legal writers. */
async function matchIn(
  store: IMatchStore,
  matchId: string,
  status: IMatchMeta['status'],
): Promise<void> {
  await store.createMatch(
    makeMeta(matchId, status === 'lobby' ? 'lobby' : 'active'),
  );
  if (status === 'completed') await store.closeMatch(matchId);
}

describe.each([
  [
    'InMemoryMatchStore',
    () => ({
      store: new InMemoryMatchStore({ quiet: true }) as IMatchStore,
      db: null as Database.Database | null,
      close: () => undefined,
    }),
  ],
  [
    'DurableMatchStore',
    () => {
      const durable = new DurableMatchStore({ path: ':memory:' });
      return {
        store: durable as IMatchStore,
        db: durable.getDatabase(),
        close: () => durable.close(),
      };
    },
  ],
])('%s match status guard', (_name, build) => {
  let store: IMatchStore;
  let db: Database.Database | null;
  let close: () => void;

  beforeEach(() => {
    ({ store, db, close } = build());
  });
  afterEach(() => close());

  /** SQLite keeps a denormalised column beside meta_json; they must agree. */
  const expectColumnAgrees = (matchId: string): void => {
    if (!db) return;
    const row = db
      .prepare(
        "SELECT status, json_extract(meta_json, '$.status') AS meta_status FROM mp_matches WHERE match_id = ?",
      )
      .get(matchId) as { status: string; meta_status: string };
    expect(row.status).toBe(row.meta_status);
  };

  it.each([
    ['completed', 'active'],
    ['completed', 'lobby'],
    ['active', 'lobby'],
  ] as const)('refuses %s -> %s and changes nothing', async (from, to) => {
    await matchIn(store, 'm', from);
    const before = await store.getMatchMeta('m');

    await expect(
      store.updateMatchMeta('m', { status: to, hostPlayerId: 'intruder' }),
    ).rejects.toMatchObject(TRANSITION_ERROR);

    expect(await store.getMatchMeta('m')).toEqual(before);
    expect(await store.listMatches({ status: to })).toEqual([]);
    expectColumnAgrees('m');
  });

  it('allows lobby -> active -> completed and lobby -> completed', async () => {
    await matchIn(store, 'a', 'lobby');
    await store.updateMatchMeta('a', { status: 'active' });
    expect((await store.getMatchMeta('a')).status).toBe('active');
    expectColumnAgrees('a');
    await store.closeMatch('a');
    expect((await store.getMatchMeta('a')).status).toBe('completed');
    expectColumnAgrees('a');

    await matchIn(store, 'b', 'lobby');
    await store.closeMatch('b');
    expect((await store.getMatchMeta('b')).status).toBe('completed');

    await matchIn(store, 'c', 'lobby');
    await store.updateMatchMeta('c', { status: 'completed' });
    expect((await store.getMatchMeta('c')).status).toBe('completed');
    expectColumnAgrees('c');
  });

  it('treats a same-status patch as legal, including on a completed match', async () => {
    await matchIn(store, 'm', 'completed');
    await store.updateMatchMeta('m', {
      status: 'completed',
      hostPlayerId: 'p2',
    });
    expect((await store.getMatchMeta('m')).hostPlayerId).toBe('p2');
  });

  it('keeps closeMatch idempotent on a completed match', async () => {
    await matchIn(store, 'm', 'completed');
    await expect(store.closeMatch('m')).resolves.toBeUndefined();
    expect((await store.getMatchMeta('m')).status).toBe('completed');
  });

  it('refuses to create a completed match and stores nothing', async () => {
    await expect(
      store.createMatch(makeMeta('born-done', 'completed')),
    ).rejects.toMatchObject(TRANSITION_ERROR);
    await expect(store.getMatchMeta('born-done')).rejects.toMatchObject({
      name: 'MatchNotFoundError',
    });
  });

  it.each(['lobby', 'active'] as const)(
    'creates a %s match',
    async (status) => {
      await store.createMatch(makeMeta('ok', status));
      expect((await store.getMatchMeta('ok')).status).toBe(status);
      expectColumnAgrees('ok');
    },
  );
});

describe('DurableMatchStore prepared create status guard', () => {
  it('refuses a completed prepared create, stores nothing and releases the hold', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    try {
      expect(() =>
        store.createMatchPrepared?.(
          makeMeta('born-done', 'completed'),
          [],
          () => null,
        ),
      ).toThrow(expect.objectContaining(TRANSITION_ERROR));
      expect(store.size()).toBe(0);
      // A leaked IMMEDIATE hold would make this create throw.
      await store.createMatch(makeMeta('next', 'active'));
      expect(store.size()).toBe(1);
    } finally {
      store.close();
    }
  });
});
