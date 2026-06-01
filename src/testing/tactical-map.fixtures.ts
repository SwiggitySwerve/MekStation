import type { MapMovementPointLegendState } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type {
  IGameState,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';

const ALL_WEAPON_ARCS: readonly FiringArc[] = [
  FiringArc.Front,
  FiringArc.Left,
  FiringArc.Right,
  FiringArc.Rear,
];

function weaponFixture({
  id,
  name,
  location,
  heat,
  damage,
  ranges,
}: {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly heat: number;
  readonly damage: number;
  readonly ranges: IWeaponStatus['ranges'];
}): IWeaponStatus {
  return {
    id,
    name,
    location,
    mountingArc: FiringArc.Front,
    mountingArcs: ALL_WEAPON_ARCS,
    destroyed: false,
    firedThisTurn: false,
    heat,
    damage,
    ranges,
  };
}

export const tacticalMapTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: { q: -1, r: 0 },
    facing: Facing.Northeast,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'occluded',
    name: 'Hunchback HBK-4G',
    designation: 'HBK',
    position: { q: 0, r: 0 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'blocked-target',
    name: 'Locust LCT-1V',
    designation: 'LCT',
    position: { q: 2, r: 0 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'medium-target',
    name: 'Wasp WSP-1A',
    designation: 'WSP',
    position: { q: 1, r: 2 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'water-cover-target',
    name: 'Commando COM-2D',
    designation: 'COM',
    position: { q: 0, r: 2 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'hidden-contact',
    name: 'Hidden Contact',
    designation: 'UNK',
    position: { q: -2, r: 1 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: false,
    fogStatus: 'hidden',
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'last-known-contact',
    name: 'Last Known Contact',
    designation: 'LKC',
    position: { q: -3, r: 1 },
    lastKnownPosition: { q: -1, r: 2 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: false,
    fogStatus: 'lastKnown',
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapHexTerrain: readonly IHexTerrain[] = [
  {
    coordinate: { q: 1, r: 0 },
    elevation: 4,
    features: [{ type: TerrainType.Building, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 0 },
    elevation: 5,
    features: [{ type: TerrainType.Building, level: 1 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: 1,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: -1,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
  {
    coordinate: { q: 1, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
  {
    coordinate: { q: 0, r: 2 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 1 }],
  },
];

export const tacticalMapUnitWeapons: Record<string, readonly IWeaponStatus[]> =
  {
    attacker: [
      weaponFixture({
        id: 'medium-laser',
        name: 'Medium Laser',
        location: 'right_arm',
        heat: 3,
        damage: 5,
        ranges: { short: 3, medium: 6, long: 9 },
      }),
      weaponFixture({
        id: 'small-laser',
        name: 'Small Laser',
        location: 'left_arm',
        heat: 1,
        damage: 3,
        ranges: { short: 1, medium: 2, long: 3 },
      }),
      weaponFixture({
        id: 'minimum-lrm',
        name: 'LRM Minimum Range Fixture',
        location: 'left_torso',
        heat: 2,
        damage: 5,
        ranges: { minimum: 2, short: 2, medium: 3, long: 3 },
      }),
      weaponFixture({
        id: 'extreme-lrm',
        name: 'LRM Extreme Range Fixture',
        location: 'right_torso',
        heat: 2,
        damage: 5,
        ranges: { short: 1, medium: 2, long: 3, extreme: 4 },
      }),
      weaponFixture({
        id: 'semi-guided-lrm-15',
        name: 'Semi-Guided LRM-15',
        location: 'left_torso',
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
      }),
    ],
  };

export const tacticalMapCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: Object.fromEntries(
    tacticalMapTokens.map((token) => [
      token.unitId,
      {
        id: token.unitId,
        side: token.side,
        position: token.position,
        facing: token.facing,
        heat: 0,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        prone: false,
        destroyed: token.isDestroyed,
        shutdown: false,
        hasRetreated: false,
        gunnery: 4,
      },
    ]),
  ) as IGameState['units'],
};

export const tacticalMapSelectedWeaponIds = [
  'medium-laser',
  'small-laser',
  'minimum-lrm',
  'extreme-lrm',
];

export const tacticalMapOutOfRangeSelectedWeaponIds = [
  'small-laser',
  'minimum-lrm',
];

export const tacticalMapMovementRange: readonly IMovementRangeHex[] = [
  {
    hex: { q: 0, r: 1 },
    mpCost: 3,
    terrainCost: 2,
    elevationDelta: 1,
    elevationCost: 1,
    heatGenerated: 0,
    movementMode: 'tracked',
    reachable: true,
    movementType: MovementType.Walk,
    path: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 0, r: 1 },
    ],
  },
  {
    hex: { q: 0, r: 1 },
    mpCost: 4,
    terrainCost: 2,
    elevationDelta: 1,
    elevationCost: 1,
    heatGenerated: 2,
    movementMode: 'tracked',
    reachable: true,
    movementType: MovementType.Run,
    path: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 0, r: 1 },
    ],
  },
  {
    hex: { q: 0, r: 1 },
    mpCost: 3,
    terrainCost: 0,
    elevationDelta: 1,
    elevationCost: 0,
    heatGenerated: 3,
    movementMode: 'jump',
    reachable: true,
    movementType: MovementType.Jump,
    path: [
      { q: -1, r: 0 },
      { q: 0, r: 1 },
    ],
  },
  {
    hex: { q: 1, r: 0 },
    mpCost: 4,
    terrainCost: 0,
    elevationDelta: 4,
    elevationCost: 0,
    heatGenerated: 3,
    movementMode: 'jump',
    reachable: false,
    movementType: MovementType.Jump,
    blockedReason: 'Jump elevation rise of 4 exceeds jump MP 3',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Jump elevation rise of 4 exceeds jump MP 3',
    path: [
      { q: -1, r: 0 },
      { q: 1, r: 0 },
    ],
  },
  {
    hex: { q: 2, r: 1 },
    mpCost: 5,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'biped',
    reachable: true,
    movementType: MovementType.Walk,
    path: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 2, r: 1 },
    ],
  },
  {
    hex: { q: 2, r: 1 },
    mpCost: 6,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 2,
    movementMode: 'biped',
    reachable: true,
    movementType: MovementType.Run,
    path: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 2, r: 1 },
    ],
  },
  {
    hex: { q: 2, r: 1 },
    mpCost: 4,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 3,
    movementMode: 'jump',
    reachable: false,
    movementType: MovementType.Jump,
    blockedReason: 'Jump path length 4 exceeds jump MP 3',
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Jump path length 4 exceeds jump MP 3',
    path: [
      { q: -1, r: 0 },
      { q: 2, r: 1 },
    ],
  },
];

export const tacticalMapHighlightPath: readonly IHexCoordinate[] = [
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 0, r: 1 },
];

export const tacticalMapMpLegend: MapMovementPointLegendState = {
  active: 'run',
  movementMode: 'tracked',
  walkMP: 4,
  runMP: 6,
  jumpMP: 3,
  jumpAvailable: true,
};
