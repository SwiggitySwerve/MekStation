/**
 * Chain integrity of the AUTHORITATIVE campaign stream (task 4.1).
 *
 * Task 2.3 proved the replica stream detects tamper and reorder. That is
 * the derived copy. This proves the same for the source stream, which is
 * the one everything else is derived FROM: every scoped projection,
 * every snapshot, and every replica ultimately restates whatever this
 * stream says. If it could be edited silently, nothing downstream could
 * be trusted no matter how carefully the downstream verifies itself.
 *
 * The immutability triggers are dropped for the mutation and restored
 * immediately, because a tamper that SQLite itself refuses proves only
 * that the trigger works - the point here is that even a mutation which
 * gets past storage is still caught by the hash chain on read.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import type Database from 'better-sqlite3';

import {
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  fundsEvent,
  openCampaignDeliveryHarness,
  type ICampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

const CAMPAIGN_ID = 'campaign-chain-integrity';
const ROOT = 'root';

/** Runs `mutation` with one immutability trigger temporarily dropped. */
function mutateImmutable(
  db: Database.Database,
  triggerName: string,
  mutation: () => void,
): void {
  const row = db
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = ?`,
    )
    .get(triggerName) as { readonly sql?: unknown } | undefined;
  if (typeof row?.sql !== 'string') throw new Error('Trigger SQL is missing');
  db.exec(`DROP TRIGGER ${triggerName}`);
  try {
    mutation();
  } finally {
    db.exec(row.sql);
  }
}

/** Reads the campaign stream, which verifies the chain as it goes. */
async function readCampaignStream(
  harness: ICampaignDeliveryHarness,
): Promise<unknown> {
  return harness.journal.readStream({
    streamType: 'campaign',
    streamId: CAMPAIGN_ID,
    branchId: ROOT,
    afterRevision: 0,
    limit: 100,
  });
}

describe('authoritative campaign stream chain integrity', () => {
  let harness: ICampaignDeliveryHarness;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
    for (let i = 0; i < 3; i += 1) {
      await appendCampaignEvent(
        harness,
        fundsEvent(CAMPAIGN_ID, i, 'campaign', `FUNDS-${i}`),
      );
    }
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  it('reads a clean stream, so a later rejection means tamper and not a broken fixture', async () => {
    const events = (await readCampaignStream(harness)) as readonly unknown[];
    expect(events).toHaveLength(3);
  });

  it('detects a tampered payload on the campaign stream', async () => {
    const db = getSQLiteService().getDatabase();
    mutateImmutable(db, 'event_journal_events_no_update', () => {
      db.prepare(
        `UPDATE event_journal_events
         SET payload_json = replace(payload_json, 'FUNDS-1', 'TAMPERED')
         WHERE stream_type = 'campaign'`,
      ).run();
    });

    // The edit changed the bytes but not the stored digest, so the chain
    // no longer agrees with its own content.
    await expect(readCampaignStream(harness)).rejects.toThrow(/digest/i);
  });

  it('detects a reordered campaign stream as a chain break', async () => {
    const db = getSQLiteService().getDatabase();
    mutateImmutable(db, 'event_journal_events_no_update', () => {
      // Swap two revisions. Each row stays individually intact - only
      // their ORDER changes - so detection has to come from the
      // previous-digest links rather than from a per-row digest.
      //
      // The swap goes via a temporary revision because the schema's
      // UNIQUE (stream_type, stream_id, branch_id, stream_revision)
      // rejects a single-statement swap row-by-row. That constraint is
      // itself a real defence: a naive reorder cannot even be written.
      const park = 9_000;
      db.prepare(
        `UPDATE event_journal_events SET stream_revision = ?
         WHERE stream_type = 'campaign' AND stream_revision = 2`,
      ).run(park);
      db.prepare(
        `UPDATE event_journal_events SET stream_revision = 2
         WHERE stream_type = 'campaign' AND stream_revision = 3`,
      ).run();
      db.prepare(
        `UPDATE event_journal_events SET stream_revision = 3
         WHERE stream_type = 'campaign' AND stream_revision = ?`,
      ).run(park);
    });

    await expect(readCampaignStream(harness)).rejects.toThrow();
  });
});
