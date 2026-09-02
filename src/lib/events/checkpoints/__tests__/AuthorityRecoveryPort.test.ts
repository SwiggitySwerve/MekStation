/**
 * Authority recovery port contract (umbrella tasks 15.3 wiring), against
 * REAL SQLite files.
 *
 * Pins: the reference port is byte-identical to reading everything and
 * folding it, so adopting it changes nothing; the checkpoint port
 * accelerates only through a base the digest law admitted, falls back to
 * the reference path when the newest row is stale or unattested (and
 * REBUILDS FROM AN EARLIER trusted base when one exists), and BLOCKS
 * truthfully rather than folding a tail that does not continue its base -
 * with a census proving a blocked verdict hands out no state, no digest
 * and no partial fold.
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

import type {
  IAuthorityRecoverySource,
  IBranchCheckpointPipeline,
  IBranchHistoryReader,
} from '../AuthorityRecoveryPort';

import { canonicalizeJsonV1 } from '../../journal/EventJournalCanonicalizer';
import {
  AUTHORITY_HISTORY_START,
  AuthorityRecoveryBlockedError,
  BranchCheckpointCache,
  checkpointRecoveryPort,
  referenceRecoveryPort,
} from '../AuthorityRecoveryPort';

const FINGERPRINT = 'f'.repeat(64);
const RECORDED_AT = '2026-09-02T00:00:00.000Z';

const PIPELINE: IBranchCheckpointPipeline = {
  stream: { streamType: 'campaign', streamId: 'campaign-alpha' },
  branchId: 'root',
  projectorId: 'authority.recovery.probe',
  projectorVersion: 1,
  schemaPipelineFingerprint: FINGERPRINT,
};

/** A deliberately order-sensitive fold, so a skipped event is visible. */
interface IProbeState {
  readonly total: number;
  readonly applied: readonly number[];
}

interface IProbeEvent {
  readonly revision: number;
  readonly amount: number;
}

const EVENTS: readonly IProbeEvent[] = Object.freeze(
  [1, 2, 3, 4, 5, 6].map((revision) => ({ revision, amount: revision * 2 })),
);

const EMPTY: IProbeState = Object.freeze({ total: 0, applied: [] });

function fold(
  events: readonly IProbeEvent[],
  base: IProbeState = EMPTY,
): IProbeState {
  return events.reduce<IProbeState>(
    (state, event) => ({
      total: state.total + event.amount,
      applied: [...state.applied, event.revision],
    }),
    base,
  );
}

/** A real hash chain: editing any past event moves every later digest. */
function chainDigests(
  events: readonly IProbeEvent[],
): readonly (string | undefined)[] {
  const chain: (string | undefined)[] = [];
  let previous: string | null = null;
  for (const event of events) {
    previous = sha256Sync(canonicalizeJsonV1({ event, previous }));
    chain[event.revision] = previous;
  }
  return chain;
}

const CHAIN = chainDigests(EVENTS);

function source(
  events: readonly IProbeEvent[] = EVENTS,
  emptyHistory: 'empty-state' | 'corrupt' = 'corrupt',
): IAuthorityRecoverySource<IProbeEvent, IProbeState> {
  return {
    authorityId: 'campaign-alpha',
    emptyHistory,
    read: (fromExclusive) =>
      Promise.resolve(events.filter((event) => event.revision > fromExclusive)),
    revisionOf: (event) => event.revision,
    fold,
  };
}

function history(
  chain: readonly (string | undefined)[] = CHAIN,
): IBranchHistoryReader {
  return {
    chainDigestAt: (revision) => Promise.resolve(chain[revision] ?? null),
    readTail: () => Promise.resolve([]),
  };
}

