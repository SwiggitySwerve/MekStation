import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IUnitPrestige } from '@/types/campaign/Prestige';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { logger } from '@/utils/logger';

import type { IDayProcessor, IDayProcessorResult } from '../dayPipeline';

import { publishContractFulfilled } from '../contractFulfillmentBus';
import { getDayPipeline } from '../dayPipeline';
import { DayPhase, type IDayEvent } from '../dayPipeline';
import { applyOutcomePrestige } from '../prestige/applyOutcomePrestige';
import { applyContractClosure } from './contractClosure';
import {
  applyContractDelta,
  applyPilotDelta,
  applyUnitDelta,
  playerWon,
} from './postBattleProcessor.helpers';
export interface IPostBattleCampaignExtensions {
  readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
  readonly processedBattleIds?: readonly string[];
  readonly pendingFulfilledContractIds?: readonly string[];
  readonly processedFulfilledContractIds?: readonly string[];
}
export type ICampaignWithBattleState = ICampaign &
  IPostBattleCampaignExtensions;
export interface IPostBattleApplied {
  readonly matchId: string;
  readonly pilotsUpdated: readonly string[];
  readonly unitsUpdated: readonly string[];
  readonly contractUpdated: string | null;
  readonly skippedDuplicate: boolean;
  readonly errors: readonly string[];
}

interface IOutcomeDeltaApplicationContext {
  readonly campaign: ICampaignWithBattleState;
  readonly outcome: ICombatOutcome;
  readonly wonByPlayer: boolean;
  readonly unitStates: Record<string, IUnitCombatState>;
  readonly nowIso: string;
}

interface IOutcomeDeltaApplicationResult {
  readonly pilotPatches: Map<string, Partial<ICampaignRosterEntry>>;
  readonly pilotsUpdated: string[];
  readonly unitsUpdated: string[];
  readonly errors: string[];
}

function applyOutcomeDeltas({
  campaign,
  outcome,
  wonByPlayer,
  unitStates,
  nowIso,
}: IOutcomeDeltaApplicationContext): IOutcomeDeltaApplicationResult {
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const vault = usePilotStore.getState().pilots;
  const pilotsByPilotId = buildPilotLookup(vault);
  const entriesByPilotId = new Map(rosterEntries.map((e) => [e.pilotId, e]));
  // D-8 remediation (2026-06-09 audit): kill attribution comes from the
  // after-action report's per-unit rows so campaignKills can increment.
  const reportUnitsById = new Map(
    outcome.report.units.map((u) => [u.unitId, u]),
  );
  const pilotPatches = new Map<string, Partial<ICampaignRosterEntry>>();
  const pilotsUpdated: string[] = [];
  const unitsUpdated: string[] = [];
  const errors: string[] = [];

  for (const delta of outcome.unitDeltas) {
    // Design D9 (`add-campaign-fast-forward-api`, `campaign-combat-loop`
    // ADDED requirement "Engine-Derived Outcome Pilot Attribution"):
    // prefer the delta's pilot linkage (the session unit's vault
    // `pilotRef`) over the session-scoped `unitId` when resolving roster
    // entries and vault pilots — `unitId` is a composite
    // (`${side}-${slot}-${unitRef}`) and was never actually a pilot id;
    // it only "worked" when a fixture rigged `unitId === pilotId`.
    // Falling back to `unitId` when `pilotRef` is absent (persisted
    // outcomes, hand-built fixtures predating this field) keeps every
    // existing linkage-free outcome resolving byte-for-byte as before.
    // Kill attribution (`reportUnitsById`) stays keyed on `unitId` —
    // after-action report rows are session-scoped and already
    // consistent on that key.
    const resolvedPilotId = delta.pilotRef ?? delta.unitId;
    const entry = entriesByPilotId.get(resolvedPilotId) ?? null;
    const pilot = pilotsByPilotId.get(resolvedPilotId) ?? null;
    const pilotResult = applyPilotDelta({
      campaign,
      pilotId: resolvedPilotId,
      delta,
      outcomeWonByPlayer: wonByPlayer,
      entry,
      pilot,
      killCount: reportUnitsById.get(delta.unitId)?.kills ?? 0,
    });
    if (pilotResult) {
      pilotPatches.set(resolvedPilotId, pilotResult.patch);
      pilotsUpdated.push(resolvedPilotId);
    }
    try {
      const next = applyUnitDelta(
        unitStates[delta.unitId],
        delta,
        outcome.matchId,
        nowIso,
      );
      unitStates[delta.unitId] = next;
      unitsUpdated.push(delta.unitId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`unit ${delta.unitId}: ${message}`);
      logger.error(
        `[postBattleProcessor] Failed to apply unit delta for ${delta.unitId}:`,
        err,
      );
    }
  }

  return { pilotPatches, pilotsUpdated, unitsUpdated, errors };
}

