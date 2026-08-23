/**
 * Replica journal chain integrity (task 2.3 / design D1).
 *
 * Tamper and reorder of replica rows must be detected via the journal's
 * own digest recomputation (hydrateEvent) and predecessor linkage
 * (verifyChain / verified journal open).
 */

import type Database from 'better-sqlite3';

import { canonicalizeEventDigestV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  openVerifiedSQLiteEventJournal,
  SQLiteEventJournalRecoveryError,
} from '@/lib/events/journal/SQLiteEventJournalRecovery';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import { CAMPAIGN_REPLICA_STREAM_TYPE } from '../campaignReplicaTypes';
import { campaignReplicaStreamId } from '../campaignReplicaTypes';
import {
  CAMPAIGN_ID,
  EPOCH_A,
  GRANT_ID,
  REPLICA_NOW,
  closeCampaignReplicaHarness,
  openCampaignReplicaHarness,
  replicaFundsPage,
} from './replicaTestHarness';

const FAKE_DIGEST = 'c'.repeat(64);

/**
 * Drops an immutability trigger, runs a mutation, then restores it.
 */
function mutateImmutable(
  db: Database.Database,
  triggerName: 'event_journal_events_no_update',
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

describe('SQLiteCampaignReplicaStore chain integrity', () => {
  it('accepts an intact replica stream', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: replicaFundsPage(CAMPAIGN_ID, 1, 3),
      });
      const verified = await harness.store.verifyChain(CAMPAIGN_ID, GRANT_ID);
      expect(verified).toEqual({ kind: 'valid', eventCount: 3 });
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('detects a tampered replica payload through journal digest verification', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: replicaFundsPage(CAMPAIGN_ID, 1, 2),
      });
      const db = getSQLiteService().getDatabase();
      mutateImmutable(db, 'event_journal_events_no_update', function () {
        db.prepare(
          `UPDATE event_journal_events
           SET payload_json = replace(payload_json, 'FUNDS-1', 'TAMPERED')
           WHERE stream_type = 'campaign-replica'`,
        ).run();
      });
      await expect(
        harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID),
      ).rejects.toThrow(/digest is invalid/);
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('detects a rewritten predecessor as a chain break', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: replicaFundsPage(CAMPAIGN_ID, 1, 2),
      });
      const db = getSQLiteService().getDatabase();
      const streamId = campaignReplicaStreamId(CAMPAIGN_ID, GRANT_ID);
      const reader = new SQLiteEventJournal(db, function () {
        return REPLICA_NOW;
      });
      const page = await reader.readStream({
        streamType: CAMPAIGN_REPLICA_STREAM_TYPE,
        streamId,
        branchId: ROOT_EVENT_BRANCH_ID,
        afterRevision: 0,
        limit: 10,
      });
      const head = page[1];
      if (head === undefined) throw new Error('expected two replica events');
      const broken = {
        ...head,
        previousStreamEventDigest: FAKE_DIGEST,
      };
      const newDigest = canonicalizeEventDigestV1(broken).digest;
      mutateImmutable(db, 'event_journal_events_no_update', function () {
        db.prepare(
          `UPDATE event_journal_events
           SET previous_stream_event_digest = ?, event_digest = ?
           WHERE event_id = ?`,
        ).run(FAKE_DIGEST, newDigest, head.eventId);
      });
      db.prepare(
        `UPDATE event_journal_stream_heads SET event_digest = ?
         WHERE stream_type = ? AND stream_id = ?`,
      ).run(newDigest, CAMPAIGN_REPLICA_STREAM_TYPE, streamId);

      const chain = await harness.store.verifyChain(CAMPAIGN_ID, GRANT_ID);
      expect(chain.kind).toBe('invalid');
      if (chain.kind !== 'invalid') return;
      expect(chain.reason).toBe('chain-break');
      expect(chain.eventId).toBe(head.eventId);

      await expect(openVerifiedSQLiteEventJournal(db)).rejects.toBeInstanceOf(
        SQLiteEventJournalRecoveryError,
      );
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });

  it('detects a reordered replica revision as a digest mismatch', async () => {
    const harness = await openCampaignReplicaHarness();
    try {
      await harness.store.ingest(CAMPAIGN_ID, GRANT_ID, {
        deliveryEpochId: EPOCH_A,
        items: replicaFundsPage(CAMPAIGN_ID, 1, 2),
      });
      const db = getSQLiteService().getDatabase();
      const streamId = campaignReplicaStreamId(CAMPAIGN_ID, GRANT_ID);
      mutateImmutable(db, 'event_journal_events_no_update', function () {
        db.prepare(
          `UPDATE event_journal_events
           SET stream_revision = 3
           WHERE stream_type = ? AND stream_id = ? AND stream_revision = 2`,
        ).run(CAMPAIGN_REPLICA_STREAM_TYPE, streamId);
      });
      await expect(
        harness.store.verifyChain(CAMPAIGN_ID, GRANT_ID),
      ).rejects.toThrow(/digest is invalid/);
    } finally {
      await closeCampaignReplicaHarness(harness);
    }
  });
});
