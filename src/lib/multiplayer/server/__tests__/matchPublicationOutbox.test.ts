/**
 * The durable publication outbox, run against BOTH stores (umbrella
 * task 7.1).
 *
 * `Commit Precedes Recipient Publication` asks for committed results to
 * be published from DURABLE PUBLICATION RECORDS written in the same
 * transaction as the command batch, so a process dying between the
 * commit and the socket sends resumes the publication rather than losing
 * it. Shared across both stores because a dev adapter that answers
 * differently from production is worse than none.
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchCommandBatch } from '../matchCommandBatch';

import { DurableMatchStore } from '../DurableMatchStore';
import { hasPublicationOutbox, type IMatchMeta } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

const MATCH_ID = 'match-outbox-contract';

function meta(): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function event(sequence: number, id = `evt-${sequence}`): IGameEvent {
  return {
    id,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: '2026-08-26T00:00:00.000Z',
    phase: GamePhase.Movement,
    data: {},
  } as unknown as IGameEvent;
}

function batch(
  overrides: Partial<IMatchCommandBatch> = {},
): IMatchCommandBatch {
  return {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: 0,
    events: [event(0), event(1)],
    ...overrides,
  };
}

const stores: ReadonlyArray<
  readonly [string, () => InMemoryMatchStore | DurableMatchStore]
> = [
  ['InMemoryMatchStore', () => new InMemoryMatchStore({ quiet: true })],
  ['DurableMatchStore', () => new DurableMatchStore({ path: ':memory:' })],
];

describe.each(stores)('%s publication outbox contract', (_name, build) => {
  let store: InMemoryMatchStore | DurableMatchStore;

  beforeEach(async () => {
    store = build();
    await store.createMatch(meta());
  });

  it('advertises the outbox capability', () => {
    // A structural flag callers test for, as `appendCommandBatch` is.
    expect(hasPublicationOutbox(store)).toBe(true);
  });

  it('records one pending publication per committed event', async () => {
    await store.appendCommandBatch!(MATCH_ID, batch());

    const pending = await store.listPendingPublications(MATCH_ID);

    expect(pending.map((row) => row.sequence)).toEqual([0, 1]);
    expect(pending.map((row) => row.event.id)).toEqual(['evt-0', 'evt-1']);
    expect(pending.every((row) => row.commandId === 'cmd-1')).toBe(true);
  });

  it('records NOTHING for a refused batch, before OR inside the commit step', async () => {
    // A refused command must leave nothing for a drain to publish, or a
    // restart would announce events that never happened.
    //
    // Both refusals are here because they are decided in different
    // places. A gapped batch is rejected BEFORE the durable store opens
    // its transaction, so it cannot tell a store that writes rows
    // inside the commit from one that writes them after - an earlier
    // draft claimed it could. A revision conflict IS decided inside.
    const gapped = await store.appendCommandBatch!(
      MATCH_ID,
      batch({ events: [event(0), event(2)] }),
    );
    expect(gapped.kind).toBe('non-contiguous');
    expect(await store.listPendingPublications(MATCH_ID)).toHaveLength(0);

    await store.appendCommandBatch!(MATCH_ID, batch());
    await store.markPublicationsPublished(MATCH_ID, [0, 1]);
    const stale = await store.appendCommandBatch!(
      MATCH_ID,
      batch({ commandId: 'cmd-stale', expectedRevision: 0 }),
    );
    expect(stale.kind).toBe('revision-conflict');
    expect(await store.listPendingPublications(MATCH_ID)).toHaveLength(0);
  });

  it('records nothing extra for a recognised retry', async () => {
    // A retry is not a second command, so it queues no second copy.
    await store.appendCommandBatch!(MATCH_ID, batch());
    const retry = await store.appendCommandBatch!(MATCH_ID, batch());

    expect(retry.kind).toBe('duplicate-command');
    expect(await store.listPendingPublications(MATCH_ID)).toHaveLength(2);
  });

  it('returns pending rows in ascending sequence order', async () => {
    await store.appendCommandBatch!(MATCH_ID, batch());
    await store.appendCommandBatch!(
      MATCH_ID,
      batch({ commandId: 'cmd-2', expectedRevision: 2, events: [event(2)] }),
    );

    expect(
      (await store.listPendingPublications(MATCH_ID)).map((r) => r.sequence),
    ).toEqual([0, 1, 2]);
  });

  it('drops a row from pending once it is marked published', async () => {
    await store.appendCommandBatch!(MATCH_ID, batch());

    await store.markPublicationsPublished(MATCH_ID, [0]);

    expect(
      (await store.listPendingPublications(MATCH_ID)).map((r) => r.sequence),
    ).toEqual([1]);
  });

  it('leaves the committed events alone when a publication is marked', async () => {
    // A drain must never consume the history a reconnecting client
    // replays: marking is about DELIVERY, not about the log.
    await store.appendCommandBatch!(MATCH_ID, batch());

    await store.markPublicationsPublished(MATCH_ID, [0, 1]);

    expect(await store.getEvents(MATCH_ID)).toHaveLength(2);
    expect(await store.listPendingPublications(MATCH_ID)).toHaveLength(0);
  });

  it('answers "nothing pending" for a match it does not know', async () => {
    // Deliberately NOT `MatchNotFoundError`: a boot-time drain that
    // threw here would take down the resume for every other match.
    expect(await store.listPendingPublications('match-absent')).toEqual([]);
    await expect(
      store.markPublicationsPublished('match-absent', [0]),
    ).resolves.toBeUndefined();
  });
});

/**
 * Minimal view of the durable store's private SQLite handle. Reaching
 * for it is deliberate: "the publication row joins the events'
 * transaction" can only be observed by failing the publication write ON
 * ITS OWN, and no public path does that - every public failure fails the
 * event write too, which a dual-writing store survives alike.
 */
