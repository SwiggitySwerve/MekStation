/**
 * The campaign command pipeline refuses while the campaign's history is
 * being rebuilt (add-authoritative-history-branches task 2.2 adoption;
 * umbrella 14.3).
 *
 * Real all the way down: a migrated SQLite, a real `SQLiteEventJournal`
 * on the campaign's own stream, and a correction lease acquired through
 * the shipped store. The lease is never handed to the pipeline — it is
 * resolved from the same database the journal is on, which is the only
 * way to prove the SHIPPED route (which builds `{ journal, authority }`
 * and nothing else) is gated too.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import { CAMPAIGN_STREAM_TYPE } from '../../sync/JournalCampaignEventStore';
import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { executeCampaignCommand } from '../campaignCommandPipeline';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-rebuild';
const AUTHOR = 'pid-solo';
const TTL_MS = 30_000;
const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };

function spend(amount: number, intentId = 'intent-1'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

describe('campaign commands during a history rebuild', () => {
  let dir: string;
  let db: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-rebuild-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'campaign.db') });
    service.initialize();
    db = service.getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => NOW);
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
    // The baseline import gave the stream a head; a genesis branch is
    // what makes it a stream a correction can bind to.
    branches().backfillGenesisBranches();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  function streamRevision(campaignId: string): number {
    const row = db
      .prepare(
        `SELECT stream_revision AS revision FROM event_journal_stream_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(CAMPAIGN_STREAM_TYPE, campaignId) as
      | { readonly revision: number }
      | undefined;
    return row?.revision ?? 0;
  }

  function headDigest(campaignId: string): string {
    const row = db
      .prepare(
        `SELECT event_digest AS digest FROM event_journal_stream_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(CAMPAIGN_STREAM_TYPE, campaignId) as
      | { readonly digest: string }
      | undefined;
    if (row === undefined) throw new Error(`no head for ${campaignId}`);
    return row.digest;
  }

  /** Acquire the real correction lease a GM rewind holds. */
  function acquireLease(campaignId: string): void {
    new SQLiteEventHistoryCorrectionLeaseStore(
      db,
      branches(),
    ).acquireCorrectionLease({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: campaignId,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'authorized rewind to the prior contract',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: streamRevision(campaignId),
      expectedDigest: headDigest(campaignId),
      expectedGeneration: 1,
    });
  }

  function run(intent: ICampaignIntent, commandId = 'cmd-1') {
    return executeCampaignCommand(
      { journal, authority: JOURNAL_AUTHORITY },
      {
        campaignId: CAMPAIGN_ID,
        intent,
        authorPlayerId: AUTHOR,
        commandId,
        ts: NOW,
      },
    );
  }

  it('blocks a command with PROJECTION_REBUILDING and appends nothing', async () => {
    const before = streamRevision(CAMPAIGN_ID);
    acquireLease(CAMPAIGN_ID);

    const result = await run(spend(250_000), 'cmd-during');

    // `blocked`, not `rejected`: the campaign can perfectly well afford
    // this. A caller that could not tell the two apart would give up on
    // a command that will succeed the moment the rebuild lands.
    // The action rides WITH the refusal. Reporting only the code left
    // the client with a reason and no recovery, so its
    // `recoveryAction` was null on the one refusal that actually has an
    // answer - wait for the rebuild, then retry.
    expect(result).toEqual({
      kind: 'blocked',
      reason: 'PROJECTION_REBUILDING',
      recoveryAction: 'retry-after-rebuild',
    });
    // The refusal wrote nothing into the history the rebuild is about to
    // replace.
    expect(streamRevision(CAMPAIGN_ID)).toBe(before);
  });

  it('runs again once the rebuild has finished', async () => {
    acquireLease(CAMPAIGN_ID);
    expect((await run(spend(1), 'cmd-blocked')).kind).toBe('blocked');

    // Expiry releases the stream BY THE CLOCK, with no reaper having to
    // run: a GM who walked away mid-correction does not freeze the
    // campaign forever.
    const realNow = Date.now;
    const lapsed = realNow() + TTL_MS + 1_000;
    let result;
    try {
      (Date as unknown as { now: () => number }).now = () => lapsed;
      result = await run(spend(250_000), 'cmd-after');
    } finally {
      (Date as unknown as { now: () => number }).now = realNow;
    }

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.state.balance).toBe(750_000);
  });

  it('is not blocked by a rebuild on another campaign', async () => {
    // A second campaign, on its own stream, under its own correction.
    const other = 'campaign-elsewhere';
    const imported = await importCampaignBaseline(journal, {
      campaignId: other,
      state: { ...createEmptyCampaignState(other), balance: 10 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
    branches().backfillGenesisBranches();
    acquireLease(other);

    const result = await run(spend(250_000), 'cmd-other');

    expect(result.kind).toBe('committed');
  });
});
