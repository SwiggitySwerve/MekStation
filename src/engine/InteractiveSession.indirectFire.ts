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

import type { IIndirectFireResolution } from '@/types/gameplay/CombatInterfaces';
import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import {
  resolveIndirectFire,
  isIndirectFireCapable,
  type ISpotterCandidate,
} from '@/utils/gameplay/indirectFire';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

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
 *     non-attacker unit in the current game state.
 *  5. Delegate to `resolveIndirectFire` and map the result to
 *     `IIndirectFireResolution`.
 *
 * This function is a pure collaborator — it reads from `gameState` and
 * `grid` but never mutates them.
 */
export function computeIndirectFireContext(
  attackerId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  gameState: IGameState,
  grid: IHexGrid,
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
      isOperational: !unit.destroyed && !unit.shutdown,
    });
  }

  // Delegate to the pure helper — it handles eligibility, LOS per spotter,
  // spotter-election tiebreak, and penalty arithmetic.
  const result = resolveIndirectFire({
    attackerEntityId: attackerId,
    attackerTeamId,
    attackerPosition: attackerUnit.position,
    targetPosition: targetHex,
    weaponId,
    attackerHasLOS: false,
    spotterCandidates,
    grid,
  });

  if (!result.permitted) {
    return {
      permitted: false,
      isIndirect: result.isIndirect,
      spotterId: null,
      toHitPenalty: 0,
      reason: result.reason,
    };
  }

  return {
    permitted: true,
    isIndirect: true,
    spotterId: result.spotter?.entityId ?? null,
    basis: 'los',
    toHitPenalty: result.toHitPenalty,
  };
}
