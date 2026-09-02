/**
 * Replacement-branch replay (Seam C1c-ii; findings #70, #80).
 * Predicted red is in the impl report; each row name is load-bearing.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  materializeBranchPath,
  resolveBranchPath,
  type IBranchPathSegment,
} from '@/lib/events/journal/EventHistoryBranchResolver';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  appendCampaignCommandBatch,
  CampaignStaleBranchError,
  envelopeOf,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../../sync/JournalCampaignEventStore';
import { campaignBranchSegmentReader } from '../campaignBranchSegmentReader';
import {
  candidateScopedCommandId,
  replayCampaignReplacement,
} from '../CampaignReplacementReplay';

const TS = '2026-09-02T00:00:00.000Z';

function fundsEvent(campaignId: string, sequence: number): ICampaignEvent {
  return {
    type: 'FundsChanged',
    sequence,
    campaignId,
    ts: TS,
    authorPlayerId: 'pid_host',
    scope: 'campaign',
    payload: {
      delta: 100,
      reason: `fact-${sequence}`,
      balance: sequence * 100,
    },
  };
}

describe('campaign replacement replay', () => {
  let dir: string;
  let db: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-replay-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    db = getSQLiteService().getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS);
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function commitCommand(
    campaignId: string,
    commandId: string,
    sequences: readonly number[],
    expectedRevision: number,
  ): Promise<void> {
    const result = await appendCampaignCommandBatch(journal, {
      campaignId,
      commandId,
      events: sequences.map((sequence) => fundsEvent(campaignId, sequence)),
      expectedPostStateDigest: null,
      expectedRevision,
    });
    if (result.kind !== 'committed') {
      throw new Error(`seed ${commandId} ${result.kind}`);
    }
  }

  /** C1..C5 on root with sequence = revision (1-based, no genesis 0). */
  async function seedPinned(campaignId: string): Promise<void> {
    await commitCommand(campaignId, 'C1', [1], 0);
    await commitCommand(campaignId, 'C2', [2], 1);
    await commitCommand(campaignId, 'C3', [3], 2);
    await commitCommand(campaignId, 'C4', [4, 5], 3);
    await commitCommand(campaignId, 'C5', [6], 5);
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  async function seedPair(campaignId: string): Promise<void> {
    await commitCommand(campaignId, 'C1', [1], 0);
    await commitCommand(campaignId, 'C2', [2], 1);
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  function mintAt(campaignId: string, baseRevision: number) {
    const stream = { streamType: 'campaign' as const, streamId: campaignId };
    const branches = new SQLiteEventHistoryBranchStore(db);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => Date.parse(TS),
    });
    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
           FROM event_journal_stream_heads WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(campaignId) as { revision: number; digest: string };
    const lease = leases.acquireCorrectionLease({
      ...stream,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'replay-test',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    return createCorrectionCandidateBranch(db, leases, {
      ...stream,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: TS,
      baseRevision,
    });
  }

  async function retainedOf(campaignId: string, commandIds: readonly string[]) {
    const wanted = new Set(commandIds);
    const stored = await journal.readStream({
      streamType: 'campaign',
      streamId: campaignId,
      branchId: 'root',
      afterRevision: 0,
      limit: 20,
    });
    return stored
      .filter((row) => wanted.has(row.commandId))
      .map((row) => ({ commandId: row.commandId, event: envelopeOf(row) }));
  }

  function suffixOf(candidate: {
    branchId: string;
    baseEventId: string | null;
    baseDigest: string;
  }): IBranchPathSegment {
    return {
      kind: 'suffix',
      branchId: candidate.branchId,
      fromRevision: 2,
      throughRevision: 5,
      baseEventId: candidate.baseEventId,
      baseDigest: candidate.baseDigest,
    };
  }

  async function replayDropped(campaignId: string) {
    await seedPinned(campaignId);
    const candidate = mintAt(campaignId, 2);
    const receipts = await replayCampaignReplacement(journal, db, {
      campaignId,
      candidateBranchId: candidate.branchId,
      events: await retainedOf(campaignId, ['C4', 'C5']),
    });
    return { candidate, receipts };
  }

  it('R2: a committed append lands on a non-root branch at baseRevision + 1, chained to the base digest', async () => {
    const campaignId = 'campaign-r2';
    await seedPair(campaignId);
    const candidate = mintAt(campaignId, 2);
    const receipts = await replayCampaignReplacement(journal, db, {
      campaignId,
      candidateBranchId: candidate.branchId,
      events: [{ commandId: 'C-next', event: fundsEvent(campaignId, 4) }],
    });
    expect(receipts[0].receipt.branchId).toBe(candidate.branchId);
    expect(receipts[0].receipt.firstStreamRevision).toBe(3);
    expect(
      Object.assign(
        {},
        db
          .prepare(
            `SELECT branch_id AS branchId, stream_revision AS revision,
                    previous_stream_event_digest AS previous
               FROM event_journal_events
              WHERE stream_id = ? AND branch_id = ?`,
          )
          .get(campaignId, candidate.branchId),
      ),
    ).toStrictEqual({
      branchId: candidate.branchId,
      revision: 3,
      previous: candidate.baseDigest,
    });
  });

  it('R3: sequence differs from revision when a command is dropped', async () => {
    const campaignId = 'campaign-r3';
    const { candidate } = await replayDropped(campaignId);
    const suffix = await campaignBranchSegmentReader(journal).read(
      { streamType: 'campaign', streamId: campaignId },
      suffixOf(candidate),
    );
    expect(
      suffix.map((row) => [envelopeOf(row).sequence, row.streamRevision]),
    ).toEqual([
      [4, 3],
      [5, 4],
      [6, 5],
    ]);
  });

  it('R4: the client door still refuses a direct append to the building candidate', async () => {
    const campaignId = 'campaign-r4';
    await seedPair(campaignId);
    const candidate = mintAt(campaignId, 2);
    const store = new JournalCampaignEventStore(
      journal,
      new SQLiteEventHistoryBranchStore(db),
    );
    await expect(
      store.appendCommandBatch(campaignId, {
        commandId: 'door-append',
        events: [fundsEvent(campaignId, 3)],
        expectedPostStateDigest: 'd'.repeat(64),
        branchId: candidate.branchId,
      }),
    ).rejects.toThrow(CampaignStaleBranchError);
    const receipts = await replayCampaignReplacement(journal, db, {
      campaignId,
      candidateBranchId: candidate.branchId,
      events: [{ commandId: 'via-module', event: fundsEvent(campaignId, 3) }],
    });
    expect(receipts[0].receipt.branchId).toBe(candidate.branchId);
  });

  it('R5: materializeBranchPath accepts the replayed candidate', async () => {
    const campaignId = 'campaign-r5';
    const { candidate } = await replayDropped(campaignId);
    const events = await materializeBranchPath(
      campaignBranchSegmentReader(journal),
      resolveBranchPath(
        new SQLiteEventHistoryBranchStore(db),
        { streamType: 'campaign', streamId: campaignId },
        candidate.branchId,
        5,
      ),
    );
    expect(events.map((row) => [row.branchId, row.streamRevision])).toEqual([
      ['root', 1],
      ['root', 2],
      [candidate.branchId, 3],
      [candidate.branchId, 4],
      [candidate.branchId, 5],
    ]);
  });

  it('R6: the reader reads the candidate, not root', async () => {
    const campaignId = 'campaign-r6';
    const { candidate } = await replayDropped(campaignId);
    const suffix = await campaignBranchSegmentReader(journal).read(
      { streamType: 'campaign', streamId: campaignId },
      suffixOf(candidate),
    );
    expect(suffix.map((row) => row.branchId)).toEqual([
      candidate.branchId,
      candidate.branchId,
      candidate.branchId,
    ]);
    expect(envelopeOf(suffix[2]).sequence).toBe(6);
    expect(suffix[2].streamRevision).toBe(5);
  });

  it("R7: one receipt per command, and the receipt is the candidate's", async () => {
    const campaignId = 'campaign-r7';
    const { candidate, receipts } = await replayDropped(campaignId);
    expect(receipts.map((row) => row.sourceCommandId)).toEqual(['C4', 'C5']);
    const scopedC4 = candidateScopedCommandId(candidate.branchId, 'C4');
    const scopedC5 = candidateScopedCommandId(candidate.branchId, 'C5');
    expect(scopedC4).toBe(`${candidate.branchId}--C4`);
    expect(scopedC5).toBe(`${candidate.branchId}--C5`);
    expect(receipts[0].receipt.commandId).toBe(scopedC4);
    expect(receipts[0].receipt.eventCount).toBe(2);
    expect(receipts[0].receipt.firstStreamRevision).toBe(3);
    expect(receipts[0].receipt.lastStreamRevision).toBe(4);
    expect(receipts[1].receipt.commandId).toBe(scopedC5);
    expect(receipts[1].receipt.eventCount).toBe(1);
    const ids = (branchId: string, commandId: string): string[] =>
      (
        db
          .prepare(
            `SELECT event_id AS id FROM event_journal_events
              WHERE branch_id = ? AND command_id = ? ORDER BY command_index`,
          )
          .all(branchId, commandId) as { id: string }[]
      ).map((row) => row.id);
    expect(ids(candidate.branchId, scopedC4)).toEqual([
      `${scopedC4}:0`,
      `${scopedC4}:1`,
    ]);
    expect(ids(candidate.branchId, scopedC5)).toEqual([`${scopedC5}:0`]);
  });

  it("expectedRevision override: a wrong revision is the store's typed sequence-conflict", async () => {
    const campaignId = 'campaign-override';
    await seedPair(campaignId);
    const candidate = mintAt(campaignId, 2);
    // Sequence 2 equals the candidate head. Ignore the override and 99 commits.
    const result = await appendCampaignCommandBatch(journal, {
      campaignId,
      commandId: 'wrong-rev',
      events: [fundsEvent(campaignId, 2)],
      expectedPostStateDigest: null,
      branchId: candidate.branchId,
      expectedRevision: 99,
    });
    expect(result).toEqual({
      kind: 'sequence-conflict',
      expectedNextSequence: 99,
      actualNextSequence: 2,
    });
  });
});
