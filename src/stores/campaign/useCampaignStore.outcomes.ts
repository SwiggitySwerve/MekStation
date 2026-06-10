import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { reconcileCoopOutcomeForCampaign } from '@/lib/campaign/coop/coopHostRegistry';
import {
  applyPostBattle,
  type ICampaignWithBattleState,
} from '@/lib/campaign/processors/postBattleProcessor';

import type { CampaignStore } from './useCampaignStore.types';

import { useCampaignRosterStore } from './useCampaignRosterStore';
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
  // D-4 remediation (2026-06-09 audit): a co-op HOST campaign reconciles
  // the battle's campaign-facing consequences (salvage, roster changes)
  // into the shared CO1 event log the moment the outcome lands — this is
  // the production caller `reconcileCoopBattle` shipped without. Runs
  // AFTER the dedup guards above so a re-published matchId can never
  // double-reconcile. Fire-and-forget: the gate never throws, and it
  // resolves null for single-player campaigns, guest mirrors, or when no
  // live CampaignMatchHost is registered for this campaign.
  void reconcileCoopOutcomeForCampaign(
    campaign,
    outcome,
    buildRosterDesignations(),
  );
}

/**
 * Unit id -> display name lookup for the reconciliation's
 * `RosterUnitChanged` events. Read off the roster store (the campaign's
 * unit-name source of truth); `deriveCoopBattleConsequences` falls back
 * to the raw unit id for any unit missing here.
 */
function buildRosterDesignations(): Record<string, string> {
  const units = useCampaignRosterStore.getState().units;
  return Object.fromEntries(units.map((u) => [u.unitId, u.unitName]));
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
  // D-6 remediation (2026-06-09 audit): the review page's Apply runs
  // `applyPostBattle` (which stamps the matchId onto the CAMPAIGN-embedded
  // processedBattleIds ledger) and then calls this action. Pre-fix the
  // STORE-level ledger — the one advanceDay rebuilds the campaign from,
  // persistCampaignRecord writes, and the enqueue dedup guard reads —
  // never learned about the applied battle, so the next advanceDay erased
  // the dedup and a re-published outcome could double-apply. Union the
  // campaign-embedded ledger into the store ledger here so every
  // downstream reader agrees. For a reviewed-but-never-applied battle the
  // campaign ledger lacks the id and the union is a no-op.
  const campaignLedger =
    (campaign as ICampaignWithBattleState | null)?.processedBattleIds ?? [];
  const nextProcessed = Array.from(
    new Set([...processedBattleIds, ...campaignLedger]),
  );
  set({
    reviewedBattleIds,
    pendingBattleOutcomes: nextPending,
    processedBattleIds: nextProcessed,
  });
  if (campaign) {
    persistCampaignRecord(
      campaign,
      nextPending,
      nextProcessed,
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
