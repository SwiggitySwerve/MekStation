/**
 * Runs the legacy session-keyed combat-state migration (T1) on the live
 * campaign after a load has restored its roster.
 *
 * Order is what keeps it lossless: the quarantine records are written to
 * their store (outside the campaign payload) first; only when that write
 * succeeds is the migrated campaign adopted. A failed write leaves every
 * entry where it was, to be retried on the next load.
 */

import type { ILegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';

import { campaignDaysBetween } from '@/lib/campaign/campaignCalendar';
import { migrateSessionKeyedCombatStates } from '@/lib/campaign/migrateSessionKeyedCombatStates';
import { unappliedDeltaRecordsFor } from '@/lib/campaign/quarantineUnappliedDeltas';
import { createIndexedDbLegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';
import { logger } from '@/utils/logger';

import { getCampaignStoreForRoster } from './campaignStoreAccessor';
import { useCampaignRosterStore } from './useCampaignRosterStore';
import { useCampaignStore } from './useCampaignStore';

export async function ensureCampaignCombatStateMigration(
  quarantine?: ILegacyCombatStateQuarantineStore,
): Promise<void> {
  try {
    await migrateLiveCampaign(
      quarantine ?? createIndexedDbLegacyCombatStateQuarantineStore(),
    );
  } catch (error) {
    // Never fails the load that called it; nothing was adopted.
    logger.error(
      '[campaignCombatStateMigration] Legacy combat-state migration failed; entries left in place.',
      error,
    );
  }
}

async function migrateLiveCampaign(
  quarantine: ILegacyCombatStateQuarantineStore,
): Promise<void> {
  // The live campaign through the same seam the persistence store installs
  // it with.
  const store = getCampaignStoreForRoster();
  const campaign = store?.getState().campaign;
  if (!store || !campaign) return;
  // A co-op guest holds a replica; its host migrates and the result syncs.
  if (campaign.coopSession?.mode === 'guest') return;
  const roster = useCampaignRosterStore.getState();
  // Mapping needs this campaign's roster; without it nothing is decided.
  if (roster.campaignId !== campaign.id) return;

  // R3: deltas the apply flagged and quarantined fire-and-forget are
  // re-quarantined from the retained outcomes on every load (deduplicated),
  // so a failed write at apply time is repaired here.
  const unapplied = unappliedDeltaRecordsFor(campaign);
  if (unapplied.length > 0) await quarantine.put(campaign.id, unapplied);

  const migratedAt = new Date().toISOString();
  const migration = migrateSessionKeyedCombatStates({
    campaign,
    rosterUnits: roster.units,
    migratedAt,
  });
  if (!migration) return;

  try {
    await quarantine.put(campaign.id, migration.quarantine);
  } catch (error) {
    logger.error(
      '[campaignCombatStateMigration] Could not store the legacy combat-state quarantine; the entries stay in place until the next load.',
      error,
    );
    return;
  }
  if (store.getState().campaign !== campaign) {
    logger.warn(
      '[campaignCombatStateMigration] The campaign changed while the quarantine was written; the migration runs again on the next load.',
    );
    return;
  }

  store.getState().updateCampaign({
    unitCombatStates: migration.campaign.unitCombatStates,
    recentlyAppliedOutcomes: migration.campaign.recentlyAppliedOutcomes,
    legacyCombatStateFlags: migration.campaign.legacyCombatStateFlags,
  });

  const removed = migration.prunedOpponentKeys.length;
  if (removed > 0) {
    // One id per campaign: a repeated run replaces, never duplicates, it.
    // `useCampaignStore` is Zustand's lazy store accessor, not a React hook.
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    useCampaignStore()
      .getState()
      .appendActivityLogEntry({
        id: `act-technical-legacy-combat-state-cleanup-${campaign.id}`,
        timestamp: migratedAt,
        campaignDay: campaignDaysBetween(
          campaign.campaignStartDate ?? campaign.currentDate,
          campaign.currentDate,
        ),
        message: `Removed ${removed} enemy-unit combat state${removed === 1 ? '' : 's'} written by an earlier bug`,
        category: 'technical',
        payload: {
          event: 'legacy-combat-state-cleanup',
          unitId: '',
          unitName: '',
        },
      });
  }
}
