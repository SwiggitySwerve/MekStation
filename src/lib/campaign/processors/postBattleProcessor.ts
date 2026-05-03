/**
 * Post-Battle Processor
 *
 * Drains the campaign's `pendingBattleOutcomes` queue and applies each
 * `ICombatOutcome` to campaign state:
 *
 *   - Per-pilot XP (scenario + kill, threshold-aware) via `xpAwards`.
 *   - Per-pilot wounds + status mapping (KIA / MIA / WOUNDED / CAPTURED).
 *   - Per-unit combat-state persistence (armor, structure, components,
 *     ammo, heat) via the campaign-stored `unitCombatStates` map.
 *   - Contract progression (mission status flip on objective end / loss).
 *
 * The processor is **idempotent**. Each campaign tracks
 * `processedBattleIds`; an outcome whose `matchId` is already in that
 * set is skipped. This is the safety net for retries and replayed
 * pipeline runs.
 *
 * Phase 3 Wave 2 — `add-post-battle-processor`. Wave 5 (engine wiring)
 * will populate `pendingBattleOutcomes` from `IGameSession` completion
 * events. Wave 3 (salvage / repair) will read the persisted
 * `IUnitCombatState` map produced here.
 *
 * @module lib/campaign/processors/postBattleProcessor
 */