describe('authority recovery port', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'authority-recovery-port-'));
    dbPath = path.join(dir, 'recovery.db');
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

  function accelerated(db: Database.Database, headRevision = 6) {
    return checkpointRecoveryPort<IProbeEvent, IProbeState>({
      cache: new BranchCheckpointCache(db),
      pipeline: PIPELINE,
      headRevision,
      history: history(),
      parse: (stateJson) => JSON.parse(stateJson) as IProbeState,
    });
  }

  const REFERENCE = fold(EVENTS);

  it('the reference port reads everything and folds it, and nothing else', async () => {
    const reads: number[] = [];
    const probe = source();
    const verdict = await referenceRecoveryPort<IProbeEvent, IProbeState>()({
      ...probe,
      read: (from) => {
        reads.push(from);
        return probe.read(from);
      },
    });

    expect(verdict).toEqual({
      kind: 'recovered',
      path: 'full-replay',
      state: REFERENCE,
      appliedRevisions: 6,
    });
    expect(reads).toEqual([AUTHORITY_HISTORY_START]);
  });

  it('the checkpoint port with no cached row is the reference path', async () => {
    const verdict = await accelerated(database())(source());
    expect(verdict).toEqual({
      kind: 'recovered',
      path: 'full-replay',
      state: REFERENCE,
      appliedRevisions: 6,
    });
  });

  it('accelerates through a base the digest law admitted', async () => {
    const db = database();
    new BranchCheckpointCache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      fold(EVENTS.filter((event) => event.revision <= 4)),
      RECORDED_AT,
    );

    const verdict = await accelerated(db)(source());
    expect(verdict.kind).toBe('recovered');
    if (verdict.kind !== 'recovered') throw new Error('unreachable');
    expect(verdict.path).toBe('checkpoint-plus-tail');
    expect(verdict.state).toEqual(REFERENCE);
    expect(verdict.appliedRevisions).toBe(2);
  });

  it('falls back to the reference path when the base is unattested', async () => {
    const db = database();
    new BranchCheckpointCache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      fold(EVENTS.filter((event) => event.revision <= 4)),
      RECORDED_AT,
    );
    // History the row is not a claim about: revision 3 changed, so every
    // chain digest from 3 on differs.
    const forked = EVENTS.map((event) =>
      event.revision === 3 ? { ...event, amount: 99 } : event,
    );
    const port = checkpointRecoveryPort<IProbeEvent, IProbeState>({
      cache: new BranchCheckpointCache(db),
      pipeline: PIPELINE,
      headRevision: 6,
      history: history(chainDigests(forked)),
      parse: (stateJson) => JSON.parse(stateJson) as IProbeState,
    });

    const verdict = await port(source(forked));
    expect(verdict).toEqual({
      kind: 'recovered',
      path: 'full-replay',
      state: fold(forked),
      appliedRevisions: 6,
    });
  });

  it('rebuilds from an EARLIER trusted base when the newest is corrupt', async () => {
    const db = database();
    const cache = new BranchCheckpointCache(db);
    cache.record(
      PIPELINE,
      2,
      CHAIN[2] as string,
      fold(EVENTS.filter((event) => event.revision <= 2)),
      RECORDED_AT,
    );
    cache.record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      fold(EVENTS.filter((event) => event.revision <= 4)),
      RECORDED_AT,
    );
    // Replace the newest row's bytes with a lie its digest does not cover.
    db.prepare(`DELETE FROM replay_checkpoints WHERE revision = 4`).run();
    db.prepare(
      `INSERT INTO replay_checkpoints (
         checkpoint_id, stream_id, branch_id, revision,
         schema_pipeline_fingerprint, projector_id, projector_version,
         source_tail_digest, state_digest, state_json, recorded_at)
       SELECT 'ckpt-tampered', stream_id, branch_id, 4,
         schema_pipeline_fingerprint, projector_id, projector_version,
         ?, state_digest, '{"total":9999,"applied":[]}', recorded_at
       FROM replay_checkpoints WHERE revision = 2`,
    ).run(CHAIN[4] as string);

    const verdict = await accelerated(db)(source());
    expect(verdict.kind).toBe('recovered');
    if (verdict.kind !== 'recovered') throw new Error('unreachable');
    expect(verdict.state).toEqual(REFERENCE);
    expect(verdict.path).toBe('checkpoint-plus-tail');
    // Four events folded onto revision 2 - the earlier trusted base.
    expect(verdict.appliedRevisions).toBe(4);
  });

  it('blocks truthfully rather than folding a tail that does not continue', async () => {
    const db = database();
    new BranchCheckpointCache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      fold(EVENTS.filter((event) => event.revision <= 4)),
      RECORDED_AT,
    );
    const gapped = source(EVENTS.filter((event) => event.revision !== 5));

    const verdict = await accelerated(db)(gapped);
    expect(verdict).toEqual({
      kind: 'blocked',
      reason: 'partial-history',
      evidence: ['revision 5 expected, found 6'],
    });
  });

  it('a blocked verdict carries no state, no digest, no partial fold', async () => {
    const db = database();
    new BranchCheckpointCache(db).record(
      PIPELINE,
      4,
      CHAIN[4] as string,
      fold(EVENTS.filter((event) => event.revision <= 4)),
      RECORDED_AT,
    );
    const folds: number[] = [];
    const gapped = source(EVENTS.filter((event) => event.revision !== 5));

    const verdict = await accelerated(db)({
      ...gapped,
      fold: (events, base) => {
        folds.push(events.length);
        return fold(events, base);
      },
    });

    // Census over every observable a caller could reach for.
    expect(Object.keys(verdict).sort()).toEqual(['evidence', 'kind', 'reason']);
    for (const key of ['state', 'stateDigest', 'path', 'appliedRevisions']) {
      expect(key in verdict).toBe(false);
    }
    // The reducer was never invoked: no partial state exists to leak.
    expect(folds).toEqual([]);
  });

  it('blocks an authority that must hold events and holds none', async () => {
    const verdict = await accelerated(database())(source([]));
    expect(verdict).toEqual({
      kind: 'blocked',
      reason: 'empty-history',
      evidence: ['campaign-alpha'],
    });
  });

  it('folds an empty history to the empty state where that is legitimate', async () => {
    const verdict = await accelerated(database())(source([], 'empty-state'));
    expect(verdict).toEqual({
      kind: 'recovered',
      path: 'full-replay',
      state: EMPTY,
      appliedRevisions: 0,
    });
  });

  it('the blocked error names the reason a caller must not paper over', () => {
    const error = new AuthorityRecoveryBlockedError({
      kind: 'blocked',
      reason: 'partial-history',
      evidence: ['revision 5 expected, found 6'],
    });
    expect(error.verdict.reason).toBe('partial-history');
    expect(error.message).toContain('partial-history');
  });
});
