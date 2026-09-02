/**
 * Branch checkpoint cache contract (umbrella task 15.1), against REAL
 * SQLite files.
 *
 * Pins the production side the checkpoint contract never had: a WRITER
 * keyed by branch + authority head + projector version + digest whose
 * rows are immutable (identical re-record is a no-op, a different claim
 * in the same slot is refused, a new key writes a new row and the older
 * one survives), a READER that hands out an OFFER and never state, and
 * the cache-only law - deleting every checkpoint changes the recovered
 * state and digest not at all, only the number of events replayed.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { sha256Sync } from '@/utils/events/hashUtils';

import type { IReplayEquivalenceEvent } from '../../replay/ReplayEquivalenceHarness';
import type {
  IBranchCheckpointPipeline,
  IBranchHistoryReader,
} from '../BranchCheckpointCache';

import { canonicalizeJsonV1 } from '../../journal/EventJournalCanonicalizer';
import { ReplayCheckpointError } from '../../replay/ReplayCheckpointCompatibility';
import { runFullReplay } from '../../replay/ReplayEquivalenceHarness';
import { ReplayProjector } from '../../replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '../../replay/ReplaySchemaRegistry';
import {
  BranchCheckpointCache,
  BranchCheckpointError,
} from '../BranchCheckpointCache';

const FINGERPRINT = 'f'.repeat(64);
const RECORDED_AT = '2026-09-02T00:00:00.000Z';

const STREAM = { streamType: 'campaign', streamId: 'campaign-alpha' };

const PIPELINE: IBranchCheckpointPipeline = {
  stream: STREAM,
  // The default pipeline writes on root, as every caller does today.
  // Migration 27 lifted the storage pin, so a non-root branch is now
  // WRITABLE too - the reader is asked about other branches below, and
  // the write side is proven separately, because until the lift the two
  // could not be told apart.
  branchId: 'root',
  projectorId: 'checkpoint.authoritative',
  projectorVersion: 1,
  schemaPipelineFingerprint: FINGERPRINT,
};

const registry = new ReplaySchemaRegistry({
  events: [
    {
      eventType: 'probe_damage',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'probe.damage.v1',
          parse: (payload: unknown) => payload,
        },
      ],
      transitions: [],
    },
  ],
});

interface IProbeState {
  readonly damage: number;
  readonly applied: readonly number[];
}

const projector = () =>
  new ReplayProjector<IProbeState>({
    projectorId: PIPELINE.projectorId,
    projectorVersion: PIPELINE.projectorVersion,
    initialState: () => ({ damage: 0, applied: [] }),
    decisions: [
      {
        eventType: 'probe_damage',
        decision: {
          kind: 'apply',
          apply: (state, event) => {
            const payload = event.payload as { amount: number; at: number };
            return {
              damage: state.damage + payload.amount,
              applied: [...state.applied, payload.at],
            };
          },
        },
      },
    ],
  });

/** Six events, revisions 1..6. */
const EVENTS: readonly IReplayEquivalenceEvent[] = Object.freeze(
  [1, 2, 3, 4, 5, 6].map((revision) => ({
    revision,
    eventType: 'probe_damage',
    schemaVersion: 1,
    payload: { amount: revision * 2, at: revision },
  })),
);

/**
 * A REAL hash chain over the history, the way the journal's own event
 * digest chains through `previousStreamEventDigest`: the digest at
 * revision N covers every earlier revision, so any edit to the past
 * changes every digest from that point on.
 */
function chainDigests(
  events: readonly IReplayEquivalenceEvent[],
): readonly (string | undefined)[] {
  const chain: (string | undefined)[] = [];
  let previous: string | null = null;
  for (const event of events) {
    previous = sha256Sync(
      canonicalizeJsonV1({
        revision: event.revision,
        eventType: event.eventType,
        payload: event.payload,
        previous,
      }),
    );
    chain[event.revision] = previous;
  }
  return chain;
}

const CHAIN = chainDigests(EVENTS);

/** The narrow live-history reads accelerated recovery performs. */
function historyReader(
  events: readonly IReplayEquivalenceEvent[] = EVENTS,
  chain: readonly (string | undefined)[] = CHAIN,
): IBranchHistoryReader {
  return {
    chainDigestAt: (revision) => Promise.resolve(chain[revision] ?? null),
    readTail: (fromExclusive) =>
      Promise.resolve(events.filter((event) => event.revision > fromExclusive)),
  };
}

/** The authoritative reference state at a head, by full replay. */
function stateAt(revision: number): IProbeState {
  return runFullReplay(
    registry,
    projector(),
    EVENTS.filter((event) => event.revision <= revision),
  ).state;
}

