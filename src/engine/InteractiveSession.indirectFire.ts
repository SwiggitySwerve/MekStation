/**
 * Interactive Session — indirect-fire collaborator.
 *
 * Implements `computeIndirectFireContext`, the single integration point
 * between the engine and the `src/utils/gameplay/indirectFire.ts` helper.
 * Extracted as a collaborator so `InteractiveSession` stays a thin
 * state-machine coordinator (consistent with the actions / resolvers /
 * phases / ai split).
 *
 * The helper (`resolveIndirectFire`) remains pure and engine-independent —
 * it operates on synthetic `ISpotterCandidate[]` inputs as specified in
 * the engine-integration-contract requirement.
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md
 */

import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import { isAirborneGameUnit } from '@/utils/gameplay/groundToGround';
import {
  resolveIndirectFireWithSemiGuided,
  isIndirectFireCapable,
  type IAirborneAeroSpottingEquipment,
  type ISpotterCandidate,
} from '@/utils/gameplay/indirectFire';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

type AirborneAeroSpottingUnitState = IGameState['units'][string] & {
  readonly airborneAeroSpottingEquipment?: IAirborneAeroSpottingEquipment;
};

type NarcMarkedUnitState = IGameState['units'][string] & {
  readonly narcMarkedByTeams?: readonly string[];
  readonly iNarcMarkedByTeams?: readonly string[];
  readonly tagDesignated?: boolean;
  readonly ecmProtected?: boolean;
};

function getAirborneAeroSpottingEquipment(
  unit: IGameState['units'][string],
): IAirborneAeroSpottingEquipment | undefined {
  return (unit as AirborneAeroSpottingUnitState).airborneAeroSpottingEquipment;
}

/**
 * Derive `IIndirectFireResolution` for an attack declared from
 * `attackerId` using `weaponId` at `targetHex`.
 *
 * Steps:
 *  1. Reject immediately when the weapon cannot fire indirectly.
 *  2. Compute attacker→target LOS to decide if indirect is needed.
 *  3. When the attacker has LOS, return a direct-fire pass-through
 *     (permitted=true, isIndirect=false, toHitPenalty=0).
 *  4. Build `ISpotterCandidate[]` from every operational, friendly,
 *     non-attacker unit in the current game state. When `pilotSpasByUnitId`
 *     is supplied, the matching SPA list is threaded into each candidate so
 *     the helper can apply FO (Forward Observer) and future SPA cancellations.
 *  5. When no LOS spotter is found, check NARC/iNarc beacon flags on the
 *     target unit (§3). When `targetEntityId` is supplied and the target unit
 *     carries `narcMarkedByTeams` / `iNarcMarkedByTeams` arrays, those flags
 *     are plumbed into the helper. If the target unit or the arrays are absent
 *     (fields not yet populated by weapon resolution), both flags default to
 *     `false` — forward-compatible once NARC weapon resolution lands.
 *  6. Delegate to `resolveIndirectFire` and map the result to
 *     `IIndirectFireResolution`.
 *
 * This function is a pure collaborator — it reads from `gameState` and
 * `grid` but never mutates them.
 *
 * @param pilotSpasByUnitId - Optional map of unit-id → canonical SPA id list.
 *   Callers (e.g. the attack resolver) can supply this when pilot data is
 *   already in scope. Units absent from the map receive no SPA modifiers.
 * @param targetEntityId - Optional entity ID of the target unit. When provided,
 *   NARC/iNarc beacon state is read from the target's unit game state.
 */
