import { parseMegaMekBoard } from '@/lib/parsers/megaMekBoard';
import { GyroType } from '@/types/construction/GyroType';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TerrainType,
  type IComponentDamageState,
  type IHex,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
  type IUnitGameState,
  type LightCondition,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';
import {
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
} from '@/utils/gameplay/movement/reachable';
import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
} from '@/utils/gameplay/movement/runtimeCapability';
import { validateMovement } from '@/utils/gameplay/movement/validation';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

export type {
  IComponentDamageState,
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IUnitGameState,
  LightCondition,
};

export {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON,
  Facing,
  GameSide,
  GroundMotionType,
  GyroType,
  LockState,
  MovementType,
  TerrainType,
  coordToKey,
  createAerospaceCombatState,
  createEnvironmentalConditions,
  createHexGrid,
  createVehicleCombatState,
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
  terrainStringFromFeatures,
  validateCommittedMovement,
  validateMovement,
};

export function makeUnitAtOrigin(): IUnitGameState {
  return {
    id: 'u1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    piloting: 5,
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

export function makeComponentDamage(
  overrides: Partial<IComponentDamageState> = {},
): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
    ...overrides,
  };
}

export function setHex(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: string,
  elevation = 0,
): IHexGrid {
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) throw new Error(`Missing test hex ${key}`);
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, terrain, elevation });
  return { ...grid, hexes };
}

export function gridFromParsedBoard(content: string): IHexGrid {
  const parsedBoard = parseMegaMekBoard(content);
  const hexes = new Map<string, IHex>();

  for (const parsedHex of parsedBoard.hexes) {
    hexes.set(coordToKey(parsedHex.coordinate), {
      coord: parsedHex.coordinate,
      occupantId: null,
      terrain: terrainStringFromFeatures(parsedHex.features),
      elevation: parsedHex.elevation,
    });
  }

  return {
    config: { radius: Math.max(parsedBoard.width, parsedBoard.height) },
    hexes,
  };
}

export function setOccupant(
  grid: IHexGrid,
  coord: IHexCoordinate,
  occupantId: string,
): IHexGrid {
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) throw new Error(`Missing test hex ${key}`);
  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...hex, occupantId });
  return { ...grid, hexes };
}
