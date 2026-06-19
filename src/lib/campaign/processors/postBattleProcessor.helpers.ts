import type { ICampaign, IContract, IMission } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type { IUnitCombatDelta } from '@/types/combat/CombatOutcome';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

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

import { awardKillXP, awardScenarioXP } from '../progression/xpAwards';

// =============================================================================
// Pilot Application
// =============================================================================

/**
 * Map a pilot's tactical-side `PilotFinalStatus` onto the campaign-side
 * `CampaignPilotStatus`.
 *
 * Wounded with `wounds >= 5` escalates to `Critical` so the lossy
 * Criticalâ†’Wounded round-trip the legacy bridge introduced is fixed
 * (see PR4 of `wire-iperson-hard-cutover` regression test). Active
 * returns null because we want to *preserve* the existing roster entry
 * status (the pilot may have been on extended recovery before the
 * battle and a clean Active flip would lose that context).
 *
 * `Captured` (POW) has no `CampaignPilotStatus` representation today â€”
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
      // No POW variant on CampaignPilotStatus â€” collapse to MIA so the
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
 * `pilot === null` â€” NPCs don't earn XP.
 *
 * Per audit finding D-8 (2026-06-09, W3.4): the patch also increments
 * `campaignMissions` (every applied outcome counts as one mission for
 * the pilot) and `campaignKills` by `killCount` â€” the unit's kill total
 * from the after-action report â€” so kill/mission auto-awards
 * (`awards/categoryCheckers.ts`) can ever fire.
 *
 * Returns `null` when the pilot id can't be resolved to a roster entry â€”
 * non-fatal; the rest of the outcome continues processing.
 */
export function applyPilotDelta(context: {
  readonly campaign: ICampaign;
  readonly pilotId: string;
  readonly delta: IUnitCombatDelta;
  readonly outcomeWonByPlayer: boolean;
  readonly entry: ICampaignRosterEntry | null;
  readonly pilot: IPilot | null;
  readonly killCount?: number;
}): { patch: Partial<ICampaignRosterEntry>; xpAwarded: number } | null {
  const {
    campaign,
    pilotId,
    delta,
    outcomeWonByPlayer,
    entry,
    pilot,
    killCount = 0,
  } = context;
  if (!entry) {
    logger.warn(
      `[postBattleProcessor] Unknown pilot id "${pilotId}" â€” skipping pilot updates.`,
    );
    return null;
  }

  // 1. XP â€” scenario participation always, kill bonus when present.
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

  // 2. Wound counter â€” accumulates on top of any pre-battle wounds.
  const newWounds = Math.min(6, entry.wounds + delta.pilotState.wounds);

  // 3. Status mapping (escalates to Critical when wounds >= 5).
  const mappedStatus = pilotFinalToRosterStatus(
    delta.pilotState.finalStatus,
    newWounds,
  );
  const newStatus = mappedStatus ?? entry.status;

  // 4. WOUNDED â†’ seed recovery time = wounds * 7 (matches legacy formula).
  const isWounded =
    delta.pilotState.finalStatus === PilotFinalStatus.Wounded ||
    delta.pilotState.finalStatus === PilotFinalStatus.Unconscious;

  const patch: Partial<ICampaignRosterEntry> = {
    wounds: newWounds,
    status: newStatus,
    xp: entry.xp + xpDelta,
    campaignXpEarned: entry.campaignXpEarned + campaignXpDelta,
    // D-8: lifetime counters the auto-award checkers threshold against.
    // Participation in an applied outcome is one mission; kills come from
    // the after-action report's attribution for this unit.
    campaignKills: entry.campaignKills + Math.max(0, killCount),
    campaignMissions: entry.campaignMissions + 1,
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
 * Always returns a fresh state object â€” never mutates inputs.
 */
export function applyUnitDelta(
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

  // Armor: take the delta's snapshot directly (clamped â‰¥ 0). The delta
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
  // dedupe by name (we don't have slot info on the delta â€” Wave 5 will
  // enrich). The dedup key is `${name}` â€” replays of the same outcome
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
export function playerWon(outcome: ICombatOutcome): boolean {
  // The composed report contains the original session winner.
  // `IPostBattleReport.winner` is required + already typed as
  // `GameSide | 'draw'` â€” the previous double-cast was a no-op
  // defensive shim from before the report shape was tightened.
  return outcome.report.winner === GameSide.Player;
}

/**
 * Apply an outcome's contract effects. Returns the updated contract,
 * the previous status, and whether the status flip is terminal (so the
 * caller can publish a `ContractFulfilled` event). Returns null when
 * no contract was bound to the outcome / id was unresolvable.
 */
export function applyContractDelta(
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
      `[postBattleProcessor] Unknown contract id "${outcome.contractId}" â€” skipping contract update.`,
    );
    return null;
  }
  if (!isContract(mission)) {
    return null;
  }

  // Only flip status on terminal end reasons. Withdrawal leaves the
  // contract Active for now â€” the player can re-engage. TurnLimit is a
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
    // Turn-limit and reconnect-aborted matches are draws by construction â€” map
    // to "PARTIAL" rather than leaving the mission Active.
    nextStatus = MissionStatus.PARTIAL;
  }

  const updated: IContract = {
    ...mission,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  missions.set(updated.id, updated);

  // Per `wire-encounter-to-campaign-round-trip` Wave 5 Â§9: a flip
  // from a non-terminal status (Active / Pending) to any terminal one
  // (Success / Partial / Failed) signals contract fulfillment.
  // Status that didn't change at all does NOT publish â€” re-runs are
  // a no-op for the bus.
  const isTerminal =
    nextStatus === MissionStatus.SUCCESS ||
    nextStatus === MissionStatus.PARTIAL ||
    nextStatus === MissionStatus.FAILED;
  const flippedToTerminal = isTerminal && previousStatus !== nextStatus;

  return { contract: updated, previousStatus, flippedToTerminal };
}
