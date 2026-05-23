/**
 * Interactive Session — resolver-input collaborator.
 *
 * Extracted from `InteractiveSession` so the class stays a thin
 * state-machine coordinator. This module owns the small, pure helpers
 * that shape the inputs the gameplay resolvers consume: the injected
 * roller adapters, the per-unit physical-attack context, and the
 * water-depth lookup for the Heat phase.
 *
 * Every helper is a pure function of its arguments — no class state is
 * touched. Behaviour is preserved exactly.
 */

import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { IPhysicalAttackContext } from '@/utils/gameplay/gameSession';

import {
  roll2d6 as roll2d6FromD6,
  type D6Roller,
  type DiceRoller,
} from '@/utils/gameplay/diceTypes';
import { getGridTerrainHeatEffect } from '@/utils/gameplay/heat';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';

/**
 * Resolver-shaped `D6Roller`. Returns `undefined` when no roller was
 * injected so the resolver's own `defaultD6Roller` (`Math.random`)
 * remains in effect for single-player / hot-seat callers.
 *
 * Per `add-authoritative-roll-arbitration` (Wave 3a): `ServerMatchHost`
 * always injects a server-authoritative `D6Roller` (crypto-backed in
 * prod, seeded in `?seed=N` debug mode), so this returns the live
 * roller in multiplayer. Wrapping it via `RollCapture` further
 * upstream is what lets the host stamp captured rolls onto event
 * payloads.
 */
export function d6RollerForResolvers(
  d6Roller: D6Roller | undefined,
): D6Roller | undefined {
  return d6Roller;
}

/**
 * Adapter that lifts the injected `D6Roller` into a `DiceRoller` (a
 * full 2d6 result). Resolvers like `resolveAllAttacks` /
 * `resolveHeatPhase` / `resolveAllPhysicalAttacks` consume `DiceRoller`
 * — this keeps the injection point uniform without refactoring those
 * resolvers' parameter type. Returns `undefined` to fall back to the
 * resolver's default when no roller was injected.
 */
export function diceRollerForResolvers(
  d6Roller: D6Roller | undefined,
): DiceRoller | undefined {
  if (!d6Roller) return undefined;
  return () => roll2d6FromD6(d6Roller);
}

/**
 * Build the per-unit `IPhysicalAttackContext` map the physical-attack
 * resolver needs (attacker tonnage, piloting skill, hexes moved this
 * turn). Falls back to the Phase 1 defaults (65t / piloting 5) for any
 * unit missing from the cached maps — same defaults the class used.
 */
export function physicalContextByUnit(
  session: IGameSession,
  tonnageByUnit: Map<string, number>,
  pilotingByUnit: Map<string, number>,
  grid?: IHexGrid,
): Map<string, IPhysicalAttackContext> {
  const map = new Map<string, IPhysicalAttackContext>();
  for (const [unitId, unit] of Object.entries(session.currentState.units)) {
    map.set(unitId, {
      attackerTonnage: tonnageByUnit.get(unitId) ?? 65,
      pilotingSkill: pilotingByUnit.get(unitId) ?? 5,
      hasTSM: unit.hasTSM ?? false,
      isUnderwater:
        grid !== undefined
          ? waterDepthAtPosition(grid, unit.position) > 0
          : false,
      hexesMoved: unit.hexesMovedThisTurn,
      targetMovementComplete: true,
      pilotAbilities: unit.abilities,
      unitQuirks: unit.unitQuirks,
    });
  }
  return map;
}

/**
 * Per `wire-heat-generation-and-effects` task 5 + decisions.md
 * "Water cooling integration point": `IHex.terrain` is a plain
 * `string` today. We parse the `water:N` convention so a future
 * map author can tag a hex as `'water:1'` / `'water:2'` and get
 * the dissipation bonus immediately; all other terrain strings
 * (including `'clear'`, `'woods'`, etc.) return depth 0 → no
 * water cooling contribution. Calling `getWaterCoolingBonus(0)`
 * yields 0, preserving behaviour for every existing grid.
 */
export function waterDepthAt(grid: IHexGrid, position: IHexCoordinate): number {
  return waterDepthAtPosition(grid, position);
}

export function environmentHeatEffectAt(
  grid: IHexGrid,
  position: IHexCoordinate,
): number {
  return getGridTerrainHeatEffect(grid, position);
}
