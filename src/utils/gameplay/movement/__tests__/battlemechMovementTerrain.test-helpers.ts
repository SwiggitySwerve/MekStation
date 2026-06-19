import type { UnitMovementType } from '@/utils/gameplay/movement/types';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
  type IUnitGameState,
  type IUnitPosition,
} from '@/types/gameplay';
import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  canStand,
  calculateAttackerMovementModifier,
  calculateManeuveringAceBipedLateralShiftCost,
  calculateManeuveringAceQuadLateralStepCost,
  calculateMovementHeat,
  calculateTMM,
  deriveReachableHexes,
  findPath,
  getHexMovementCost,
  getStandingCost,
  getValidDestinations,
  maneuveringAceLateralShiftDirection,
  validateMovement,
} from '@/utils/gameplay/movement';
import {
  assertMovementStepConservation,
  decomposeMovementSteps,
} from '@/utils/gameplay/movement/eventPath';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

export type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitGameState,
  IUnitPosition,
  UnitMovementType,
};

export {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TERRAIN_PROPERTIES,
  TerrainType,
  assertMovementStepConservation,
  calculateAttackerMovementModifier,
  calculateManeuveringAceBipedLateralShiftCost,
  calculateManeuveringAceQuadLateralStepCost,
  calculateMovementHeat,
  calculateTMM,
  canStand,
  coordToKey,
  createHexGrid,
  decomposeMovementSteps,
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
  findPath,
  getHexMovementCost,
  getStandingCost,
  getValidDestinations,
  maneuveringAceLateralShiftDirection,
  terrainStringFromFeatures,
  validateMovement,
};

export function setHex(
  grid: IHexGrid,
  coord: IHexCoordinate,
  overrides: {
    readonly terrain?: TerrainType;
    readonly elevation?: number;
    readonly occupantId?: string | null;
  },
): IHexGrid {
  const key = coordToKey(coord);
  const existingHex = grid.hexes.get(key);
  if (!existingHex) {
    throw new Error(`Hex at ${key} does not exist in grid`);
  }

  const hexes = new Map(grid.hexes);
  hexes.set(key, {
    ...existingHex,
    terrain: overrides.terrain ?? existingHex.terrain,
    elevation: overrides.elevation ?? existingHex.elevation,
    occupantId:
      overrides.occupantId === undefined
        ? existingHex.occupantId
        : overrides.occupantId,
  });
  return { ...grid, hexes };
}

export function positionAtOrigin(): IUnitPosition {
  return {
    unitId: 'atlas',
    coord: { q: 0, r: 0 },
    facing: Facing.North,
    prone: false,
  };
}

export function unitAtOrigin(): IUnitGameState {
  return {
    id: 'atlas',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

export const standardMove: IMovementCapability = {
  walkMP: 5,
  runMP: 8,
  jumpMP: 4,
};
