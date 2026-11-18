/**
 * Records a battle's launch manifest (T1) on the live campaign, keyed by
 * match id, when the session is created. It persists with the campaign so
 * an interactive battle finished days later, or after a restart, still
 * maps its player units to roster units when the outcome is applied.
 */

import type { BattleUnitManifest } from '@/types/campaign/BattleUnitManifest';

import { logger } from '@/utils/logger';

import { useCampaignStore } from './useCampaignStore';

/**
 * Returns false (and logs) when the live campaign is not `campaignId`: the
 * outcome then has no manifest and its application fails loud instead of
 * writing damage under the wrong key.
 */
export function recordCampaignBattleUnitManifest(
  campaignId: string | null | undefined,
  matchId: string,
  manifest: BattleUnitManifest,
): boolean {
  // `useCampaignStore` is Zustand's lazy store accessor, not a React hook.
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  const store = useCampaignStore();
  const campaign = store.getState().campaign;
  if (!campaign || !campaignId || campaign.id !== campaignId) {
    logger.error(
      '[campaignBattleUnitManifests] No live campaign to record the launch manifest on; the battle outcome will not apply until it can be mapped.',
      {
        campaignId: campaignId ?? null,
        liveCampaignId: campaign?.id ?? null,
        matchId,
      },
    );
    return false;
  }
  store.getState().updateCampaign({
    battleUnitManifests: {
      ...campaign.battleUnitManifests,
      [matchId]: manifest,
    },
  });
  return true;
}
