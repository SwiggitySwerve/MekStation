/**
 * Where a correction is CUT, versus where it is FENCED (umbrella task
 * 16.2, Seam C1c; finding #87).
 *
 * `createCorrectionCandidateBranch` anchored every candidate at
 * `lease.expectedRevision`, and `acquireCorrectionLease` refuses any
 * expected revision that is not the live head. Those two facts together
 * meant a candidate could only ever be cut AT the head - so a rewind,
 * whose entire purpose is to anchor a replacement BELOW the head and
 * leave the facts above it behind, could not be expressed at all. The
 * branches leaf minted forward-correction candidates only.
 *
 * RED BEFORE THIS SEAM: B2 could not compile - `baseRevision` was not a
 * field of `ICandidateBuildRequest` - and with the field added but
 * ignored it returned a candidate anchored at 3, the head, rather than
 * at the requested 2.
 *
 * Fencing is deliberately UNCHANGED. The lease still has to name the
 * live head, and B3 pins that a base above it is refused: the point is
 * to separate two numbers that were one, not to loosen the guard.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

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

const CAMPAIGN_ID = 'campaign-candidate-base';
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

describe('campaign candidate base revision', () => {
  let dir: string;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'candidate-base-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    db = getSQLiteService().getDatabase();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  const stream = { streamType: 'campaign', streamId: CAMPAIGN_ID };

  /** Three committed facts on root, and a backfilled genesis branch. */
  async function seedRootHistory(count = 3): Promise<void> {
    const store = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS),
    );
    for (let sequence = 0; sequence < count; sequence += 1) {
      await store.appendEvent(CAMPAIGN_ID, campaignEvent(sequence));
    }
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  function leases(): SQLiteEventHistoryCorrectionLeaseStore {
    return new SQLiteEventHistoryCorrectionLeaseStore(
      db,
      new SQLiteEventHistoryBranchStore(db),
      { nowMs: () => Date.parse(TS) },
    );
  }

  /** The live root head, which is the only thing a lease may fence on. */
  function rootHead(): { revision: number; digest: string } {
    return db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
           FROM event_journal_stream_heads
          WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(CAMPAIGN_ID) as { revision: number; digest: string };
  }

  /** Acquire a correction lease fenced correctly at the live head. */
  function fencedLease(store: SQLiteEventHistoryCorrectionLeaseStore) {
    const head = rootHead();
    return store.acquireCorrectionLease({
      ...stream,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'candidate-base-test',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
  }

  /** The event root holds at one revision. */
  function rootEventAt(revision: number): {
    eventId: string;
    eventDigest: string;
  } {
    return db
      .prepare(
        `SELECT event_id AS eventId, event_digest AS eventDigest
           FROM event_journal_events
          WHERE stream_id = ? AND branch_id = 'root' AND stream_revision = ?`,
      )
      .get(CAMPAIGN_ID, revision) as {
      eventId: string;
      eventDigest: string;
    };
  }

  it('B1: with no base named, the candidate is cut at the fenced head', async () => {
    await seedRootHistory();
    const store = leases();
    const lease = fencedLease(store);

    const candidate = createCorrectionCandidateBranch(db, store, {
      ...stream,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: TS,
    });

    // The default is what every caller got before the field existed, so
    // adding it changed nothing for anyone who does not name it.
    expect(candidate.baseRevision).toStrictEqual(rootHead().revision);
    expect(candidate.baseEventId).toStrictEqual(rootEventAt(3).eventId);
  });

  it('B2: a named earlier base cuts the candidate below the head', async () => {
    await seedRootHistory();
    const store = leases();
    const lease = fencedLease(store);

    const candidate = createCorrectionCandidateBranch(db, store, {
      ...stream,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: TS,
      baseRevision: 2,
    });

    // The head is 3 and the lease is fenced there; the candidate is cut
    // at 2. This is the shape a rewind needs and the one the leaf could
    // not express: the facts above 2 are what a replay will leave behind.
    const base = rootEventAt(2);
    expect(candidate.baseRevision).toStrictEqual(2);
    expect(candidate.baseEventId).toStrictEqual(base.eventId);
    expect(candidate.baseDigest).toStrictEqual(base.eventDigest);

    // And C1a's seed anchors the journal head at the cut, not at the
    // fenced head - the two numbers stay apart all the way to storage.
    expect(
      Object.assign(
        {},
        db
          .prepare(
            `SELECT stream_revision AS revision, event_digest AS digest
               FROM event_journal_stream_heads
              WHERE stream_id = ? AND branch_id = ?`,
          )
          .get(CAMPAIGN_ID, candidate.branchId),
      ),
    ).toStrictEqual({ revision: 2, digest: base.eventDigest });
  });

  it('B3: a base above the fenced head is refused', async () => {
    await seedRootHistory();
    const store = leases();
    const lease = fencedLease(store);

    // Revision 4 does not exist. Fencing is unchanged by this seam, and
    // a candidate anchored above the head would claim a future.
    expect(() =>
      createCorrectionCandidateBranch(db, store, {
        ...stream,
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
        createdAt: TS,
        baseRevision: 4,
      }),
    ).toThrow(/above the head its lease fenced/);
  });

  it('B4: a base of 0 is refused by name, not by constraint', async () => {
    await seedRootHistory();
    const store = leases();
    const lease = fencedLease(store);

    // A child anchors to a real base EVENT and revision 0 is the revision
    // with no event. `assertValidBranchRecord` would refuse the record
    // anyway; refusing here names the parameter that was wrong instead of
    // the record built from it.
    expect(() =>
      createCorrectionCandidateBranch(db, store, {
        ...stream,
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
        createdAt: TS,
        baseRevision: 0,
      }),
    ).toThrow(/safe integer of 1 or more/);
  });

  it('B5: the base event comes from the parent branch, not the revision', async () => {
    // One fact on root, then a FOREIGN branch's event sitting at the same
    // revision the candidate will be cut at, then the rest of root. The
    // foreign row is written before root's, so a query that does not name
    // a branch reaches it first.
    await seedRootHistory(1);
    db.prepare(
      `INSERT INTO event_journal_batches (
         command_id, command_digest, canonicalizer_version, stream_type,
         stream_id, branch_id, event_count, first_stream_revision,
         last_stream_revision, first_commit_position, last_commit_position,
         recorded_at)
       VALUES ('cmd-foreign', ?, 1, 'campaign', ?, 'other-branch', 1, 2, 2,
         9001, 9001, ?)`,
    ).run('e'.repeat(64), CAMPAIGN_ID, TS);
    db.prepare(
      `INSERT INTO event_journal_events (
         event_id, command_id, stream_type, stream_id, branch_id,
         stream_revision, commit_position, command_index, event_type,
         event_version, correlation_id, actor_kind, actor_id,
         authority_type, authority_id, occurred_at, recorded_at,
         canonicalizer_version, previous_stream_event_digest, event_digest,
         payload_json)
       VALUES ('evt-foreign', 'cmd-foreign', 'campaign', ?, 'other-branch',
         2, 9001, 0, 'probe_event', 1, 'corr-foreign', 'system', 'probe',
         'campaign', ?, ?, ?, 1, ?, ?, '{"v":1}')`,
      // A non-null predecessor: the journal's chain CHECK permits a null
      // one only at revision 1, and this row has to be a plausible
      // sibling rather than a malformed one, or it proves nothing.
    ).run(CAMPAIGN_ID, CAMPAIGN_ID, TS, TS, 'd'.repeat(64), 'c'.repeat(64));

    const store2 = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS),
    );
    await store2.appendEvent(CAMPAIGN_ID, campaignEvent(1));
    await store2.appendEvent(CAMPAIGN_ID, campaignEvent(2));
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();

    const store = leases();
    const lease = fencedLease(store);
    const candidate = createCorrectionCandidateBranch(db, store, {
      ...stream,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: TS,
      baseRevision: 2,
    });

    // A revision is unique only WITHIN a branch. Anchoring to a sibling's
    // event at the same number would build a replacement on history the
    // candidate's own parent never held, and every digest check
    // downstream would then be comparing against the wrong chain.
    expect(candidate.baseEventId).toStrictEqual(rootEventAt(2).eventId);
    expect(candidate.baseEventId).not.toStrictEqual('evt-foreign');
  });
});
