/**
 * Records a battle's launch manifest (T1) on the live campaign, keyed by
 * match id, when the session is created. It persists with the campaign so
 * an interactive battle finished days later, or after a restart, still
 * maps its player units to roster units when the outcome is applied.
 */

import type { BattleUnitManifest } from '@/types/campaign/BattleUnitManifest';

import {
  completeLaunchManifest,
  prunePendingBattleUnitManifests,
  type ILaunchPlayerUnit,
} from '@/lib/campaign/battleUnitManifest';
import { logger } from '@/utils/logger';

import { useCampaignRosterStore } from './useCampaignRosterStore';
import { useCampaignStore } from './useCampaignStore';

/**
 * Records the launch manifest for `matchId`, stamped with the campaign
 * date. Player units with no roster link are resolved now against the
 * current force and roster (`completeLaunchManifest`); the manifest is
 * marked complete or incomplete. Also prunes manifests that aged out
 * without their battle producing an outcome. Returns false (and logs) when
 * the live campaign is not `campaignId`: the outcome then has no recorded
 * manifest and the apply takes the legacy path.
 */
export function recordCampaignBattleUnitManifest({
  campaignId,
  matchId,
  units,
  playerUnits,
  scenarioId,
}: {
  readonly campaignId: string | null | undefined;
  readonly matchId: string;
  /** The session builder's manifest (roster-linked units only). */
  readonly units: BattleUnitManifest;
  /** Every player session unit of the battle. */
  readonly playerUnits: readonly ILaunchPlayerUnit[];
  readonly scenarioId: string | null;
}): boolean {
  // `useCampaignStore` is Zustand's lazy store accessor, not a React hook.
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  const store = useCampaignStore();
  const state = store.getState();
  const campaign = state.campaign;
  if (!campaign || !campaignId || campaign.id !== campaignId) {
    logger.error(
      '[campaignBattleUnitManifests] No live campaign to record the launch manifest on.',
      {
        campaignId: campaignId ?? null,
        liveCampaignId: campaign?.id ?? null,
        matchId,
      },
    );
    return false;
  }
  const pendingMatchIds = new Set(
    [
      ...(campaign.pendingBattleOutcomes ?? []),
      ...state.pendingBattleOutcomes,
    ].map((outcome) => outcome.matchId),
  );
  const kept = prunePendingBattleUnitManifests(
    campaign.battleUnitManifests ?? {},
    {
      pendingMatchIds,
      asOf: campaign.currentDate,
    },
  );
  state.updateCampaign({
    battleUnitManifests: {
      ...kept,
      [matchId]: {
        ...completeLaunchManifest(
          campaign,
          useCampaignRosterStore.getState().units,
          { units, playerUnits, scenarioId },
        ),
        recordedOn: campaign.currentDate.toISOString(),
      },
    },
  });
  return true;
}
