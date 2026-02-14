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
  DEFAULT_COMPONENT_DAMAGE,
} from './SimulationRunnerConstants';

export function getRangeBracket(
  distance: number,
  shortRange: number,
  mediumRange: number,
  longRange: number,
): RangeBracket {
  if (distance <= shortRange) return RangeBracket.Short;
  if (distance <= mediumRange) return RangeBracket.Medium;
  if (distance <= longRange) return RangeBracket.Long;
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
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
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
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
  };
}

export function toAIUnitState(unit: IUnitGameState): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons: [createMinimalWeapon(`${unit.id}-weapon-1`)],
    ammo: {},
    destroyed: unit.destroyed,
    gunnery: DEFAULT_GUNNERY,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
  };
}

export function createMovementCapability(): IMovementCapability {
  return {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}
