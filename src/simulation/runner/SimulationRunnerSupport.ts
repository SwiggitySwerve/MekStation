import {
  Facing,
  GameSide,
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitGameState,
  LockState,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';

import type { IAIUnitState, IWeapon } from '../ai/types';

import {
  MEDIUM_LASER_DAMAGE,
  MEDIUM_LASER_HEAT,
  MEDIUM_LASER_LONG_RANGE,
  MEDIUM_LASER_MEDIUM_RANGE,
  MEDIUM_LASER_SHORT_RANGE,
  DEFAULT_GUNNERY,
  DEFAULT_PILOTING,
  DEFAULT_COMPONENT_DAMAGE,
  BASE_HEAT_SINKS,
} from './SimulationRunnerConstants';

export function getRangeBracket(
  distance: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
  extremeRange?: number,
): RangeBracket {
  if (distance <= shortRange) return RangeBracket.Short;
  if (distance <= mediumRange) return RangeBracket.Medium;
  if (distance <= longRange) return RangeBracket.Long;
  if (extremeRange !== undefined && distance <= extremeRange) {
    return RangeBracket.Extreme;
  }
  return RangeBracket.OutOfRange;
}

export function createMinimalGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }

  return {
    config: { radius },
    hexes,
  };
}

export function createMinimalWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: MEDIUM_LASER_SHORT_RANGE,
    mediumRange: MEDIUM_LASER_MEDIUM_RANGE,
    longRange: MEDIUM_LASER_LONG_RANGE,
    damage: MEDIUM_LASER_DAMAGE,
    heat: MEDIUM_LASER_HEAT,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

export function createMinimalUnitState(
  id: string,
  side: GameSide,
  position: IHexCoordinate,
): IUnitGameState {
  return {
    id,
    unitType: 'BattleMech',
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: BASE_HEAT_SINKS,
    heatSinkType: 'single',
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    hasRetreated: false,
    hasEjected: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
  };
}

/**
 * Convert an `IUnitGameState` into the AI snapshot. When `hydratedWeapons`
 * is provided (Phase 1 of `add-combat-fidelity-suite` — catalog hydration),
 * the AI sees the real per-mount weapon list resolved from `IFullUnit`. When
 * omitted, the legacy synthetic single-medium-laser is used so preset / non-
 * swarm callers (and existing tests) stay green without a sweep.
 *
 * The `hydratedWeapons` decision lever is intentionally explicit at every
 * callsite — phases (`weaponAttack`, `movement`) thread a per-unit weapons
 * map and pass `weaponsByUnit.get(unit.id)` per call. Tests that don't care
 * about hydration omit the argument and get the synthetic fallback.
 */
export function toAIUnitState(
  unit: IUnitGameState,
  hydratedWeapons?: readonly IWeapon[],
): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons:
      hydratedWeapons && hydratedWeapons.length > 0
        ? hydratedWeapons
        : [createMinimalWeapon(`${unit.id}-weapon-1`)],
    ammo: {},
    destroyed:
      unit.destroyed || unit.hasRetreated === true || unit.hasEjected === true,
    // Phase 1 of `add-encounter-swarm-harness`: read real pilot skills from
    // IUnitGameState so randomized pilot generation is meaningful. Defaults
    // remain as fallback for synthetic-unit construction paths that do not
    // populate skills (e.g. fixture builders in older tests).
    gunnery: unit.gunnery ?? DEFAULT_GUNNERY,
    piloting: unit.piloting ?? DEFAULT_PILOTING,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
  };
}

export function toCatalogAIUnitState(
  unit: IUnitGameState,
  hydratedWeapons: readonly IWeapon[],
): IAIUnitState {
  if (hydratedWeapons.length === 0) {
    throw new Error(
      `Catalog-hydrated AI unit "${unit.id}" has no weapons; refusing synthetic Medium Laser fallback`,
    );
  }
  return toAIUnitState(unit, hydratedWeapons);
}

export function createMovementCapability(): IMovementCapability {
  return {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}
