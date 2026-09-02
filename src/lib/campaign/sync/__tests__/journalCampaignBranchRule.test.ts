/**
 * The branch rule that replaced the journal's root pin (Seam B2).
 *
 * Migration 26 lifted the storage CHECK, but that was the third of three
 * pins: `EventBranchId` was the literal type `'root'`, and the append
 * schema carried `z.literal(ROOT_EVENT_BRANCH_ID)`. With all three gone
 * the journal admits any non-empty branch id, and what refuses an
 * ARBITRARY one is this rule - an append naming a branch that is not the
 * stream's current effective branch is refused typed, so only the
 * branches-leaf activation path can move which id a stream accepts.
 *
 * Pins: a store built the way every production site builds one writes on
 * root exactly as before (R1 - load-bearing only against the
 * default-inert mutant, which is why that mutant is run); handed a branch
 * store the id is DERIVED from the effective head rather than typed into
 * the source (R2); an arbitrary id is refused typed (R3); and the widened
 * schema still refuses an id that is not an id (R5).
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../JournalCampaignEventStore';

import {
  CampaignStaleBranchError,
  JournalCampaignEventStore,
} from '../JournalCampaignEventStore';

const CAMPAIGN_ID = 'campaign-branch-rule';
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
        payload: { delta: 100, reason: `probe-${sequence}`, balance: 100 },
      };
}

describe('journal campaign branch rule', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-branch-rule-'));
    dbPath = path.join(dir, 'journal.db');
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

  function journalOf(db: Database.Database) {
    return new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS);
  }

  /** The branch id every stored event for this campaign carries. */
  function storedBranchIds(db: Database.Database): string[] {
    return (
      db
        .prepare(
          `SELECT branch_id FROM event_journal_events
           WHERE stream_id = ? ORDER BY commit_position`,
        )
        .all(CAMPAIGN_ID) as { branch_id: string }[]
    ).map((row) => row.branch_id);
  }

  it('R1: a store built the production way still writes on root', async () => {
    const db = database();
    const store = new JournalCampaignEventStore(journalOf(db));
    await store.appendEvent(CAMPAIGN_ID, campaignEvent(0));

    expect(storedBranchIds(db)).toStrictEqual(['root']);
  });

  it('R2: handed a branch store, the id is derived from the effective head', async () => {
    const db = database();
    const seeded = new JournalCampaignEventStore(journalOf(db));
    await seeded.appendEvent(CAMPAIGN_ID, campaignEvent(0));
    const branches = new SQLiteEventHistoryBranchStore(db);
    branches.backfillGenesisBranches();

    const store = new JournalCampaignEventStore(journalOf(db), branches);
    await store.appendEvent(CAMPAIGN_ID, campaignEvent(1));

    // Same wire as R1 - but read from the effective head rather than
    // typed into the source, which is what makes an activation able to
    // move it at all.
    expect(storedBranchIds(db)).toStrictEqual(['root', 'root']);
  });

  it('R3: an append naming a branch that is not effective is refused typed', async () => {
    const db = database();
    const seeded = new JournalCampaignEventStore(journalOf(db));
    await seeded.appendEvent(CAMPAIGN_ID, campaignEvent(0));
    const branches = new SQLiteEventHistoryBranchStore(db);
    branches.backfillGenesisBranches();
    const store = new JournalCampaignEventStore(journalOf(db), branches);

    await expect(
      store.appendCommandBatch(CAMPAIGN_ID, {
        commandId: 'cmd-arbitrary',
        events: [campaignEvent(1)],
        expectedPostStateDigest: 'd'.repeat(64),
        branchId: 'candidate-1',
      }),
    ).rejects.toThrow(CampaignStaleBranchError);

    // Nothing was written: a refused append is not a partial one.
    expect(storedBranchIds(db)).toStrictEqual(['root']);
  });

  it('R3c: the refusal carries the code the client door keys on', async () => {
    const db = database();
    const seeded = new JournalCampaignEventStore(journalOf(db));
    await seeded.appendEvent(CAMPAIGN_ID, campaignEvent(0));
    const branches = new SQLiteEventHistoryBranchStore(db);
    branches.backfillGenesisBranches();
    const store = new JournalCampaignEventStore(journalOf(db), branches);

    const refusal = await store
      .appendCommandBatch(CAMPAIGN_ID, {
        commandId: 'cmd-arbitrary',
        events: [campaignEvent(1)],
        expectedPostStateDigest: 'd'.repeat(64),
        branchId: 'candidate-1',
      })
      .then(
        () => null,
        (error: unknown) => error as CampaignStaleBranchError,
      );

    // The DISCRIMINANT, not the message and not the class. The campaign
    // refusal vocabulary and the client's command door
    // (`campaignRefusalFromCommandRefusal`) both key on this exact
    // string, so a rename here silently stops a client recognising the
    // refusal while every class-level assertion stays green.
    expect(refusal?.code).toStrictEqual('STALE_BRANCH');
    expect(refusal?.effectiveBranchId).toStrictEqual('root');
    expect(refusal?.requestedBranchId).toStrictEqual('candidate-1');
  });

  it('R3b: without a branch store, a non-root id is still refused', async () => {
    const db = database();
    const store = new JournalCampaignEventStore(journalOf(db));
    await store.appendEvent(CAMPAIGN_ID, campaignEvent(0));

    await expect(
      store.appendCommandBatch(CAMPAIGN_ID, {
        commandId: 'cmd-arbitrary',
        events: [campaignEvent(1)],
        expectedPostStateDigest: 'd'.repeat(64),
        branchId: 'candidate-1',
      }),
    ).rejects.toThrow(CampaignStaleBranchError);
  });

  it('R5: an id that is not an id is refused, pin narrowed not removed', async () => {
    const db = database();
    const store = new JournalCampaignEventStore(journalOf(db));
    await store.appendEvent(CAMPAIGN_ID, campaignEvent(0));

    await expect(
      store.appendCommandBatch(CAMPAIGN_ID, {
        commandId: 'cmd-blank',
        events: [campaignEvent(1)],
        expectedPostStateDigest: 'd'.repeat(64),
        branchId: '   ',
      }),
    ).rejects.toThrow(CampaignStaleBranchError);
  });
  /**
   * Install `candidate-1` as the stream's effective branch through the
   * REAL activation path - lease, candidate record, sealed impact
   * manifest, atomic swap. Nothing here reaches into the head table by
   * hand: the point of the row is that only this path can move which
   * branch the journal accepts.
   */
  function activateCandidate(db: Database.Database): void {
    const branches = new SQLiteEventHistoryBranchStore(db);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => Date.parse(TS),
    });
    const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
    const stream = { streamType: 'campaign', streamId: CAMPAIGN_ID };

    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads WHERE stream_id = ?`,
      )
      .get(CAMPAIGN_ID) as { revision: number; digest: string };
    const base = db
      .prepare(
        `SELECT event_id AS id, event_digest AS digest
           FROM event_journal_events
           WHERE stream_id = ? AND stream_revision = 1`,
      )
      .get(CAMPAIGN_ID) as { id: string; digest: string };

    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('campaign', ?, 'candidate-1', 'root', 1, 1, ?, ?, 'building',
               'host-1', 'branch-rule-test', ?)`,
    ).run(CAMPAIGN_ID, base.id, base.digest, TS);
    manifests.sealArtifactManifest(
      stream,
      'candidate-1',
      [
        {
          artifactKind: 'projection',
          artifactId: CAMPAIGN_ID,
          sourceRevision: 1,
        },
      ],
      TS,
    );
    const lease = leases.acquireCorrectionLease({
      ...stream,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'branch-rule-test',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    const result = activateCandidateBranch(db, branches, leases, manifests, {
      stream,
      candidateBranchId: 'candidate-1',
      held: {
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
      },
      reason: 'branch-rule-test',
      activatedAt: TS,
    });
    expect(result.branchId).toBe('candidate-1');
  }

  it('R4: after a real activation the new branch is accepted and root refused', async () => {
    const db = database();
    const seeded = new JournalCampaignEventStore(journalOf(db));
    await seeded.appendEvent(CAMPAIGN_ID, campaignEvent(0));
    await seeded.appendEvent(CAMPAIGN_ID, campaignEvent(1));
    const branches = new SQLiteEventHistoryBranchStore(db);
    branches.backfillGenesisBranches();

    activateCandidate(db);

    const store = new JournalCampaignEventStore(journalOf(db), branches);

    // The branch the activation installed is the one the rule now takes:
    // naming it passes the rule (any later failure is a DIFFERENT, named
    // one), and naming the superseded branch is refused by the same rule
    // that refused an arbitrary id before the activation.
    // Naming the newly effective branch PASSES THE RULE: what comes back
    // is a typed sequence conflict, not a stale-branch refusal. The
    // distinction is the whole row - the branch was admitted, and a
    // different, named thing failed after it.
    const onCandidate = await store.appendCommandBatch(CAMPAIGN_ID, {
      commandId: 'cmd-on-candidate',
      events: [campaignEvent(2)],
      expectedPostStateDigest: 'd'.repeat(64),
      branchId: 'candidate-1',
    });
    expect(onCandidate.kind).toBe('sequence-conflict');

    // NOT claimed: a committed append ONTO the new branch. A campaign
    // sequence is stream-global while a candidate branch is anchored at a
    // base revision, so the store's `expectedRevision: sequence` is
    // branch-unaware. Resolving the expected REVISION from the branch
    // head - as this seam resolved the branch ID - belongs with 16.2,
    // where a rewind REPLAYS the campaign onto the new branch rather than
    // appending at its old sequence.

    await expect(
      store.appendCommandBatch(CAMPAIGN_ID, {
        commandId: 'cmd-on-root',
        events: [campaignEvent(3)],
        expectedPostStateDigest: 'd'.repeat(64),
        branchId: 'root',
      }),
    ).rejects.toThrow(CampaignStaleBranchError);
  });
});
