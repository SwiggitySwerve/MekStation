/**
 * Interactive Session — construction-time setup collaborator.
 *
 * Extracted from `InteractiveSession` so the constructor stays a thin
 * wiring step. This module owns the two pieces of construction-time
 * derivation: building the per-unit lookup maps (weapons / movement /
 * gunnery / piloting / tonnage) and assembling the `IGameConfig` from
 * the raw constructor arguments + campaign linkage.
 *
 * Both functions are pure with respect to their inputs. Behaviour is
 * preserved exactly — the Phase 1 tonnage stand-in (65t) and the
 * `victoryConditions: ['elimination']` default are unchanged.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type {
  IGameConfig,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IMovementCapability } from '@/types/gameplay/HexGridInterfaces';

import type { IInteractiveSessionLinkage } from './InteractiveSession.types';
import type { IAdaptedUnit } from './types';

import { toMovementCapability } from './GameEngine.helpers';

/**
 * The five per-unit lookup maps the engine caches at session start so
 * the resolvers and AI driver can read unit attributes without
 * re-adapting the catalog on every turn.
 */
export interface IInteractiveSessionUnitMaps {
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly movementByUnit: Map<string, IMovementCapability>;
  readonly gunneryByUnit: Map<string, number>;
  readonly pilotingByUnit: Map<string, number>;
  readonly tonnageByUnit: Map<string, number>;
}

/**
 * Build the per-unit lookup maps from the adapted units (weapons +
 * movement capability + tonnage) and the game units (gunnery +
 * piloting). Tonnage uses the Phase 1 stand-in of 65t because catalog
 * tonnage is not yet on `IAdaptedUnit` — matches `SimulationRunnerConstants`.
 */
export function buildInteractiveSessionUnitMaps(
  playerUnits: readonly IAdaptedUnit[],
  opponentUnits: readonly IAdaptedUnit[],
  gameUnits: readonly IGameUnit[],
): IInteractiveSessionUnitMaps {
  const weaponsByUnit = new Map<string, readonly IWeapon[]>();
  const movementByUnit = new Map<string, IMovementCapability>();
  const gunneryByUnit = new Map<string, number>();
  const pilotingByUnit = new Map<string, number>();
  const tonnageByUnit = new Map<string, number>();

  for (const u of [...playerUnits, ...opponentUnits]) {
    weaponsByUnit.set(u.id, u.weapons);
    movementByUnit.set(u.id, toMovementCapability(u));
    // Phase 1 stand-in: catalog tonnage isn't on `IAdaptedUnit` yet,
    // so we default to 65t (matches `SimulationRunnerConstants`).
    tonnageByUnit.set(u.id, 65);
  }
  for (const gu of gameUnits) {
    gunneryByUnit.set(gu.id, gu.gunnery);
    pilotingByUnit.set(gu.id, gu.piloting);
  }

  return {
    weaponsByUnit,
    movementByUnit,
    gunneryByUnit,
    pilotingByUnit,
    tonnageByUnit,
  };
}

export function gameUnitsWithAdaptedMovementModes(
  gameUnits: readonly IGameUnit[],
  playerUnits: readonly IAdaptedUnit[],
  opponentUnits: readonly IAdaptedUnit[],
): readonly IGameUnit[] {
  const movementModeByUnit = new Map(
    [...playerUnits, ...opponentUnits].map((unit) => [
      unit.id,
      unit.movementMode,
    ]),
  );

  return gameUnits.map((unit) => {
    const movementMode = movementModeByUnit.get(unit.id);
    if (!movementMode || unit.movementMode === movementMode) return unit;
    return { ...unit, movementMode };
  });
}

/**
 * Assemble the `IGameConfig` from the raw constructor arguments and the
 * campaign linkage. The Wave 5 round-trip identifiers are stamped onto
 * the config so any later consumer of `IGameSession` (review UI,
 * persistence layer) can read them without keeping a parallel map.
 */
export function buildInteractiveSessionGameConfig(
  mapRadius: number,
  turnLimit: number,
  linkage: IInteractiveSessionLinkage,
  optionalRules: readonly string[] = [],
): IGameConfig {
  return {
    mapRadius,
    turnLimit,
    victoryConditions: ['elimination'],
    optionalRules: [...optionalRules],
    encounterId: linkage.encounterId ?? null,
    campaignId: linkage.campaignId ?? null,
    contractId: linkage.contractId ?? null,
    scenarioId: linkage.scenarioId ?? null,
  };
}