import type { ICampaign, IContract, IMission } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { MissionStatus } from '@/types/campaign/enums';
import { isContract } from '@/types/campaign/Mission';
import { createInitialCombatState } from '@/types/campaign/UnitCombatState';
import {
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { logger } from '@/utils/logger';

import type { IDayProcessor, IDayProcessorResult } from '../dayPipeline';

import { publishContractFulfilled } from '../contractFulfillmentBus';
import { getDayPipeline } from '../dayPipeline';
import { DayPhase, type IDayEvent } from '../dayPipeline';
import { awardKillXP, awardScenarioXP } from '../progression/xpAwards';

// =============================================================================
// Extended Campaign Surface
// =============================================================================

/**
 * Optional fields the post-battle processor reads / writes on the
 * campaign. They are added here as an intersection so we don't have to
 * widen `ICampaign` itself in this Wave — Wave 4/5 may promote them to
 * the core interface.
 *
 * Per canonicalize-unit-combat-state PR-A: `unitCombatStates` has been
 * promoted to ICampaign and is no longer declared on this extension.
 * Consumers read it via the canonical `campaign.unitCombatStates` slot.
 */
export interface IPostBattleCampaignExtensions {
  /** Queue of outcomes pending application. */
  readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
  /** Set of match ids already applied (idempotency guard). */
  readonly processedBattleIds?: readonly string[];
  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5 §9: contract ids
   * the post-battle processor flagged as fulfilled this day. The
   * contractProcessor consumes these on its next pass and clears them.
   */
  readonly pendingFulfilledContractIds?: readonly string[];
}

export type ICampaignWithBattleState = ICampaign &
  IPostBattleCampaignExtensions;

// =============================================================================
// Result Surface
// =============================================================================

/**
 * Per-outcome summary so the UI (Wave 4) and tests can introspect what
 * the processor did without reading the campaign diff manually.
 */
export interface IPostBattleApplied {
  readonly matchId: string;
  readonly pilotsUpdated: readonly string[];
  readonly unitsUpdated: readonly string[];
  readonly contractUpdated: string | null;
  readonly skippedDuplicate: boolean;
  readonly errors: readonly string[];
}

// =============================================================================
// Pilot Application
// =============================================================================

/**
 * Map a pilot's tactical-side `PilotFinalStatus` onto the campaign-side
 * `CampaignPilotStatus`.
 *
 * Wounded with `wounds >= 5` escalates to `Critical` so the lossy
 * Critical→Wounded round-trip the legacy bridge introduced is fixed
 * (see PR4 of `wire-iperson-hard-cutover` regression test). Active
 * returns null because we want to *preserve* the existing roster entry
 * status (the pilot may have been on extended recovery before the
 * battle and a clean Active flip would lose that context).
 *
 * `Captured` (POW) has no `CampaignPilotStatus` representation today —
 * MIA is the closest analog; future-state wants a dedicated POW status.
 */
function pilotFinalToRosterStatus(
  finalStatus: PilotFinalStatus,
  newWounds: number,
): CampaignPilotStatus | null {
  switch (finalStatus) {
    case PilotFinalStatus.Active:
      return null;
    case PilotFinalStatus.Wounded:
    case PilotFinalStatus.Unconscious:
      return newWounds >= 5
        ? CampaignPilotStatus.Critical
        : CampaignPilotStatus.Wounded;
    case PilotFinalStatus.KIA:
      return CampaignPilotStatus.KIA;
    case PilotFinalStatus.MIA:
      return CampaignPilotStatus.MIA;
    case PilotFinalStatus.Captured:
      // No POW variant on CampaignPilotStatus — collapse to MIA so the
      // pilot is at least excluded from the active roster. Tracked for
      // future-state expansion.
      return CampaignPilotStatus.MIA;
    default:
      return null;
  }
}

/**
 * Apply a single unit delta's pilot effects.
 *
 * Per PR4 of `wire-iperson-hard-cutover`: returns a per-pilot patch the
 * caller commits via `applyPilotPatches`. The personnel Map is gone.
 *
 * NPC rule: XP helpers (awardScenarioXP / awardKillXP) return null when
 * `pilot === null` — NPCs don't earn XP.
 *
 * Returns `null` when the pilot id can't be resolved to a roster entry —
 * non-fatal; the rest of the outcome continues processing.
 */
function applyPilotDelta(
  campaign: ICampaign,
  pilotId: string,
  delta: IUnitCombatDelta,
  outcomeWonByPlayer: boolean,
  entry: ICampaignRosterEntry | null,
  pilot: IPilot | null,
): { patch: Partial<ICampaignRosterEntry>; xpAwarded: number } | null {
  if (!entry) {
    logger.warn(
      `[postBattleProcessor] Unknown pilot id "${pilotId}" — skipping pilot updates.`,
    );
    return null;
  }

  // 1. XP — scenario participation always, kill bonus when present.
  // NPC rule: awardScenarioXP / awardKillXP return null when pilot===null.
  let xpDelta = 0;
  let campaignXpDelta = 0;

  const scenarioEvent = awardScenarioXP(entry, pilot, campaign.options);
  if (scenarioEvent) {
    xpDelta += scenarioEvent.amount;
    campaignXpDelta += scenarioEvent.amount;
  }

  // Kill XP only awarded to player-side survivors who fought (basic
  // heuristic; richer kill attribution will land in Wave 5 wiring).
  if (delta.side === GameSide.Player && outcomeWonByPlayer) {
    const killEvent = awardKillXP(entry, pilot, 1, campaign.options);
    if (killEvent) {
      xpDelta += killEvent.amount;
      campaignXpDelta += killEvent.amount;
    }
  }

  // 2. Wound counter — accumulates on top of any pre-battle wounds.
  const newWounds = Math.min(6, entry.wounds + delta.pilotState.wounds);

  // 3. Status mapping (escalates to Critical when wounds >= 5).
  const mappedStatus = pilotFinalToRosterStatus(
    delta.pilotState.finalStatus,
    newWounds,
  );
  const newStatus = mappedStatus ?? entry.status;

  // 4. WOUNDED → seed recovery time = wounds * 7 (matches legacy formula).
  const isWounded =
    delta.pilotState.finalStatus === PilotFinalStatus.Wounded ||
    delta.pilotState.finalStatus === PilotFinalStatus.Unconscious;

  const patch: Partial<ICampaignRosterEntry> = {
    wounds: newWounds,
    status: newStatus,
    xp: entry.xp + xpDelta,
    campaignXpEarned: entry.campaignXpEarned + campaignXpDelta,
    recoveryTime: isWounded
      ? Math.max(entry.recoveryTime, newWounds * 7)
      : entry.recoveryTime,
  };

  return { patch, xpAwarded: xpDelta };
}

// =============================================================================
// Unit Combat-State Application
// =============================================================================

/**
 * Merge a single delta into the persisted combat state for the unit.
 * Always returns a fresh state object — never mutates inputs.
 */
function applyUnitDelta(
  existing: IUnitCombatState | undefined,
  delta: IUnitCombatDelta,
  matchId: string,
  nowIso: string,
): IUnitCombatState {
  const base: IUnitCombatState =
    existing ??
    createInitialCombatState({
      unitId: delta.unitId,
      armorPerLocation: delta.armorRemaining,
      structurePerLocation: delta.internalsRemaining,
      ammoPerBin: delta.ammoRemaining,
    });

  // Armor: take the delta's snapshot directly (clamped ≥ 0). The delta
  // is the *remaining* armor at end of battle, so it already reflects
  // damage dealt during this match.
  const nextArmor: Record<string, number> = { ...base.currentArmorPerLocation };
  for (const [loc, value] of Object.entries(delta.armorRemaining)) {
    nextArmor[loc] = Math.max(0, value);
  }

  const nextStructure: Record<string, number> = {
    ...base.currentStructurePerLocation,
  };
  for (const [loc, value] of Object.entries(delta.internalsRemaining)) {
    nextStructure[loc] = Math.max(0, value);
  }

  const nextAmmo: Record<string, number> = { ...base.ammoRemaining };
  for (const [bin, value] of Object.entries(delta.ammoRemaining)) {
    nextAmmo[bin] = Math.max(0, value);
  }

  // Destroyed locations: union of existing + delta.
  const destroyedLocations = Array.from(
    new Set<string>([...base.destroyedLocations, ...delta.destroyedLocations]),
  );

  // Destroyed components: append new ones with this matchId stamped,
  // dedupe by name (we don't have slot info on the delta — Wave 5 will
  // enrich). The dedup key is `${name}` — replays of the same outcome
  // re-stamp the same name and the Set collapses them.
  const seenNames = new Set(base.destroyedComponents.map((c) => c.name));
  const newComponents = delta.destroyedComponents
    .filter((name) => !seenNames.has(name))
    .map((name) => ({
      location: 'unknown' as const,
      slot: -1,
      componentType: 'unknown' as const,
      name,
      destroyedAt: matchId,
    }));

  return {
    unitId: delta.unitId,
    currentArmorPerLocation: nextArmor,
    currentStructurePerLocation: nextStructure,
    destroyedLocations,
    destroyedComponents: [...base.destroyedComponents, ...newComponents],
    heatEnd: delta.heatEnd,
    ammoRemaining: nextAmmo,
    combatReady:
      base.combatReady &&
      delta.finalStatus !== UnitFinalStatus.Destroyed &&
      !delta.destroyed,
    lastCombatOutcomeId: matchId,
    lastUpdated: nowIso,
  };
}

// =============================================================================
// Contract Application
// =============================================================================

/**
 * Determine if the player won this outcome. Used by both contract
 * status flipping and kill-XP gating.
 *
 * Heuristic for Wave 2: derive winner from the `report` summary, which
 * carries a `winner: GameSide | 'draw'` field. Wave 5 will wire a
 * richer player-side check (multi-player teams, etc.).
 */
function playerWon(outcome: ICombatOutcome): boolean {
  // The composed report contains the original session winner.
  // `IPostBattleReport.winner` is required + already typed as
  // `GameSide | 'draw'` — the previous double-cast was a no-op
  // defensive shim from before the report shape was tightened.
  return outcome.report.winner === GameSide.Player;
}

/**
 * Apply an outcome's contract effects. Returns the updated contract,
 * the previous status, and whether the status flip is terminal (so the
 * caller can publish a `ContractFulfilled` event). Returns null when
 * no contract was bound to the outcome / id was unresolvable.
 */
function applyContractDelta(
  campaign: ICampaign,
  missions: Map<string, IMission>,
  outcome: ICombatOutcome,
): {
  contract: IContract;
  previousStatus: MissionStatus;
  flippedToTerminal: boolean;
} | null {
  if (!outcome.contractId) return null;

  const mission = missions.get(outcome.contractId);
  if (!mission) {
    logger.warn(
      `[postBattleProcessor] Unknown contract id "${outcome.contractId}" — skipping contract update.`,
    );
    return null;
  }
  if (!isContract(mission)) {
    return null;
  }

  // Only flip status on terminal end reasons. Withdrawal leaves the
  // contract Active for now — the player can re-engage. TurnLimit is a
  // soft terminal: flip to PARTIAL so downstream payout logic treats
  // it as a draw outcome rather than leaving the mission Active.
  const previousStatus = mission.status;
  let nextStatus = previousStatus;
  if (outcome.endReason === CombatEndReason.ObjectiveMet) {
    nextStatus = playerWon(outcome)
      ? MissionStatus.SUCCESS
      : MissionStatus.FAILED;
  } else if (
    outcome.endReason === CombatEndReason.Destruction ||
    outcome.endReason === CombatEndReason.Concede
  ) {
    nextStatus = playerWon(outcome)
      ? MissionStatus.SUCCESS
      : MissionStatus.FAILED;
  } else if (
    outcome.endReason === CombatEndReason.TurnLimit ||
    outcome.endReason === CombatEndReason.Aborted
  ) {
    // Turn-limit and reconnect-aborted matches are draws by construction — map
    // to "PARTIAL" rather than leaving the mission Active.
    nextStatus = MissionStatus.PARTIAL;
  }

  const updated: IContract = {
    ...mission,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  missions.set(updated.id, updated);

  // Per `wire-encounter-to-campaign-round-trip` Wave 5 §9: a flip
  // from a non-terminal status (Active / Pending) to any terminal one
  // (Success / Partial / Failed) signals contract fulfillment.
  // Status that didn't change at all does NOT publish — re-runs are
  // a no-op for the bus.
  const isTerminal =
    nextStatus === MissionStatus.SUCCESS ||
    nextStatus === MissionStatus.PARTIAL ||
    nextStatus === MissionStatus.FAILED;
  const flippedToTerminal = isTerminal && previousStatus !== nextStatus;

  return { contract: updated, previousStatus, flippedToTerminal };
}

// =============================================================================
// Single-Outcome Application
// =============================================================================

/**
 * Apply a single outcome to the campaign and return:
 *   - the updated campaign,
 *   - a per-outcome summary (`IPostBattleApplied`),
 *   - and the events to surface in the day report.
 *
 * Idempotent: returns `{ skippedDuplicate: true }` when the outcome's
 * matchId is already in `processedBattleIds`.
 */
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

  // Clone mutable working copies. We can't mutate the immutable Maps
  // returned by ICampaign directly — we need new ones so React-style
  // shallow comparisons fire downstream.
  const missions = new Map(campaign.missions);
  const unitStates: Record<string, IUnitCombatState> = {
    ...(campaign.unitCombatStates ?? {}),
  };

  const pilotsUpdated: string[] = [];
  const unitsUpdated: string[] = [];
  const errors: string[] = [];
  const wonByPlayer = playerWon(outcome);
  const nowIso = new Date().toISOString();

  // Pre-join vault once per outcome (O(N) build, O(1) lookups).
  // Per PR4 of `wire-iperson-hard-cutover`: roster store is the canonical
  // entry source. Per-pilot patches accumulate into `pilotPatches` and are
  // committed once via `applyPilotPatches` after the loop.
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const vault = usePilotStore.getState().pilots;
  const pilotsByPilotId = buildPilotLookup(vault);
  const entriesByPilotId = new Map(rosterEntries.map((e) => [e.pilotId, e]));
  const pilotPatches = new Map<string, Partial<ICampaignRosterEntry>>();

  for (const delta of outcome.unitDeltas) {
    // Pilot side — derive pilot id from unit id for now (Wave 5 will
    // enrich with explicit pilot binding). Roster keys are pilot ids and
    // our current production wiring matches `unit:pilot` 1:1, so we
    // attempt direct lookup first and fall through cleanly when the
    // unit has no associated roster entry.
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

    // Unit damage state — always updated even if pilot lookup failed.
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

  // Commit accumulated pilot patches to the canonical roster store.
  if (pilotPatches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(pilotPatches);
  }

  const contractDelta = applyContractDelta(campaign, missions, outcome);
  const updatedContract = contractDelta?.contract ?? null;

  // Drain the queue: drop the applied outcome and stamp matchId into
  // the processed set so a re-run is a no-op.
  const remainingQueue = (campaign.pendingBattleOutcomes ?? []).filter(
    (o) => o.matchId !== outcome.matchId,
  );

  // Per `wire-encounter-to-campaign-round-trip`: hand the just-applied
  // outcome to downstream battle-effects processors (salvage, repair)
  // via `recentlyAppliedOutcomes`. Without this stage, those processors
  // would see an empty queue (we just drained it) and emit nothing.
  const recentlyApplied = [
    ...((
      campaign as ICampaignWithBattleState & {
        readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];
      }
    ).recentlyAppliedOutcomes ?? []),
    outcome,
  ];

  // Per Wave 5 §9.1: when post-battle flips a contract to terminal,
  // queue the contract id onto `pendingFulfilledContractIds` so the
  // contractProcessor can pick it up on the same day's pipeline run.
  // We also publish a `ContractFulfilled` bus event for any listeners
  // outside the pipeline (UI banners, multiplayer sync).
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
    // Surface the fulfillment as a day event too so the audit-feed
    // builder can list it under "Contracts closed today".
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

// =============================================================================
// Public API: Apply One Outcome
// =============================================================================

/**
 * Apply a single combat outcome to a campaign without going through the
 * day pipeline. Useful for tests, REPL, and direct UI-driven flows.
 */
export function applyPostBattle(
  outcome: ICombatOutcome,
  campaign: ICampaignWithBattleState,
): { campaign: ICampaignWithBattleState; summary: IPostBattleApplied } {
  const result = applyOutcome(campaign, outcome);
  return { campaign: result.campaign, summary: result.summary };
}

// =============================================================================
// Day Processor
// =============================================================================

/**
 * Day-pipeline processor. Drains every pending outcome on the campaign
 * in arrival order. Runs early in the MISSIONS phase so contract status
 * is up to date before `contractProcessor` final-payment logic runs.
 */
export const postBattleProcessor: IDayProcessor = {
  id: 'post-battle',
  // Slightly before MISSIONS so contractProcessor sees flipped statuses.
  phase: DayPhase.MISSIONS - 50,
  displayName: 'Post-Battle Processing',

  process(campaign: ICampaign): IDayProcessorResult {
    const extended = campaign as ICampaignWithBattleState;
    const queue = extended.pendingBattleOutcomes ?? [];
    if (queue.length === 0) {
      return { events: [], campaign };
    }

    // Per Req 4 ("Failed application keeps outcome in queue"), each
    // outcome is applied in its own try/catch. A throw from
    // `applyOutcome` leaves `working` unchanged — the failing outcome
    // stays in `pendingBattleOutcomes` for a later retry, and we surface
    // a campaign-level error event so the day report flags it. Other
    // queued outcomes continue processing.
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
        // `working` is intentionally NOT reassigned — the outcome stays
        // in `working.pendingBattleOutcomes` so the next run can retry.
      }
    }

    return { events, campaign: working };
  },
};

/**
 * Register the post-battle processor with the day pipeline. Used by
 * `processorRegistration.ts`.
 */
export function registerPostBattleProcessor(): void {
  // Static import lives at the top of the file — `processorRegistration`
  // already does the same, so there's no real cycle to dodge here.
  getDayPipeline().register(postBattleProcessor);
}
