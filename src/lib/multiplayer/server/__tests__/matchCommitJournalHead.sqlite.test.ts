/**
 * S5-b of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.6): the
 * expected revision for a committed batch comes FROM the journal head,
 * and the refusals that guard it are proven against a race.
 *
 * Real boundary only, as S1 and S5 did: temp-file SQLite databases
 * opened the way production opens them, the losing writer on its OWN
 * connection to the same campaign file, and every assertion read back
 * over a third connection.
 *
 * THE RACE THIS PROVES, STATED HONESTLY. `better-sqlite3` executes a
 * transaction synchronously on the one Node thread, so two writers
 * cannot be inside `appendPrepared` at the same instant. The race that
 * DOES exist — and the only one that does, once the journal head is the
 * authority — is between the moment a writer CONSULTS the head and the
 * moment its append re-checks it: writer B computed its expectation
 * from a head writer A has since moved. That window is opened here by
 * consulting for both writers before either appends, which is exactly
 * the state a second process would be in. It is not a multi-process
 * concurrency harness and does not claim to be.
 *
 * The rewound stream is where all of this is NEW. S5 refused to mirror
 * one at all (`rewound-stream`) because the store's next sequence stops
 * describing a journal revision the moment a tail is superseded; the
 * head-sourced expectation is what makes such a stream mirrorable
 * again, and therefore what makes its race and its duplicate refusal
 * reachable for the first time.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S5)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchCommandBatch } from '../matchCommandBatch';
import type { MatchCommitExpectedRevision } from '../matchCommitJournalHead';

import { DurableMatchStore } from '../DurableMatchStore';
import { MATCH_BASELINE_BRANCH_ID as LIVE_BRANCH } from '../matchAuthorityBaseline';
import { resolveMatchCommitExpectedRevision } from '../matchCommitJournalHead';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  getProcessShadowMismatchCount,
} from '../matchJournalAuthority';
import { mirrorMatchBatchToJournal } from '../MatchStreamJournalMirror';

const MATCH_ID = 'match-commit-journal-head';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-15T00:00:00.000Z';
const REWIND_REASON = 'authorized combat rewind';
/** The revision the rewind keeps, so also the first discarded sequence. */
const CUT_REVISION = 1;

function event(sequence: number, id = `evt-${sequence}`): IGameEvent {
  return {
    id,
    sequence,
    type: GameEventType.PhaseChanged,
    timestamp: AT,
    phase: GamePhase.Movement,
    payload: { sequence },
  } as unknown as IGameEvent;
}

function batch(): IMatchCommandBatch {
  return {
    commandId: 'cmd-1',
    actorId: 'p1',
    expectedRevision: 0,
    events: [event(0), event(1)],
    expectedPostStateDigest: 'digest-1',
  };
}

let sqliteDir = '';
let campaignPath = '';
let store: DurableMatchStore | undefined;

/** The process's own campaign connection, as production holds it. */
function primary(): Database.Database {
  return getSQLiteService().getDatabase();
}

/** What a writer holds before it appends: its own view of the head. */
function consult(nextMatchSequence: number): MatchCommitExpectedRevision {
  return resolveMatchCommitExpectedRevision(
    primary(),
    MATCH_ID,
    nextMatchSequence,
  );
}

/**
 * Mirror one batch on a connection of the caller's choosing. A second
 * writer opens its own handle to the same campaign file, so the losing
 * append is refused by the DATABASE's head rather than by a value the
 * first writer happened to leave in a shared object.
 */
async function mirrorOn(
  db: Database.Database,
  commandId: string,
  expected: MatchCommitExpectedRevision,
  events: readonly IGameEvent[],
) {
  return mirrorMatchBatchToJournal(db, {
    matchId: MATCH_ID,
    commandId,
    actorId: 'p1',
    expected,
    events,
  });
}

interface IJournalRow {
  readonly revision: number;
  readonly branchId: string;
  readonly eventId: string;
}

/** Query the campaign file directly so nothing in-process answers for it. */
function queryCampaign<T>(sql: string): readonly T[] {
  const db = new Database(campaignPath, { fileMustExist: true });
  try {
    return db.prepare(sql).all(STREAM.streamType, STREAM.streamId) as T[];
  } finally {
    db.close();
  }
}

function journalRows(): readonly IJournalRow[] {
  return queryCampaign<IJournalRow>(
    `SELECT stream_revision AS revision, branch_id AS branchId,
            event_id AS eventId
       FROM event_journal_events
      WHERE stream_type = ? AND stream_id = ?
      ORDER BY commit_position`,
  );
}

/** Every branch head the stream holds, so a DOUBLE head is visible. */
function streamHeads(): readonly { branchId: string; revision: number }[] {
  return queryCampaign<{ branchId: string; revision: number }>(
    `SELECT branch_id AS branchId, stream_revision AS revision
       FROM event_journal_stream_heads
      WHERE stream_type = ? AND stream_id = ?
      ORDER BY branch_id`,
  );
}

