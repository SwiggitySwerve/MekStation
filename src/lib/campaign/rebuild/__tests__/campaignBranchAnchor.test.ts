/**
 * The campaign branch anchor, and the candidate head it reads (Seam C1).
 *
 * Two facts are under test here and they are different kinds of fact.
 *
 * The anchor rows are about RESOLUTION: where a branch is, read from the
 * branch it names rather than computed from a campaign sequence. The
 * candidate-head rows are about finding #80 - a candidate that was
 * storable and unmaterializable at the same time, because
 * `createBranch` wrote `event_history_branches` and nothing else, so the
 * journal writer saw no head, numbered from 1, and chained to null while
 * the path resolver demanded baseRevision + 1 chained to the base digest.
 *
 * RED BEFORE THE SEED (measured on shipped code): the head query in A0
 * returned zero rows for a freshly minted candidate.
 *
 * A0 exists because A1 could not do that job, and the mutant is what
 * showed it. The anchor's fallback answers from the branch record with
 * the same `(baseRevision, baseDigest)` the seed writes, so with the seed
 * removed every anchor-level row stayed green - the fix was invisible to
 * the assertions that were supposed to prove it. A0 reads the TABLE the
 * journal writer reads, and it is the row that dies.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  EVENT_HISTORY_GENESIS_DIGEST,
  _branchCreationSeamForTests,
} from '@/lib/events/journal/EventHistoryBranchContract';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';

import { JournalCampaignEventStore } from '../../sync/JournalCampaignEventStore';
import { readCampaignBranchAnchor } from '../CampaignBranchAnchor';

const CAMPAIGN_ID = 'campaign-anchor';
const TS = '2026-09-02T00:00:00.000Z';

function campaignEvent(sequence: number): ICampaignEvent {
  return sequence === 0
    ? {
        type: 'CampaignSnapshotPublished',
        sequence,
        campaignId: CAMPAIGN_ID,
        ts: TS,
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: { state: createEmptyCampaignState(CAMPAIGN_ID) },
      }
    : {
        type: 'FundsChanged',
        sequence,
        campaignId: CAMPAIGN_ID,
        ts: TS,
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: { delta: 100, reason: `fact-${sequence}`, balance: 100 },
      };
}

describe('campaign branch anchor', () => {
  let dir: string;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-anchor-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    db = getSQLiteService().getDatabase();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Two committed campaign facts on root, and a backfilled genesis branch. */
  async function seedRootHistory(): Promise<void> {
    const store = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS),
    );
    await store.appendEvent(CAMPAIGN_ID, campaignEvent(0));
    await store.appendEvent(CAMPAIGN_ID, campaignEvent(1));
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  const stream = { streamType: 'campaign', streamId: CAMPAIGN_ID };

  /**
   * Mint a candidate the ONLY authorized way: a live correction lease
   * bound to the current head, then the lease-gated build. Nothing here
   * reaches into the branch or head tables by hand - a candidate written
   * by raw INSERT would prove nothing about the path a rewind takes.
   */
  function mintCandidate(): {
    branchId: string;
    baseRevision: number;
    baseDigest: string;
  } {
    const branches = new SQLiteEventHistoryBranchStore(db);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => Date.parse(TS),
    });
    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
           FROM event_journal_stream_heads
          WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(CAMPAIGN_ID) as { revision: number; digest: string };
    const lease = leases.acquireCorrectionLease({
      ...stream,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'anchor-test',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    const candidate = createCorrectionCandidateBranch(db, leases, {
      ...stream,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: TS,
    });
    return {
      branchId: candidate.branchId,
      baseRevision: candidate.baseRevision,
      baseDigest: candidate.baseDigest,
    };
  }

  it('A0: minting a candidate writes the journal head the writer reads', async () => {
    await seedRootHistory();
    const candidate = mintCandidate();

    // Queried from the TABLE, not through the anchor. The anchor's
    // fallback answers from the branch record with the same two values
    // the seed writes, so an anchor-level assertion cannot tell a
    // seeded candidate from an unseeded one - while the journal writer
    // reads THIS row and nothing else. Without this pin the seed has
    // no row that dies when it is removed.
    // `Object.assign` rather than the raw row: better-sqlite3 hands back a
    // null-prototype object, and a strict comparison against a literal
    // fails on the prototype alone. An absent row becomes `{}` here, which
    // is the diff that fires when the seed is removed.
    expect(
      Object.assign(
        {},
        db
          .prepare(
            `SELECT stream_revision AS revision, event_digest AS digest
               FROM event_journal_stream_heads
              WHERE stream_type = 'campaign' AND stream_id = ?
                AND branch_id = ?`,
          )
          .get(CAMPAIGN_ID, candidate.branchId),
      ),
    ).toStrictEqual({
      revision: candidate.baseRevision,
      digest: candidate.baseDigest,
    });
  });

  it('A1: a minted candidate anchors at the base it was cut from', async () => {
    await seedRootHistory();
    const candidate = mintCandidate();

    const rootBase = db
      .prepare(
        `SELECT event_digest AS digest FROM event_journal_events
          WHERE stream_id = ? AND stream_revision = ?`,
      )
      .get(CAMPAIGN_ID, candidate.baseRevision) as { digest: string };

    // The head the journal writer will read, and the base the path
    // resolver will verify against, are the same two numbers. Before the
    // seed there was no row here at all.
    expect(
      readCampaignBranchAnchor(db, CAMPAIGN_ID, candidate.branchId),
    ).toStrictEqual({
      branchId: candidate.branchId,
      revision: candidate.baseRevision,
      digest: rootBase.digest,
    });
  });

  it('A2: the anchor is read from the branch named, not the stream', async () => {
    await seedRootHistory();
    const candidate = mintCandidate();

    // Root moves on after the cut. The candidate does not - and a
    // resolver that read the STREAM rather than the branch would report
    // root's new head for both, which is exactly the confusion that let a
    // campaign sequence stand in for a journal revision.
    const store = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS),
    );
    await store.appendEvent(CAMPAIGN_ID, campaignEvent(2));

    const root = readCampaignBranchAnchor(db, CAMPAIGN_ID, 'root');
    const onCandidate = readCampaignBranchAnchor(
      db,
      CAMPAIGN_ID,
      candidate.branchId,
    );

    expect(root.revision).toStrictEqual(3);
    expect(onCandidate.revision).toStrictEqual(candidate.baseRevision);
    expect(onCandidate.revision).toStrictEqual(2);
    expect(root.digest).not.toStrictEqual(onCandidate.digest);
  });

  it('A2b: a candidate can only be cut at the head, never below it', async () => {
    await seedRootHistory();
    const branches = new SQLiteEventHistoryBranchStore(db);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => Date.parse(TS),
    });
    const earlier = db
      .prepare(
        `SELECT event_digest AS digest FROM event_journal_events
          WHERE stream_id = ? AND stream_revision = 1`,
      )
      .get(CAMPAIGN_ID) as { digest: string };

    // A rewind wants a base BELOW the head - that is what "from a trusted
    // base" means when facts are being dropped. The lease is the only way
    // to a candidate, and it binds the base to the head it fences on, so
    // asking for revision 1 while the head is 2 is refused as a stale
    // head rather than understood as a rewind target. Finding #83: the
    // branches leaf mints forward-correction candidates only.
    expect(() =>
      leases.acquireCorrectionLease({
        ...stream,
        owner: 'host-1',
        actor: 'gm-1',
        reason: 'rewind-to-1',
        ttlMs: 60_000,
        expectedBranchId: 'root',
        expectedRevision: 1,
        expectedDigest: earlier.digest,
        expectedGeneration: 1,
      }),
    ).toThrow(/STALE_REVISION/);
  });

  it('A3: a root branch with no events sits at genesis, from the record', async () => {
    // No appends: the branch record exists, the head row does not. The
    // fallback arm answers from the record rather than coalescing a
    // missing row to zero, which is right for the wrong reason.
    new SQLiteEventHistoryBranchStore(
      db,
      _branchCreationSeamForTests(),
    ).createBranch({
      ...stream,
      branchId: 'root',
      parentBranchId: null,
      ancestorDepth: 0,
      baseRevision: 0,
      baseEventId: null,
      baseDigest: EVENT_HISTORY_GENESIS_DIGEST,
      status: 'effective',
      createdBy: 'test',
      reason: 'empty stream',
      createdAt: TS,
    });

    expect(readCampaignBranchAnchor(db, CAMPAIGN_ID, 'root')).toStrictEqual({
      branchId: 'root',
      revision: 0,
      digest: EVENT_HISTORY_GENESIS_DIGEST,
    });
  });

  it('A3b: the fallback answers from the record, not from genesis', async () => {
    await seedRootHistory();
    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
           FROM event_journal_stream_heads
          WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(CAMPAIGN_ID) as { revision: number; digest: string };
    const base = db
      .prepare(
        `SELECT event_id AS id FROM event_journal_events
          WHERE stream_id = ? AND stream_revision = ?`,
      )
      .get(CAMPAIGN_ID, head.revision) as { id: string };

    // A child branch with a record and NO head row - the shape a candidate
    // had before the seed, and the only shape that can tell the fallback
    // apart from a hardcoded genesis. A3's root sits at (0, genesis)
    // anyway, so it cannot discriminate: this one sits at (2, a real
    // event digest).
    new SQLiteEventHistoryBranchStore(
      db,
      _branchCreationSeamForTests(),
    ).createBranch({
      ...stream,
      branchId: 'unseeded-child',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: head.revision,
      baseEventId: base.id,
      baseDigest: head.digest,
      status: 'building',
      createdBy: 'test',
      reason: 'record without a head row',
      createdAt: TS,
    });

    expect(
      readCampaignBranchAnchor(db, CAMPAIGN_ID, 'unseeded-child'),
    ).toStrictEqual({
      branchId: 'unseeded-child',
      revision: head.revision,
      digest: head.digest,
    });
  });

  it('A5: a head below its own base is refused, never worked around', async () => {
    await seedRootHistory();
    const candidate = mintCandidate();

    // The head row and the branch record disagreeing about where the
    // branch starts is corruption, not a stale read: appending against
    // either answer writes history the path resolver cannot materialise.
    // Revision 1 rather than 0 because a head row may not hold 0 at all -
    // the schema's own CHECK is what makes "no row" the only way to say
    // a branch has nothing yet.
    expect(candidate.baseRevision).toBeGreaterThan(1);
    db.prepare(
      `UPDATE event_journal_stream_heads SET stream_revision = 1
        WHERE stream_id = ? AND branch_id = ?`,
    ).run(CAMPAIGN_ID, candidate.branchId);

    expect(() =>
      readCampaignBranchAnchor(db, CAMPAIGN_ID, candidate.branchId),
    ).toThrow(/below its base revision/);
  });

  it('A4: an unknown branch is refused, never defaulted', async () => {
    await seedRootHistory();

    expect(() =>
      readCampaignBranchAnchor(db, CAMPAIGN_ID, 'no-such-branch'),
    ).toThrow(/no-such-branch/);
  });
});
