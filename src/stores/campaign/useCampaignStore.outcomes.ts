import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import {
  applyPostBattle,
  type ICampaignWithBattleState,
} from '@/lib/campaign/processors/postBattleProcessor';

import type { CampaignStore } from './useCampaignStore.types';

import {
  emitPendingOutcomeAddedEvent,
  persistCampaignRecord,
} from './useCampaignStore.persistence';

type GetCampaignStore = () => CampaignStore;
type SetCampaignStore = (partial: Partial<CampaignStore>) => void;

/**
 * Per `add-campaign-combat-loop` D7: an outcome is "campaign-linked"
 * when its originating session carried campaign linkage — i.e. the
 * `ICombatOutcome` records a `contractId` and/or `scenarioId`. A
 * standalone skirmish leaves both null and is ignored by the automatic
 * enqueue trigger.
 */
export function isCampaignLinkedOutcome(outcome: ICombatOutcome): boolean {
  const hasContract =
    typeof outcome.contractId === 'string' &&
    outcome.contractId.trim().length > 0;
  const hasScenario =
    typeof outcome.scenarioId === 'string' &&
    outcome.scenarioId.trim().length > 0;
  return hasContract || hasScenario;
}

export function enqueueCampaignOutcome(
  get: GetCampaignStore,
  set: SetCampaignStore,
  outcome: ICombatOutcome,
): void {
  const {
    campaign,
    pendingBattleOutcomes,
    processedBattleIds,
    reviewedBattleIds,
  } = get();
  if (pendingBattleOutcomes.some((o) => o.matchId === outcome.matchId)) return;
  if (processedBattleIds.includes(outcome.matchId)) return;
  const nextPending = [...pendingBattleOutcomes, outcome];
  set({ pendingBattleOutcomes: nextPending });
  if (campaign) {
    persistCampaignRecord(
      campaign,
      nextPending,
      processedBattleIds,
      reviewedBattleIds,
    );
  }
  emitPendingOutcomeAddedEvent(campaign, outcome, nextPending.length);
}

export function dequeueCampaignOutcome(
  get: GetCampaignStore,
  set: SetCampaignStore,
  matchId: string,
): boolean {
  const {
    campaign,
    pendingBattleOutcomes,
    processedBattleIds,
    reviewedBattleIds,
  } = get();
  const next = pendingBattleOutcomes.filter((o) => o.matchId !== matchId);
  if (next.length === pendingBattleOutcomes.length) return false;
  set({ pendingBattleOutcomes: next });
  if (campaign) {
    persistCampaignRecord(
      campaign,
      next,
      processedBattleIds,
      reviewedBattleIds,
    );
  }
  return true;
}

export function markCampaignBattleReviewed(
  get: GetCampaignStore,
  set: SetCampaignStore,
  matchId: string,
): void {
  if (!matchId) return;
  const { campaign, pendingBattleOutcomes, processedBattleIds } = get();
  const reviewedBattleIds = {
    ...get().reviewedBattleIds,
    [matchId]: Date.now(),
  };
  const nextPending = pendingBattleOutcomes.filter(
    (o) => o.matchId !== matchId,
  );
  set({ reviewedBattleIds, pendingBattleOutcomes: nextPending });
  if (campaign) {
    persistCampaignRecord(
      campaign,
      nextPending,
      processedBattleIds,
      reviewedBattleIds,
    );
  }
}

export function retryCampaignOutcomeApplication(
  get: GetCampaignStore,
  set: SetCampaignStore,
  matchId: string,
): boolean {
  if (!matchId) return false;
  const { campaign, pendingBattleOutcomes, outcomeApplyErrors } = get();
  if (!campaign) return false;
  const outcome = pendingBattleOutcomes.find((o) => o.matchId === matchId);
  if (!outcome) return false;

  try {
    const result = applyPostBattle(
      outcome,
      campaign as ICampaignWithBattleState,
    );
    const remaining = pendingBattleOutcomes.filter(
      (o) => o.matchId !== matchId,
    );
    const nextErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(outcomeApplyErrors)) {
      if (key !== matchId) nextErrors[key] = value;
    }
    set({
      campaign: result.campaign,
      pendingBattleOutcomes: remaining,
      processedBattleIds: [...get().processedBattleIds, matchId],
      outcomeApplyErrors: nextErrors,
    });
    get().saveCampaign();
    return true;
  } catch (err) {
    set({
      outcomeApplyErrors: {
        ...outcomeApplyErrors,
        [matchId]: err instanceof Error ? err.message : String(err),
      },
    });
    return false;
  }
}