describe('branch checkpoint cache', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'branch-checkpoint-cache-'));
    dbPath = path.join(dir, 'checkpoints.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  function cache(db: Database.Database): BranchCheckpointCache {
    return new BranchCheckpointCache(db);
  }

  const rows = (db: Database.Database) =>
    db
      .prepare(
        `SELECT checkpoint_id, branch_id, revision, projector_version, source_tail_digest, state_digest, state_json
           FROM replay_checkpoints ORDER BY revision, projector_version`,
      )
      .all();

  /** Row counts for every table - the cache-only census. */
  const census = (db: Database.Database): Record<string, number> => {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all() as { name: string }[];
    const counts: Record<string, number> = {};
    for (const table of tables) {
      counts[table.name] = (
        db.prepare(`SELECT COUNT(*) AS c FROM "${table.name}"`).get() as {
          c: number;
        }
      ).c;
    }
    return counts;
  };

  it('records a checkpoint that survives a cold reopen', () => {
    const written = cache(database()).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      stateAt(4),
      RECORDED_AT,
    );
    expect(written.kind).toBe('recorded');
    expect(written.revision).toBe(4);

    resetSQLiteService();
    const reopened = database();
    expect(rows(reopened)).toHaveLength(1);
    expect((rows(reopened)[0] as { checkpoint_id: string }).checkpoint_id).toBe(
      written.checkpointId,
    );
  });

  it('keys the WRITE by branch: two branches cache the same head apart', () => {
    const db = database();
    const onRoot = cache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      stateAt(4),
      RECORDED_AT,
    );

    // Same stream, same head, same reducer and pipeline - a DIFFERENT
    // branch, holding different history and therefore different state.
    const onCandidate = cache(db).record(
      { ...PIPELINE, branchId: 'candidate-1' },
      4,
      CHAIN[4] as string,
      stateAt(3),
      RECORDED_AT,
    );

    // Both stored, under distinct derived ids. Drop the branch from
    // the key and these two collide: the second record finds the slot
    // occupied by a state digest that is not its own and rethrows the
    // duplicate. This row could not exist before migration 27 - with
    // only 'root' storable there was no second branch to collide with,
    // which is exactly why the write-key mutant was equivalent then.
    expect(onRoot.kind).toBe('recorded');
    expect(onCandidate.kind).toBe('recorded');
    expect(onCandidate.checkpointId).not.toBe(onRoot.checkpointId);
    expect(
      (rows(db) as { branch_id: string }[]).map((row) => row.branch_id).sort(),
    ).toStrictEqual(['candidate-1', 'root']);
  });

  it('re-recording the identical claim is a no-op, not a second row', () => {
    const db = database();
    const first = cache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      stateAt(4),
      RECORDED_AT,
    );
    const before = rows(db);

    const second = cache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      stateAt(4),
      '2026-09-02T01:00:00.000Z',
    );

    expect(second.kind).toBe('already-recorded');
    expect(second.checkpointId).toBe(first.checkpointId);
    expect(rows(db)).toEqual(before);
  });

  it('refuses a different claim in an occupied slot and leaves it intact', () => {
    const db = database();
    cache(db).record(PIPELINE, 4, CHAIN[4] as string, stateAt(4), RECORDED_AT);
    const before = rows(db);

    expect(() =>
      cache(db).record(
        PIPELINE,
        4,
        CHAIN[4] as string,
        { damage: 999, applied: [] },
        RECORDED_AT,
      ),
    ).toThrow(ReplayCheckpointError);
    expect(rows(db)).toEqual(before);
  });

  it('a new projector version writes a new row and the old one survives', () => {
    const db = database();
    const original = cache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      stateAt(4),
      RECORDED_AT,
    );
    const superseding = cache(db).record(
      { ...PIPELINE, projectorVersion: 2 },
      4,
      CHAIN[4] as string,
      stateAt(4),
      RECORDED_AT,
    );

    expect(superseding.kind).toBe('recorded');
    expect(superseding.checkpointId).not.toBe(original.checkpointId);
    expect(rows(db)).toHaveLength(2);
  });

  it.each([
    ['another branch', { branchId: 'candidate-1' }],
    ['another projector version', { projectorVersion: 2 }],
    ['another projector', { projectorId: 'checkpoint.viewer' }],
    ['another schema pipeline', { schemaPipelineFingerprint: 'a'.repeat(64) }],
    [
      'another stream',
      { stream: { streamType: 'campaign', streamId: 'campaign-beta' } },
    ],
    [
      'another stream type at the same id',
      { stream: { streamType: 'match', streamId: 'campaign-alpha' } },
    ],
  ])('offers nothing for %s', async (_label, overrides) => {
    const db = database();
    cache(db).record(PIPELINE, 4, CHAIN[4] as string, stateAt(4), RECORDED_AT);

    await expect(
      cache(db).offer({ ...PIPELINE, ...overrides }, 6, historyReader()),
    ).resolves.toBeNull();
    await expect(
      cache(db).offer(PIPELINE, 6, historyReader()),
    ).resolves.not.toBeNull();
  });

  it('binds the offer to the LIVE chain digest, never the row claim', async () => {
    const db = database();
    cache(db).record(PIPELINE, 4, CHAIN[4] as string, stateAt(4), RECORDED_AT);

    // History the checkpoint was not built from: revision 3 changed, so
    // every chain digest from 3 on differs.
    const forked = EVENTS.map((event) =>
      event.revision === 3
        ? { ...event, payload: { amount: 99, at: 3 } }
        : event,
    );
    await expect(
      cache(db).offer(PIPELINE, 6, historyReader(forked, chainDigests(forked))),
    ).resolves.toBeNull();
  });

  it('offers an earlier base when the newest checkpoint no longer matches', async () => {
    const db = database();
    cache(db).record(PIPELINE, 2, CHAIN[2] as string, stateAt(2), RECORDED_AT);
    cache(db).record(PIPELINE, 4, CHAIN[4] as string, stateAt(4), RECORDED_AT);
    // Corrupt the newest row's cached bytes in place (the write-once
    // trigger forbids UPDATE, so the row is replaced by hand as a
    // hostile operator would).
    db.prepare(`DELETE FROM replay_checkpoints WHERE revision = 4`).run();
    db.prepare(
      `INSERT INTO replay_checkpoints (
         checkpoint_id, stream_id, branch_id, revision,
         schema_pipeline_fingerprint, projector_id, projector_version,
         source_tail_digest, state_digest, state_json, recorded_at)
       SELECT 'ckpt-tampered', stream_id, branch_id, 4,
         schema_pipeline_fingerprint, projector_id, projector_version,
         ?, state_digest, '{"damage":9999,"applied":[]}', recorded_at
       FROM replay_checkpoints WHERE revision = 2`,
    ).run(CHAIN[4] as string);

    const offer = await cache(db).offer(PIPELINE, 6, historyReader());
    expect(offer?.metadata.revision).toBe(2);
  });

  it('checkpoint-plus-tail equals full replay, and only the work differs', async () => {
    const db = database();
    const reference = runFullReplay(registry, projector(), EVENTS);
    cache(db).record(PIPELINE, 4, CHAIN[4] as string, stateAt(4), RECORDED_AT);

    const accelerated = await cache(db).recover(
      PIPELINE,
      6,
      historyReader(),
      registry,
      projector(),
    );

    expect(accelerated.path).toBe('checkpoint-plus-tail');
    expect(accelerated.stateDigest).toBe(reference.stateDigest);
    expect(accelerated.state).toEqual(reference.state);
    expect(accelerated.appliedRevisions).toBe(2);
    expect(reference.appliedRevisions).toBe(6);
  });

  it('deleting every checkpoint changes nothing but the work done', async () => {
    const db = database();
    cache(db).record(PIPELINE, 2, CHAIN[2] as string, stateAt(2), RECORDED_AT);
    cache(db).record(PIPELINE, 4, CHAIN[4] as string, stateAt(4), RECORDED_AT);

    const withCache = await cache(db).recover(
      PIPELINE,
      6,
      historyReader(),
      registry,
      projector(),
    );
    const before = census(db);

    db.prepare(`DELETE FROM replay_checkpoints`).run();
    const withoutCache = await cache(db).recover(
      PIPELINE,
      6,
      historyReader(),
      registry,
      projector(),
    );
    const after = census(db);

    expect(withoutCache.state).toEqual(withCache.state);
    expect(withoutCache.stateDigest).toBe(withCache.stateDigest);
    expect(withoutCache.path).toBe('full-replay');
    expect(withoutCache.appliedRevisions).toBe(6);
    expect(withCache.appliedRevisions).toBe(2);
    // Only the cache table moved; every other table is untouched.
    expect({ ...after, replay_checkpoints: before.replay_checkpoints }).toEqual(
      before,
    );
    expect(after.replay_checkpoints).toBe(0);
  });

  it('never returns a state folded from a partial history', async () => {
    const db = database();
    cache(db).record(PIPELINE, 4, CHAIN[4] as string, stateAt(4), RECORDED_AT);
    const gapped = historyReader();
    const reader: IBranchHistoryReader = {
      chainDigestAt: gapped.chainDigestAt,
      // Revision 5 is missing: the tail no longer continues the base.
      readTail: async (from) =>
        (await gapped.readTail(from)).filter((event) => event.revision !== 5),
    };

    await expect(
      cache(db).recover(PIPELINE, 6, reader, registry, projector()),
    ).rejects.toThrow(BranchCheckpointError);
  });

  it('refuses to record a head the live history cannot anchor', () => {
    const db = database();
    expect(() =>
      cache(db).record(
        PIPELINE,
        0,
        CHAIN[1] as string,
        stateAt(1),
        RECORDED_AT,
      ),
    ).toThrow(BranchCheckpointError);
  });
});
