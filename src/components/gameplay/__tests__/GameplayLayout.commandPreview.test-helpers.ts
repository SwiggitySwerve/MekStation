import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  RangeBracket,
  TerrainType,
  TokenUnitType,
  type IGameState,
  type IGameUnit,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementRangeHex,
  type IUnitGameState,
  type IUnitToken,
  type IWeaponStatus,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import { buildCommandPreviewInputs } from '../GameplayLayout.commandPreview';

function makeUnitState({
  id,
  side,
  position,
}: {
  readonly id: string;
  readonly side: GameSide;
  readonly position: IHexCoordinate;
}): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.Southeast,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery: 4,
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

function makeState(overrides: Partial<IGameState> = {}): IGameState {
  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: {
      a1: makeUnitState({
        id: 'a1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
      }),
      t1: makeUnitState({
        id: 't1',
        side: GameSide.Opponent,
        position: { q: 2, r: 0 },
      }),
    },
    turnEvents: [],
    ...overrides,
  };
}

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeUnitBinding(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'a1',
    name: 'Attacker',
    side: GameSide.Player,
    unitRef: 'attacker-ref',
    pilotRef: 'pilot-a',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  } as IGameUnit;
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 2, medium: 4, long: 6 },
    ...overrides,
  };
}

function gridWithTerrain(
  coord: IHexCoordinate,
  terrain: string,
  radius = 3,
): IHexGrid {
  const grid = createMinimalGrid(radius);
  const key = coordToKey(coord);
  const hex = grid.hexes.get(key);
  if (!hex) {
    throw new Error(`test grid missing hex ${key}`);
  }
  return {
    ...grid,
    hexes: new Map(grid.hexes).set(key, { ...hex, terrain }),
  };
}

export {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  RangeBracket,
  TerrainType,
  TokenUnitType,
  UnitType,
  buildCommandPreviewInputs,
  coordToKey,
  createMinimalGrid,
  gridWithTerrain,
  makeState,
  makeToken,
  makeUnitBinding,
  makeUnitState,
  makeWeapon,
  terrainStringFromFeatures,
};

export type {
  IGameState,
  IGameUnit,
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
  IUnitGameState,
  IUnitToken,
  IWeaponStatus,
};