interface ISeedableDb {
  prepare(sql: string): { run(...params: readonly unknown[]): unknown };
}

/**
 * Put an ALREADY-PUBLISHED row on `sequence` so the next publication
 * INSERT collides with the `(match_id, sequence)` primary key, while
 * staying out of the pending set itself.
 */
function seedPublishedOutboxRow(store: DurableMatchStore, seq: number): void {
  const at = '2026-08-26T00:00:00.000Z';
  (store as unknown as { readonly db: ISeedableDb }).db
    .prepare(
      `INSERT INTO mp_match_outbox
         (match_id, sequence, command_id, event_json, created_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(MATCH_ID, seq, 'cmd-earlier', '{}', at, at);
}

describe('DurableMatchStore publication outbox transactionality', () => {
  let store: DurableMatchStore;

  beforeEach(async () => {
    store = new DurableMatchStore({ path: ':memory:' });
    await store.createMatch(meta());
  });

  it('takes the committed events down with a publication row that cannot be written', async () => {
    // THE control for the property this slice exists to provide. The
    // seeded row collides with the SECOND publication INSERT, after the
    // first event and its own row are already down. Inside the
    // transaction that rolls both back; written afterwards, the two
    // events would have committed and STAYED committed with only
    // sequence 0 queued - the dual-write hole this outbox closes.
    seedPublishedOutboxRow(store, 1);

    // Read as TEXT, not via `.rejects.toThrow()`: that matcher must
    // recognise the reason as an `Error`, and better-sqlite3's native
    // `SqliteError` is not always the jsdom realm's `Error`, so it
    // flakes under a loaded parallel run. Text is realm-independent AND
    // pins which write refused - the publication PK, not the event's.
    const failure = await store
      .appendCommandBatch(MATCH_ID, batch())
      .then(() => 'no failure', String);
    expect(failure).toContain('UNIQUE constraint failed: mp_match_outbox');

    expect(await store.getEvents(MATCH_ID)).toHaveLength(0);
    expect(await store.listPendingPublications(MATCH_ID)).toHaveLength(0);
  });
});
