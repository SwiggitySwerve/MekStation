/**
 * Shared SQLite harness for campaign replica store tests.
 * Not a test file; loaded by the suites under this folder.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import { CAMPAIGN_REPLICA_STREAM_TYPE } from '../campaignReplicaTypes';
import { SQLiteCampaignReplicaStore } from '../SQLiteCampaignReplicaStore';

export const REPLICA_NOW = '2026-08-22T18:00:00.000Z';
export const REPLICA_EVENT_TS = '2026-08-22T16:30:00.000Z';
export const EPOCH_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const EPOCH_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
export const CAMPAIGN_ID = 'campaign-replica-alpha';
export const GRANT_ID = 'grant-replica-one';
export const GRANT_ID_B = 'grant-replica-two';

export class InjectedReplicaClock {
  public iso: string = REPLICA_NOW;

  /** Returns the injected ISO timestamp; never reads the system clock. */
  public now(): string {
    return this.iso;
  }
}

export interface ICampaignReplicaHarness {
  readonly dir: string;
  readonly dbPath: string;
  readonly clock: InjectedReplicaClock;
  store: SQLiteCampaignReplicaStore;
}

/**
 * Opens one file-backed SQLite database with journal migrations and a
 * replica store bound to the borrowed handle.
 */
export async function openCampaignReplicaHarness(): Promise<ICampaignReplicaHarness> {
  const dir = await mkdtemp(path.join(tmpdir(), 'campaign-replica-'));
  const dbPath = path.join(dir, 'campaign-replica.db');
  resetSQLiteService();
  getSQLiteService({ path: dbPath }).initialize();
  const clock = new InjectedReplicaClock();
  const store = new SQLiteCampaignReplicaStore(
    getSQLiteService().getDatabase(),
    function () {
      return clock.now();
    },
  );
  return { dir, dbPath, clock, store };
}

/**
 * Closes the process-global SQLite handle and reopens the same file so
 * restart survival can be proven on a fresh store instance.
 */
export async function restartCampaignReplicaHarness(
  harness: ICampaignReplicaHarness,
): Promise<void> {
  resetSQLiteService();
  getSQLiteService({ path: harness.dbPath }).initialize();
  harness.store = new SQLiteCampaignReplicaStore(
    getSQLiteService().getDatabase(),
    function () {
      return harness.clock.now();
    },
  );
}

/** Closes the process-global SQLite handle and deletes the temp dir. */
export async function closeCampaignReplicaHarness(
  harness: ICampaignReplicaHarness,
): Promise<void> {
  resetSQLiteService();
  await rm(harness.dir, { recursive: true, force: true, maxRetries: 3 });
}

/**
 * Builds a FundsChanged delivery item with a unique reason marker.
 */
export function replicaFundsItem(
  campaignId: string,
  sequence: number,
  reason: string,
  balance: number = sequence,
): ICampaignGrantDeliveryItem {
  return {
    deliverySequence: sequence,
    event: {
      type: 'FundsChanged',
      campaignId,
      ts: REPLICA_EVENT_TS,
      authorPlayerId: 'pid-host',
      scope: 'campaign',
      payload: { delta: 0, reason, balance },
    },
  };
}

/**
 * Contiguous FundsChanged items from startSequence through count items.
 */
export function replicaFundsPage(
  campaignId: string,
  startSequence: number,
  count: number,
): readonly ICampaignGrantDeliveryItem[] {
  const items: ICampaignGrantDeliveryItem[] = [];
  for (let index = 0; index < count; index += 1) {
    const sequence = startSequence + index;
    items.push(
      replicaFundsItem(campaignId, sequence, `FUNDS-${sequence}`, sequence),
    );
  }
  return items;
}

/** Counts journal rows for one stream type, optionally one stream id. */
export function countJournalStream(
  streamType: string,
  streamId?: string,
): number {
  const db = getSQLiteService().getDatabase();
  if (streamId === undefined) {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM event_journal_events WHERE stream_type = ?`,
      )
      .get(streamType) as { c: number };
    return row.c;
  }
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM event_journal_events
       WHERE stream_type = ? AND stream_id = ?`,
    )
    .get(streamType, streamId) as { c: number };
  return row.c;
}

/** Counts durable replica rows for the default stream id helper. */
export function countReplicaRows(streamId: string): number {
  return countJournalStream(CAMPAIGN_REPLICA_STREAM_TYPE, streamId);
}