export function computeIndirectFireContext(
  attackerId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  gameState: IGameState,
  grid: IHexGrid,
  pilotSpasByUnitId?: Readonly<Record<string, readonly string[]>>,
  targetEntityId?: string,
): IIndirectFireResolution {
  const attackerUnit = gameState.units[attackerId];
  if (!attackerUnit) {
    return {
      permitted: false,
      isIndirect: false,
      spotterId: null,
      toHitPenalty: 0,
      reason: `Attacker '${attackerId}' not found in game state`,
    };
  }

  // Reject non-indirect-capable weapons before any LOS work.
  if (!isIndirectFireCapable(weaponId)) {
    return {
      permitted: false,
      isIndirect: false,
      spotterId: null,
      toHitPenalty: 0,
      reason: `Weapon '${weaponId}' is not capable of indirect fire`,
    };
  }

  // Compute attacker→target LOS to determine whether indirect is needed.
  const attackerLOS = calculateLOS(attackerUnit.position, targetHex, grid);
  if (attackerLOS.hasLOS) {
    // Direct fire is available; indirect context is a pass-through.
    return {
      permitted: true,
      isIndirect: false,
      spotterId: null,
      toHitPenalty: 0,
    };
  }

  // Attacker has no LOS — enumerate spotter candidates from the current state.
  // Use the unit's `side` value as the team ID so the helper's eligibility
  // check (same team as attacker) maps cleanly to game sides.
  const attackerTeamId = attackerUnit.side as string;

  const spotterCandidates: ISpotterCandidate[] = [];
  for (const [unitId, unit] of Object.entries(gameState.units)) {
    // Skip destroyed, retreated, or non-operational units.
    if (unit.destroyed || unit.hasRetreated) continue;
    spotterCandidates.push({
      entityId: unitId,
      teamId: unit.side as string,
      position: unit.position,
      movementType: unit.movementThisTurn,
      isInfantry:
        unit.combatState?.kind === 'platoon' ||
        unit.combatState?.kind === 'squad',
      isOperational: !unit.destroyed && !unit.shutdown,
      isAirborneAerospace: isAirborneGameUnit(unit),
      airborneAeroSpottingEquipment: getAirborneAeroSpottingEquipment(unit),
      // Prefer per-call pilot SPA overrides, then persisted session state.
      // Absent entries leave pilotSpas undefined - no SPA modifier applied.
      pilotSpas: pilotSpasByUnitId?.[unitId] ?? unit.pilotSpas,
      // Thread pilot gunnery into candidate for the spotter-skill modifier.
      // IUnitGameState.gunnery is optional (seeded at session-creation time from
      // IGameUnit.gunnery). When absent (synthetic fixtures, legacy saves), the
      // helper defaults to 4 (MegaMek baseline, modifier = 0).
      spotterGunnery: unit.gunnery,
    });
  }

  // Derive NARC/iNarc beacon flags for the target unit (§3).
  // The fields `narcMarkedByTeams` / `iNarcMarkedByTeams` do not exist yet on
  // IUnitGameState — they land when NARC weapon resolution ships in a later PR.
  // Until then we read them defensively via a narrow forward-compat overlay.
  const targetUnit = targetEntityId
    ? gameState.units[targetEntityId]
    : undefined;
  const targetUnitWithBeacons = targetUnit as NarcMarkedUnitState | undefined;
  const narcMarkedByTeams: readonly string[] =
    targetUnitWithBeacons?.narcMarkedByTeams ?? [];
  const inarcMarkedByTeams: readonly string[] =
    targetUnitWithBeacons?.iNarcMarkedByTeams ?? [];
  const targetNarcMarkedByTeam = narcMarkedByTeams.includes(attackerTeamId);
  const targetINarcMarkedByTeam = inarcMarkedByTeams.includes(attackerTeamId);

  // Delegate to the pure helper — it handles eligibility, LOS per spotter,
  // spotter-election tiebreak, NARC/iNarc override, and penalty arithmetic.
  const result = resolveIndirectFireWithSemiGuided(
    {
      attackerEntityId: attackerId,
      attackerTeamId,
      attackerPosition: attackerUnit.position,
      targetPosition: targetHex,
      weaponId,
      attackerHasLOS: false,
      attackerAirborne: isAirborneGameUnit(attackerUnit),
      spotterCandidates,
      grid,
      targetNarcMarkedByTeam,
      targetINarcMarkedByTeam,
    },
    {
      weaponId,
      equipment: { isSemiGuided: false },
      targetStatus: {
        tagDesignated: targetUnitWithBeacons?.tagDesignated === true,
        ecmProtected: targetUnitWithBeacons?.ecmProtected === true,
      },
    },
  );

  if (!result.permitted) {
    return {
      permitted: false,
      isIndirect: result.isIndirect,
      spotterId: null,
      toHitPenalty: 0,
      reason: result.reason,
    };
  }

  // Map basis from helper result — 'los' | 'narc' | 'inarc' all pass through.
  return {
    permitted: true,
    isIndirect: true,
    spotterId: result.spotter?.entityId ?? null,
    basis: result.basis,
    toHitPenalty: result.toHitPenalty,
    spotterGunnery: result.spotterGunnery,
    spotterSkillModifier: result.spotterSkillModifier,
    forwardObserverApplied: result.forwardObserverApplied,
    spotterMovementPenaltyCancelled: result.spotterMovementPenaltyCancelled,
  };
}
