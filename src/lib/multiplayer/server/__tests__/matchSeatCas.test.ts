/**
 * M-H2 (Wave 4): compare-and-swap on match metadata.
 *
 * `revision` lives only in `meta_json` (absent = 0, no DDL). Every metadata
 * write bumps it; `updateMatchMetaIf` applies a patch only at the revision the
 * caller read. Run against both stores, with real old-shape rows captured from
 * origin/main before the field existed.
 */

import type Database from 'better-sqlite3';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta, type IMatchStore } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import oldShapeRows from './fixtures/matchMetaOldShape.json';

interface IOldShapeRow {
  readonly match_id: string;
  readonly status: string;
  readonly room_code: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly meta_json: string;
}

const AT = '2026-01-01T00:00:00.000Z';

function makeMeta(matchId: string): IMatchMeta {
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1'],
    sideAssignments: [{ playerId: 'p1', side: 'player' }],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 8, turnLimit: 20 },
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: AT,
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
  } as IGameEvent;
}

interface IBuilt {
  readonly store: IMatchStore;
  readonly db: Database.Database | null;
  readonly close: () => void;
  /** Install a pre-change row the way main's store wrote it. */
  readonly seedOldShape: (row: IOldShapeRow) => Promise<void>;
}

const builders: ReadonlyArray<readonly [string, () => IBuilt]> = [
  [
    'InMemoryMatchStore',
    () => {
      const store = new InMemoryMatchStore({ quiet: true });
      return {
        store,
        db: null,
        close: () => undefined,
        seedOldShape: async (row) => {
          await store.createMatch(JSON.parse(row.meta_json) as IMatchMeta);
        },
      };
    },
  ],
  [
    'DurableMatchStore',
    () => {
      const durable = new DurableMatchStore({ path: ':memory:' });
      return {
        store: durable,
        db: durable.getDatabase(),
        close: () => durable.close(),
        seedOldShape: async (row) => {
          durable
            .getDatabase()
            .prepare(
              `INSERT INTO mp_matches
                 (match_id, status, room_code, created_at, updated_at, meta_json)
               VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .run(
              row.match_id,
              row.status,
              row.room_code,
              row.created_at,
              row.updated_at,
              row.meta_json,
            );
        },
      };
    },
  ],
];

describe.each(builders)('%s seat compare-and-swap', (_name, build) => {
  let built: IBuilt;
  let store: IMatchStore;

  beforeEach(() => {
    built = build();
    store = built.store;
  });
  afterEach(() => built.close());

  it('applies a patch at the expected revision and bumps it', async () => {
    await store.createMatch(makeMeta('m'));
    expect((await store.getMatchMeta('m')).revision).toBeUndefined();

    const first = await store.updateMatchMetaIf(
      'm',
      { expectedRevision: 0 },
      { playerIds: ['p1', 'p2'] },
    );
    expect(first).toMatchObject({
      kind: 'applied',
      meta: { revision: 1, playerIds: ['p1', 'p2'] },
    });
    const second = await store.updateMatchMetaIf(
      'm',
      { expectedRevision: 1 },
      { playerIds: ['p1', 'p2', 'p3'] },
    );
    expect(second).toMatchObject({ kind: 'applied', meta: { revision: 2 } });
    expect((await store.getMatchMeta('m')).playerIds).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('answers a stale revision with the current metadata and writes nothing', async () => {
    await store.createMatch(makeMeta('m'));
    await store.updateMatchMetaIf(
      'm',
      { expectedRevision: 0 },
      { playerIds: ['p1', 'p2'] },
    );
    const before = await store.getMatchMeta('m');

    const stale = await store.updateMatchMetaIf(
      'm',
      { expectedRevision: 0 },
      { playerIds: ['intruder'] },
    );

    expect(stale).toEqual({ kind: 'conflict', meta: before });
    expect(await store.getMatchMeta('m')).toEqual(before);
  });

  it('bumps the revision on updateMatchMeta and closeMatch too', async () => {
    await store.createMatch(makeMeta('a'));
    await store.updateMatchMeta('a', { hostPlayerId: 'p2' });
    expect(
      (await store.updateMatchMetaIf('a', { expectedRevision: 0 }, {})).kind,
    ).toBe('conflict');

    await store.createMatch(makeMeta('b'));
    await store.closeMatch('b');
    expect(
      (await store.updateMatchMetaIf('b', { expectedRevision: 0 }, {})).kind,
    ).toBe('conflict');
    expect((await store.getMatchMeta('b')).revision).toBe(1);
  });

  it('leaves the revision alone when an event is appended', async () => {
    await store.createMatch(makeMeta('m'));
    await store.appendEvent('m', makeEvent('m', 1));
    const result = await store.updateMatchMetaIf(
      'm',
      { expectedRevision: 0 },
      { playerIds: ['p1', 'p2'] },
    );
    expect(result.kind).toBe('applied');
  });

  it('refuses an illegal status edge at the right revision and writes nothing', async () => {
    await store.createMatch(makeMeta('m'));
    await store.closeMatch('m');
    const before = await store.getMatchMeta('m');

    await expect(
      store.updateMatchMetaIf(
        'm',
        { expectedRevision: 1 },
        { status: 'active' },
      ),
    ).rejects.toMatchObject({ name: 'InvalidMatchStatusTransitionError' });
    expect(await store.getMatchMeta('m')).toEqual(before);
  });

  it('rejects an unknown match', async () => {
    await expect(
      store.updateMatchMetaIf('nope', { expectedRevision: 0 }, {}),
    ).rejects.toMatchObject({ name: 'MatchNotFoundError' });
  });

  it.each((oldShapeRows as IOldShapeRow[]).map((row) => [row.match_id, row]))(
    'loads the old-shape row %s without a revision and swaps it',
    async (_id, row) => {
      await built.seedOldShape(row as IOldShapeRow);
      const stored = JSON.parse((row as IOldShapeRow).meta_json) as IMatchMeta;

      const loaded = await store.getMatchMeta((row as IOldShapeRow).match_id);
      expect(loaded.revision).toBeUndefined();
      expect(loaded.seats).toEqual(stored.seats);

      const result = await store.updateMatchMetaIf(
        loaded.matchId,
        { expectedRevision: 0 },
        { hostPlayerId: 'pid_opp' },
      );
      expect(result).toMatchObject({
        kind: 'applied',
        meta: { revision: 1, hostPlayerId: 'pid_opp', status: loaded.status },
      });
      const reloaded = await store.getMatchMeta(loaded.matchId);
      expect(reloaded.revision).toBe(1);
      expect(reloaded.seats).toEqual(stored.seats);
      if (built.db) {
        const sql = built.db
          .prepare(
            "SELECT status, json_extract(meta_json, '$.status') AS meta_status FROM mp_matches WHERE match_id = ?",
          )
          .get(loaded.matchId) as { status: string; meta_status: string };
        expect(sql.status).toBe(sql.meta_status);
      }
    },
  );
});

describe('DurableMatchStore row guard', () => {
  it('writes nothing when the row changed after the read although the revision matches', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    try {
      await store.createMatch(makeMeta('m'));
      type RowReader = { getMatchRow(matchId: string): unknown };
      const reader = store as unknown as RowReader;
      const stale = reader.getMatchRow('m');
      // Another connection's write that does not bump the revision (an event
      // append only refreshes updatedAt) lands after the stale read.
      await store.appendEvent('m', makeEvent('m', 1));
      jest.spyOn(reader, 'getMatchRow').mockReturnValueOnce(stale);

      const result = await store.updateMatchMetaIf(
        'm',
        { expectedRevision: 0 },
        { playerIds: ['p1', 'intruder'] },
      );

      expect(result.kind).toBe('conflict');
      expect((await store.getMatchMeta('m')).playerIds).toEqual(['p1']);
    } finally {
      store.close();
    }
  });
});
