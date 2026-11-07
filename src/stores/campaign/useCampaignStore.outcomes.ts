import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { reconcileCoopOutcomeForCampaign } from '@/lib/campaign/coop/coopHostRegistry';
import { applyPostBattle } from '@/lib/campaign/processors/postBattleProcessor';

import type { CampaignStore } from './useCampaignStore.types';

import {
  isOutcomeApplied,
  mergeBattleOutcomeState,
} from './campaignBattleOutcomeState';
import { appendContractPaymentActivityEntries } from './contractPaymentActivity';
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
  if (isOutcomeApplied(get(), campaign, outcome.matchId)) return;
  const nextPending = [...pendingBattleOutcomes, outcome];
  set({
    pendingBattleOutcomes: nextPending,
    campaign: campaign
      ? { ...campaign, pendingBattleOutcomes: nextPending }
      : null,
  });
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
  const nextCampaign = campaign
    ? { ...campaign, pendingBattleOutcomes: next }
    : null;
  const nextErrors = { ...get().outcomeApplyErrors };
  delete nextErrors[matchId];
  set({
    pendingBattleOutcomes: next,
    campaign: nextCampaign,
    outcomeApplyErrors: nextErrors,
  });
  if (nextCampaign) {
    persistCampaignRecord(
      nextCampaign,
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
  const { campaign } = get();
  const ledgers = mergeBattleOutcomeState(campaign, get());
  const reviewedBattleIds = {
    ...ledgers.reviewedBattleIds,
    [matchId]: Date.now(),
  };
  const nextPending = ledgers.pendingBattleOutcomes.filter(
    (o) => o.matchId !== matchId,
  );
  // Reviewing is acknowledgement, not evidence that battle effects ran.
  const nextProcessed = ledgers.processedBattleIds;
  const nextLedgers = {
    pendingBattleOutcomes: nextPending,
    processedBattleIds: nextProcessed,
    reviewedBattleIds,
  };
  const nextErrors = { ...get().outcomeApplyErrors };
  delete nextErrors[matchId];
  const nextCampaign = campaign ? { ...campaign, ...nextLedgers } : null;
  set({
    ...nextLedgers,
    campaign: nextCampaign,
    outcomeApplyErrors: nextErrors,
  });
  if (nextCampaign) {
    persistCampaignRecord(
      nextCampaign,
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
  if (isOutcomeApplied(get(), campaign, matchId)) return false;
  const outcome = pendingBattleOutcomes.find((o) => o.matchId === matchId);
  if (!outcome) return false;

  try {
    const result = applyPostBattle(outcome, {
      ...campaign,
      ...mergeBattleOutcomeState(campaign, get()),
    });
    const remaining = pendingBattleOutcomes.filter(
      (o) => o.matchId !== matchId,
    );
    const nextErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(outcomeApplyErrors)) {
      if (key !== matchId) nextErrors[key] = value;
    }
    if (result.summary.errors.length > 0) {
      nextErrors[matchId] = result.summary.errors.join('; ');
    }
    set({
      campaign: result.campaign,
      pendingBattleOutcomes: remaining,
      processedBattleIds: mergeBattleOutcomeState(result.campaign, get())
        .processedBattleIds,
      outcomeApplyErrors: nextErrors,
    });
    appendContractPaymentActivityEntries(
      get().appendActivityLogEntry,
      result.campaign,
      result.events,
    );
    get().saveCampaign();
    return result.summary.errors.length === 0;
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
