/**
 * Logical truncation by moving the live tail into sibling tables
 * (seam 14.4-b). Predicted red on shipped code is named in each row.
 * Durable runs on a temp file so open/migrate is the real constructor
 * path; the in-memory twin shares the observable rows.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import {
  EVENTS_SUPERSEDED_TABLE,
  MATCH_STORE_SUPERSESSION_USER_VERSION,
} from '../DurableMatchStore.supersede';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

const AT = '2026-09-02T12:00:00.000Z';
const CUT = 2;
const MATCH_ID = 'supersede-1';

function meta(matchId = MATCH_ID): IMatchMeta {
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function event(sequence: number, id = `evt-${sequence}`): IGameEvent {
  return {
    id,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: AT,
    phase: GamePhase.Movement,
    data: {},
  } as unknown as IGameEvent;
}

type Store = DurableMatchStore | InMemoryMatchStore;

async function seedTwoBatches(store: Store): Promise<void> {
  await store.createMatch(meta());
  const first = await store.appendCommandBatch(MATCH_ID, {
    commandId: 'cmd-prefix',
    actorId: 'p1',
    expectedRevision: 0,
    events: [event(0), event(1)],
  });
  const second = await store.appendCommandBatch(MATCH_ID, {
    commandId: 'cmd-tail',
    actorId: 'p1',
    expectedRevision: 2,
    events: [event(2), event(3)],
  });
  expect(first.kind).toBe('committed');
  expect(second.kind).toBe('committed');
}

describe.each([
  ['InMemoryMatchStore', (): Store => new InMemoryMatchStore({ quiet: true })],
  [
    'DurableMatchStore',
    (): Store => new DurableMatchStore({ path: ':memory:' }),
  ],
] as const)('%s supersedeFrom', (_name, build) => {
  let store: Store;

  beforeEach(() => {
    store = build();
  });

  afterEach(() => {
    if (store instanceof DurableMatchStore) store.close();
  });

  it('appendCommandBatch at the cut commits after supersedeFrom', async () => {
    await seedTwoBatches(store);
    await store.supersedeFrom(MATCH_ID, CUT, AT);
    // Today: revision-conflict (head still MAX over every row).
    const result = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-extend',
      actorId: 'p1',
      expectedRevision: CUT,
      events: [event(CUT, 'evt-cut-new')],
    });
    expect(result.kind).toBe('committed');
  });

  it('appendEvent at the cut sequence does not throw after supersedeFrom', async () => {
    await seedTwoBatches(store);
    await store.supersedeFrom(MATCH_ID, CUT, AT);
    // Today: MatchStoreSequenceCollisionError on the full PK.
    await expect(
      store.appendEvent(MATCH_ID, event(CUT, 'evt-cut-append')),
    ).resolves.toBeUndefined();
  });

  it('getEvents length equals the prefix plus the new tail', async () => {
    await seedTwoBatches(store);
    await store.supersedeFrom(MATCH_ID, CUT, AT);
    const result = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-extend',
      actorId: 'p1',
      expectedRevision: CUT,
      events: [event(CUT, 'evt-cut-new')],
    });
    expect(result.kind).toBe('committed');
    // Today: old rows included (0,1,2,3 plus the new 2).
    const sequences = (await store.getEvents(MATCH_ID)).map(
      (row) => row.sequence,
    );
    expect(sequences).toEqual([0, 1, 2]);
  });

  it('getLastCommandReceipt answers the prefix last receipt', async () => {
    await seedTwoBatches(store);
    await store.supersedeFrom(MATCH_ID, CUT, AT);
    // Today: cmd-tail (highest last_revision on the superseded receipt).
    const receipt = await store.getLastCommandReceipt(MATCH_ID);
    expect(receipt?.commandId).toBe('cmd-prefix');
  });

  it('a receipt whose last event sits exactly at the cut is superseded too', async () => {
    // Receipts record event SEQUENCES as first/last. A one-event batch at
    // the cut sequence is the tail's first command: moving receipts only
    // strictly past the cut would leave it live and getLastCommandReceipt
    // would answer a command whose event the store no longer holds.
    await store.createMatch(meta());
    await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-prefix',
      actorId: 'p1',
      expectedRevision: 0,
      events: [event(0), event(1)],
    });
    await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-at-cut',
      actorId: 'p1',
      expectedRevision: 2,
      events: [event(2)],
    });
    await store.supersedeFrom(MATCH_ID, CUT, AT);
    const receipt = await store.getLastCommandReceipt(MATCH_ID);
    expect(receipt?.commandId).toBe('cmd-prefix');
  });

  it('pending outbox row of the superseded tail is never drained', async () => {
    await seedTwoBatches(store);
    expect(
      (await store.listPendingPublications(MATCH_ID)).map(
        (row) => row.sequence,
      ),
    ).toEqual([0, 1, 2, 3]);
    await store.supersedeFrom(MATCH_ID, CUT, AT);
    // Today: republished (2 and 3 still pending).
    expect(
      (await store.listPendingPublications(MATCH_ID)).map(
        (row) => row.sequence,
      ),
    ).toEqual([0, 1]);
  });

  it('a second rewind after new events marks the new tail again', async () => {
    await seedTwoBatches(store);
    await store.supersedeFrom(MATCH_ID, CUT, AT);
    const first = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-extend',
      actorId: 'p1',
      expectedRevision: CUT,
      events: [event(CUT, 'evt-cut-new'), event(3, 'evt-3-new')],
    });
    expect(first.kind).toBe('committed');
    await store.supersedeFrom(MATCH_ID, 3, AT);
    const second = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'cmd-extend-2',
      actorId: 'p1',
      expectedRevision: 3,
      events: [event(3, 'evt-3-again')],
    });
    expect(second.kind).toBe('committed');
    expect((await store.getEvents(MATCH_ID)).map((row) => row.id)).toEqual([
      'evt-0',
      'evt-1',
      'evt-cut-new',
      'evt-3-again',
    ]);
  });
});

describe('DurableMatchStore supersession migrate', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'durable-supersede-'));
    dbPath = path.join(dir, 'matches.db');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('migration is idempotent and keeps existing live rows; sibling stays empty', async () => {
    const first = new DurableMatchStore({ path: dbPath });
    await first.createMatch(meta());
    await first.appendEvent(MATCH_ID, event(0));
    await first.appendEvent(MATCH_ID, event(1));
    first.close();

    const second = new DurableMatchStore({ path: dbPath });
    second.close();
    const third = new DurableMatchStore({ path: dbPath });
    const live = await third.getEvents(MATCH_ID);
    expect(live.map((row) => row.sequence)).toEqual([0, 1]);
    third.close();

    const raw = new Database(dbPath);
    try {
      const version = Number(raw.pragma('user_version', { simple: true }));
      expect(version).toBe(MATCH_STORE_SUPERSESSION_USER_VERSION);
      const liveRows = raw
        .prepare(
          `SELECT sequence FROM mp_match_events
           WHERE match_id = ? ORDER BY sequence`,
        )
        .all(MATCH_ID) as Array<{ sequence: number }>;
      expect(liveRows).toEqual([{ sequence: 0 }, { sequence: 1 }]);
      const sibling = raw
        .prepare(
          `SELECT COUNT(*) AS n FROM ${EVENTS_SUPERSEDED_TABLE}
           WHERE match_id = ?`,
        )
        .get(MATCH_ID) as { n: number };
      expect(sibling.n).toBe(0);
    } finally {
      raw.close();
    }
  });

  it('rebuilds a pre-mark file so the cut sequence is writable', async () => {
    const raw = new Database(dbPath);
    raw.pragma('foreign_keys = ON');
    // Exact pre-14.4-b SCHEMA_SQL: no superseded_at, full PRIMARY KEY
    // (match_id, sequence) on events/outbox. Live unique indexes are
    // post-mark and are not created here.
    raw.exec(`
      CREATE TABLE IF NOT EXISTS mp_matches (
        match_id    TEXT PRIMARY KEY,
        status      TEXT NOT NULL,
        room_code   TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        meta_json   TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mp_match_events (
        match_id       TEXT NOT NULL,
        sequence       INTEGER NOT NULL,
        event_json     TEXT NOT NULL,
        PRIMARY KEY (match_id, sequence),
        FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS mp_command_receipts (
        match_id       TEXT NOT NULL,
        command_id     TEXT NOT NULL,
        actor_id       TEXT NOT NULL,
        first_revision INTEGER NOT NULL,
        last_revision  INTEGER NOT NULL,
        event_count    INTEGER NOT NULL,
        fingerprint    TEXT NOT NULL,
        post_digest    TEXT,
        committed_at   TEXT NOT NULL,
        PRIMARY KEY (match_id, command_id),
        FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS mp_match_outbox (
        match_id       TEXT NOT NULL,
        sequence       INTEGER NOT NULL,
        command_id     TEXT NOT NULL,
        event_json     TEXT NOT NULL,
        created_at     TEXT NOT NULL,
        published_at   TEXT,
        PRIMARY KEY (match_id, sequence),
        FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_mp_matches_status ON mp_matches(status);
      CREATE INDEX IF NOT EXISTS idx_mp_matches_room_code ON mp_matches(room_code);
      CREATE INDEX IF NOT EXISTS idx_mp_match_events_match ON mp_match_events(match_id, sequence);
      CREATE INDEX IF NOT EXISTS idx_mp_match_outbox_pending
        ON mp_match_outbox(match_id, published_at, sequence);
    `);
    raw
      .prepare(
        `INSERT INTO mp_matches
           (match_id, status, room_code, created_at, updated_at, meta_json)
         VALUES (?, 'active', NULL, ?, ?, '{}')`,
      )
      .run(MATCH_ID, AT, AT);
    raw
      .prepare(
        `INSERT INTO mp_match_events (match_id, sequence, event_json)
         VALUES (?, ?, ?)`,
      )
      .run(MATCH_ID, 0, JSON.stringify(event(0)));
    raw
      .prepare(
        `INSERT INTO mp_match_events (match_id, sequence, event_json)
         VALUES (?, ?, ?)`,
      )
      .run(MATCH_ID, 1, JSON.stringify(event(1)));
    raw.close();

    const store = new DurableMatchStore({ path: dbPath });
    await store.supersedeFrom(MATCH_ID, 1, AT);
    await expect(
      store.appendEvent(MATCH_ID, event(1, 'evt-1-reused')),
    ).resolves.toBeUndefined();
    expect((await store.getEvents(MATCH_ID)).map((row) => row.id)).toEqual([
      'evt-0',
      'evt-1-reused',
    ]);
    store.close();

    const rawAfter = new Database(dbPath);
    try {
      const moved = rawAfter
        .prepare(
          `SELECT sequence FROM ${EVENTS_SUPERSEDED_TABLE}
           WHERE match_id = ? ORDER BY sequence`,
        )
        .all(MATCH_ID) as Array<{ sequence: number }>;
      expect(moved).toEqual([{ sequence: 1 }]);
    } finally {
      rawAfter.close();
    }
  });
});