function headRevisionOf(branchId: string): number | undefined {
  return streamHeads().find((row) => row.branchId === branchId)?.revision;
}

/**
 * Commit one batch, then take the stream off the live path the way a
 * committed GM rewind does, through the real machinery: a lease fenced
 * at the live head, a candidate CUT below it
 * (`createCorrectionCandidateBranch`, which plants that candidate's
 * journal head at its base), a sealed manifest, activation, and the
 * store tail moved into `mp_match_events_superseded`. The tripwire is
 * reset last, so a mismatch a test asserts on can only have come from
 * the batch it commits.
 */
async function seedThenRewind(): Promise<string> {
  await store!.appendCommandBatch!(MATCH_ID, batch());
  const db = primary();
  const branches = new SQLiteEventHistoryBranchStore(db);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
    nowMs: () => 1_000_000,
  });
  const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
  const head = readEffectiveStreamHead(db, branches, STREAM);
  const lease = leases.acquireCorrectionLease({
    ...STREAM,
    owner: 'p1',
    actor: 'p1',
    reason: REWIND_REASON,
    ttlMs: 30_000,
    expectedBranchId: head.branchId,
    expectedRevision: head.revision,
    expectedDigest: head.digest,
    expectedGeneration: 1,
  });
  const held = {
    leaseId: lease.leaseId,
    owner: lease.owner,
    fencingEpoch: lease.fencingEpoch,
  };
  const candidate = createCorrectionCandidateBranch(db, leases, {
    ...STREAM,
    ...held,
    createdAt: AT,
    baseRevision: CUT_REVISION,
  });
  manifests.sealArtifactManifest(
    STREAM,
    candidate.branchId,
    [{ artifactKind: 'checkpoint', artifactId: 'ckpt-1', sourceRevision: 2 }],
    AT,
  );
  const activated = activateCandidateBranch(db, branches, leases, manifests, {
    stream: STREAM,
    candidateBranchId: candidate.branchId,
    held,
    reason: REWIND_REASON,
    activatedAt: AT,
  });
  // Revision N is sequence N-1, so the kept revision is also the first
  // discarded sequence - the number the rebuild hands the store.
  await store!.supersedeFrom!(MATCH_ID, CUT_REVISION, AT);
  _resetProcessShadowStatsForTests();
  return activated.branchId;
}

beforeEach(async () => {
  sqliteDir = await mkdtemp(path.join(tmpdir(), 'match-commit-head-'));
  campaignPath = path.join(sqliteDir, 'mekstation.db');
  resetSQLiteService();
  getSQLiteService({ path: campaignPath }).initialize();
  // The head is authoritative for a committed batch ONLY at 'enabled',
  // and this override is the only way to get there: the production
  // const stays 'off' and no cutover lands in this seam.
  _setCombatJournalAuthorityModeForTests('enabled');
  store = new DurableMatchStore({
    path: path.join(sqliteDir, 'multiplayer-matches.db'),
    capabilityDb: primary,
  });
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [],
    status: 'lobby',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  });
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  store?.close();
  store = undefined;
  resetSQLiteService();
  await rm(sqliteDir, { recursive: true, force: true });
});

describe('the expected revision for a commit comes from the journal head', () => {
  it('mirrors a rewound stream onto the activated branch at the head revision', async () => {
    const branchId = await seedThenRewind();

    // The store's next sequence is 1 again after the tail moved out. S5
    // refused this batch for being rewound at all; the head says the
    // activated branch ends at its base revision 1, so the batch lands
    // at revision 2 - on the branch that is actually effective.
    const committed = await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-rebuilt',
      expectedRevision: CUT_REVISION,
      events: [event(1, 'evt-1-rebuilt')],
    });

    expect(committed.kind).toBe('committed');
    expect(journalRows().filter((row) => row.branchId === branchId)).toEqual([
      { revision: 2, branchId, eventId: 'cmd-rebuilt:0' },
    ]);
    expect(headRevisionOf(branchId)).toBe(2);
    // A mirrored batch is not a mismatch: the tripwire S6 consults must
    // stay clean or no parity claim is possible later.
    expect(getProcessShadowMismatchCount()).toBe(0);
  });

  it('leaves a never-rewound stream on the store-derived revisions', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    _resetProcessShadowStatsForTests();

    const second = await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-2',
      expectedRevision: 2,
      events: [event(2)],
    });

    expect(second.kind).toBe('committed');
    expect(journalRows().map((row) => row.revision)).toEqual([1, 2, 3]);
    expect(new Set(journalRows().map((row) => row.branchId))).toEqual(
      new Set([LIVE_BRANCH]),
    );
    expect(headRevisionOf(LIVE_BRANCH)).toBe(3);
    expect(getProcessShadowMismatchCount()).toBe(0);
  });

  it('appends at the head when the match log has run ahead of it', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    // The shape `ServerMatchHost.create` leaves: an event in the match
    // log that never crossed the batch boundary the mirror hooks, so
    // the store's next sequence is 3 while the head is still at 2.
    await store!.appendEvent(MATCH_ID, event(2));
    _resetProcessShadowStatsForTests();

    const ahead = await store!.appendCommandBatch!(MATCH_ID, {
      ...batch(),
      commandId: 'cmd-ahead',
      expectedRevision: 3,
      events: [event(3)],
    });

    // The head answered 2, so the batch lands at 3. Sourcing the store's
    // next sequence instead would have aimed at 3 and been refused. The
    // journal then holds no row for the log's sequence 2 - that gap is
    // the create-path seeding S7 owes, not something this seam hides:
    // the head is the authority and it never claimed that event.
    expect(ahead.kind).toBe('committed');
    expect(journalRows().map((r) => `${r.branchId}@${r.revision}`)).toEqual(
      [1, 2, 3].map((revision) => `${LIVE_BRANCH}@${revision}`),
    );
    expect(journalRows().at(-1)?.eventId).toBe('cmd-ahead:0');
    expect(getProcessShadowMismatchCount()).toBe(0);
  });
});