function applyOutcome(
  campaign: ICampaignWithBattleState,
  outcome: ICombatOutcome,
): {
  campaign: ICampaignWithBattleState;
  summary: IPostBattleApplied;
  events: IDayEvent[];
} {
  const processed = campaign.processedBattleIds ?? [];
  if (processed.includes(outcome.matchId)) {
    return {
      campaign,
      summary: {
        matchId: outcome.matchId,
        pilotsUpdated: [],
        unitsUpdated: [],
        contractUpdated: null,
        skippedDuplicate: true,
        errors: [],
      },
      events: [],
    };
  }
  const missions = new Map(campaign.missions);
  const unitStates: Record<string, IUnitCombatState> = {
    ...(campaign.unitCombatStates ?? {}),
  };
  const wonByPlayer = playerWon(outcome);
  const nowIso = new Date().toISOString();
  const { pilotPatches, pilotsUpdated, unitsUpdated, errors } =
    applyOutcomeDeltas({
      campaign,
      outcome,
      wonByPlayer,
      unitStates,
      nowIso,
    });
  // D-5 remediation (2026-06-09 audit): pilot patches are NOT committed
  // here. Every step that can throw (contract delta, prestige) must run
  // first — the roster-store commit happens at the very end of this
  // function so a partial failure leaves zero side effects and the
  // outcome retained in the retry queue can be re-applied safely. The
  // matchId dedup against processedBattleIds (above) stays the
  // apply-once guard; this ordering makes it sound.
  const contractDelta = applyContractDelta(campaign, missions, outcome);
  const updatedContract = contractDelta?.contract ?? null;
  const remainingQueue = (campaign.pendingBattleOutcomes ?? []).filter(
    (o) => o.matchId !== outcome.matchId,
  );
  const recentlyApplied = [
    ...((
      campaign as ICampaignWithBattleState & {
        readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
      }
    ).recentlyAppliedOutcomes ?? []),
    outcome,
  ];
  const pendingFulfilled = campaign.pendingFulfilledContractIds ?? [];
  const processedFulfilled = campaign.processedFulfilledContractIds ?? [];
  const terminalContract = contractDelta?.flippedToTerminal
    ? contractDelta.contract
    : null;
  // Per `add-campaign-refit-and-prestige` design D7: the prestige-update
  // step runs when a battle outcome is applied, so per-unit prestige
  // tracks combat results deterministically. The post-battle processor's
  // matchId de-dup (above) guarantees this never double-applies.
  const updatedPrestige: readonly IUnitPrestige[] = applyOutcomePrestige(
    outcome,
    campaign.unitPrestige ?? [],
    nowIso,
  );
  const contractClosure = terminalContract
    ? applyContractClosure(campaign, terminalContract, nowIso)
    : null;
  const updatedCampaign: ICampaignWithBattleState & {
    readonly recentlyAppliedOutcomes: readonly ICombatOutcome[];
    readonly pendingFulfilledContractIds: readonly string[];
    readonly processedFulfilledContractIds: readonly string[];
  } = {
    ...campaign,
    missions,
    finances: contractClosure
      ? {
          ...campaign.finances,
          balance: contractClosure.balance,
          transactions: contractClosure.transactions,
        }
      : campaign.finances,
    pendingBattleOutcomes: remainingQueue,
    processedBattleIds: [...processed, outcome.matchId],
    unitCombatStates: unitStates,
    unitPrestige: updatedPrestige,
    recentlyAppliedOutcomes: recentlyApplied,
    pendingFulfilledContractIds: pendingFulfilled,
    processedFulfilledContractIds: terminalContract
      ? [...processedFulfilled, terminalContract.id]
      : processedFulfilled,
    updatedAt: nowIso,
  };
  const events: IDayEvent[] = [
    {
      type: 'post_battle_applied',
      description: `Battle ${outcome.matchId} resolved: ${pilotsUpdated.length} pilot(s), ${unitsUpdated.length} unit(s) updated`,
      severity: 'info',
      data: {
        matchId: outcome.matchId,
        contractId: outcome.contractId,
        pilotsUpdated,
        unitsUpdated,
        contractUpdated: updatedContract?.id ?? null,
      },
    },
  ];
  if (contractDelta?.flippedToTerminal) {
    events.push({
      type: 'contract_fulfilled',
      description: `Contract ${contractDelta.contract.id} fulfilled (${contractDelta.contract.status})`,
      severity: 'info',
      data: {
        contractId: contractDelta.contract.id,
        newStatus: contractDelta.contract.status,
        previousStatus: contractDelta.previousStatus,
        matchId: outcome.matchId,
      },
    });
    events.push({
      type: 'contract_payment',
      description: contractClosure!.event.description,
      severity: contractClosure!.event.severity,
      data: contractClosure!.event.data,
    });
  }
  // --- Commit point (D-5) ---------------------------------------------
  // Every throwing computation is complete. The side effects below are
  // non-throwing by contract: the fulfillment bus isolates listener
  // errors, and the roster patch commit is a plain zustand state write.
  // Committing here means a throw anywhere above leaves the roster (and
  // the campaign) untouched while the outcome stays queued for retry —
  // the apply is all-or-nothing from the caller's perspective.
  if (contractDelta?.flippedToTerminal) {
    publishContractFulfilled({
      contractId: contractDelta.contract.id,
      newStatus: contractDelta.contract.status,
      matchId: outcome.matchId,
      playerWon: playerWon(outcome),
      publishedAt: nowIso,
    });
  }
  if (pilotPatches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(pilotPatches);
  }
  return {
    campaign: updatedCampaign,
    summary: {
      matchId: outcome.matchId,
      pilotsUpdated,
      unitsUpdated,
      contractUpdated: updatedContract?.id ?? null,
      skippedDuplicate: false,
      errors,
    },
    events,
  };
}
export function applyPostBattle(
  outcome: ICombatOutcome,
  campaign: ICampaignWithBattleState,
): {
  campaign: ICampaignWithBattleState;
  summary: IPostBattleApplied;
  events: IDayEvent[];
} {
  const result = applyOutcome(campaign, outcome);
  return {
    campaign: result.campaign,
    summary: result.summary,
    events: result.events,
  };
}
export const postBattleProcessor: IDayProcessor = {
  id: 'post-battle',
  phase: DayPhase.MISSIONS - 50,
  displayName: 'Post-Battle Processing',
  process(campaign: ICampaign): IDayProcessorResult {
    const extended = campaign as ICampaignWithBattleState;
    const queue = extended.pendingBattleOutcomes ?? [];
    if (queue.length === 0) {
      return { events: [], campaign };
    }
    let working: ICampaignWithBattleState = extended;
    const events: IDayEvent[] = [];
    for (const outcome of queue) {
      try {
        const result = applyOutcome(working, outcome);
        working = result.campaign;
        events.push(...result.events);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          `[postBattleProcessor] Failed to apply outcome ${outcome.matchId}; keeping in queue for retry:`,
          err,
        );
        events.push({
          type: 'post_battle_apply_failed',
          description: `Post-battle apply failed for match ${outcome.matchId}: ${message}`,
          severity: 'critical',
          data: {
            matchId: outcome.matchId,
            contractId: outcome.contractId,
            error: message,
          },
        });
      }
    }
    return { events, campaign: working };
  },
};
export function registerPostBattleProcessor(): void {
  getDayPipeline().register(postBattleProcessor);
}
