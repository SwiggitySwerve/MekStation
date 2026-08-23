/**
 * SQLite wiring for the grant campaign channel (task 3.3).
 *
 * Builds projection deps from the process SQLite handle. Clocks are
 * injected by the caller; this module never reads the system clock.
 */

import type { CampaignGrantClock } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';

import { CampaignGrantMembershipSource } from '@/lib/campaign/delivery/CampaignGrantMembershipSource';
import { SQLiteCampaignGrantStore } from '@/lib/campaign/grants/SQLiteCampaignGrantStore';
import { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { AuthorizedViewerResolver } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { SQLiteDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { ICampaignGrantChannelDeps } from './handleCampaignGrantJoin';

export interface ICreateCampaignGrantChannelDepsArgs {
  readonly clock: CampaignGrantClock;
  readonly nowMs: () => number;
  readonly nowIso: () => string;
}

/**
 * Opens grant, membership, journal, and delivery-epoch adapters on the
 * borrowed process database. Throws when SQLite is not initialized so
 * the join handler can map that to an infrastructure close.
 */
export function createCampaignGrantChannelDepsFromSqlite(
  args: ICreateCampaignGrantChannelDepsArgs,
): ICampaignGrantChannelDeps {
  const db = getSQLiteService().getDatabase();
  const grantStore = new SQLiteCampaignGrantStore(db);
  const membership = new CampaignGrantMembershipSource(grantStore, args.clock);
  const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
    db,
    args.clock,
  );
  const deliveryStore = new SQLiteDeliveryEpochStore(db, args.clock);
  return {
    nowMs: args.nowMs,
    nowIso: args.nowIso,
    projectDeps: {
      grantStore,
      viewerResolver: new AuthorizedViewerResolver(membership),
      journal,
      deliveryStore,
      clock: args.clock,
    },
  };
}

/**
 * Binds the consuming-device replica store to the same process database
 * the grant channel uses. Throws when SQLite is not initialized.
 */
export function createCampaignReplicaStoreFromSqlite(
  clock: CampaignGrantClock,
): SQLiteCampaignReplicaStore {
  return new SQLiteCampaignReplicaStore(
    getSQLiteService().getDatabase(),
    clock,
  );
}