describe('the expected-head race', () => {
  it('exactly one writer commits and the loser is refused typed', async () => {
    const branchId = await seedThenRewind();
    const second = new Database(campaignPath, { fileMustExist: true });
    try {
      // BOTH writers consult before EITHER appends. This is the window
      // a second process is in, and the only race this engine has.
      const view = consult(CUT_REVISION);
      expect(view).toEqual({ kind: 'journal', expectedRevision: 1 });

      const winner = await mirrorOn(primary(), 'cmd-race-a', view, [
        event(1, 'evt-race-a'),
      ]);
      const loser = await mirrorOn(second, 'cmd-race-b', view, [
        event(1, 'evt-race-b'),
      ]);

      expect(winner).toEqual({ kind: 'mirrored' });
      expect(loser).toEqual({
        kind: 'revision-conflict',
        expectedRevision: 1,
        actualRevision: 2,
      });
      // No partial write: the loser's event is not in the journal, and
      // no double head - the activated branch advanced exactly once.
      expect(journalRows().filter((row) => row.branchId === branchId)).toEqual([
        { revision: 2, branchId, eventId: 'cmd-race-a:0' },
      ]);
      expect(headRevisionOf(branchId)).toBe(2);
      expect(streamHeads()).toHaveLength(2);
    } finally {
      second.close();
    }
  });

  it('never-rewound stream: the loser is refused against the head it consulted', async () => {
    await store!.appendCommandBatch!(MATCH_ID, batch());
    const second = new Database(campaignPath, { fileMustExist: true });
    try {
      const view = consult(2);
      const winner = await mirrorOn(primary(), 'cmd-live-a', view, [
        event(2, 'evt-live-a'),
      ]);
      const loser = await mirrorOn(second, 'cmd-live-b', view, [
        event(2, 'evt-live-b'),
      ]);

      expect(winner).toEqual({ kind: 'mirrored' });
      expect(loser).toEqual({
        kind: 'revision-conflict',
        expectedRevision: 2,
        actualRevision: 3,
      });
      expect(journalRows().map((row) => row.eventId)).toEqual([
        'cmd-1:0',
        'cmd-1:1',
        'cmd-live-a:0',
      ]);
      expect(headRevisionOf(LIVE_BRANCH)).toBe(3);
    } finally {
      second.close();
    }
  });
});

describe('duplicate-command refusal on the journal-head path', () => {
  it('replays a retried command from its receipt without a second append', async () => {
    const branchId = await seedThenRewind();
    const view = consult(CUT_REVISION);
    await mirrorOn(primary(), 'cmd-retried', view, [event(1, 'evt-retried')]);
    const before = journalRows();

    // The SAME expectation the first attempt carried, now stale by one
    // revision. Identity answers before the head does, so a retry that
    // arrives after the stream moved is still a retry.
    const retry = await mirrorOn(primary(), 'cmd-retried', view, [
      event(1, 'evt-retried'),
    ]);

    expect(retry).toEqual({ kind: 'mirrored' });
    expect(journalRows()).toEqual(before);
    expect(headRevisionOf(branchId)).toBe(2);
  });

  it('refuses the same command id carrying different work and appends nothing', async () => {
    const branchId = await seedThenRewind();
    const view = consult(CUT_REVISION);
    await mirrorOn(primary(), 'cmd-forked', view, [event(1, 'evt-forked')]);
    const before = journalRows();

    const forked = await mirrorOn(primary(), 'cmd-forked', view, [
      event(1, 'evt-forked-differently'),
    ]);

    expect(forked).toEqual({ kind: 'duplicate-command' });
    expect(journalRows()).toEqual(before);
    expect(headRevisionOf(branchId)).toBe(2);
  });
});
