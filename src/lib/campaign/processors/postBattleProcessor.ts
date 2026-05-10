import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
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
  const pilotsUpdated: string[] = [];
  const unitsUpdated: string[] = [];
  const errors: string[] = [];
  const wonByPlayer = playerWon(outcome);
  const nowIso = new Date().toISOString();
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const vault = usePilotStore.getState().pilots;
  const pilotsByPilotId = buildPilotLookup(vault);
  const entriesByPilotId = new Map(rosterEntries.map((e) => [e.pilotId, e]));
  const pilotPatches = new Map<string, Partial<ICampaignRosterEntry>>();
  for (const delta of outcome.unitDeltas) {
    const entry = entriesByPilotId.get(delta.unitId) ?? null;
    const pilot = pilotsByPilotId.get(delta.unitId) ?? null;
    const pilotResult = applyPilotDelta(
      campaign,
      delta.unitId,
      delta,
      wonByPlayer,
      entry,
      pilot,
    );
    if (pilotResult) {
      pilotPatches.set(delta.unitId, pilotResult.patch);
      pilotsUpdated.push(delta.unitId);
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
  if (pilotPatches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(pilotPatches);
  }
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
  const previousFulfilled =
    (
      campaign as ICampaignWithBattleState & {
        readonly pendingFulfilledContractIds?: readonly string[];
      }
    ).pendingFulfilledContractIds ?? [];
  const nextFulfilled = contractDelta?.flippedToTerminal
    ? [...previousFulfilled, contractDelta.contract.id]
    : previousFulfilled;
  if (contractDelta?.flippedToTerminal) {
    publishContractFulfilled({
      contractId: contractDelta.contract.id,
      newStatus: contractDelta.contract.status,
      matchId: outcome.matchId,
      playerWon: playerWon(outcome),
      publishedAt: nowIso,
    });
  }
  const updatedCampaign: ICampaignWithBattleState & {
    readonly recentlyAppliedOutcomes: readonly ICombatOutcome[];
    readonly pendingFulfilledContractIds: readonly string[];
  } = {
    ...campaign,
    missions,
    pendingBattleOutcomes: remainingQueue,
    processedBattleIds: [...processed, outcome.matchId],
    unitCombatStates: unitStates,
    recentlyAppliedOutcomes: recentlyApplied,
    pendingFulfilledContractIds: nextFulfilled,
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
): { campaign: ICampaignWithBattleState; summary: IPostBattleApplied } {
  const result = applyOutcome(campaign, outcome);
  return { campaign: result.campaign, summary: result.summary };
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
