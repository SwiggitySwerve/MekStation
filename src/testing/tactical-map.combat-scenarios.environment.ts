import type { IGameState, IHexTerrain, IUnitToken } from '@/types/gameplay';

import {
  Facing,
  FiringArc,
  GameSide,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';

import { tacticalMapSelectedWeapons } from './tactical-map.combat-scenarios.core';
import {
  tacticalMapCombatState,
  tacticalMapUnitWeapons,
} from './tactical-map.fixtures';

export const tacticalMapUnderwaterEnvironmentTargetId = 'underwater-target';
export const tacticalMapUnderwaterEnvironmentSelectedWeaponIds = [
  'medium-laser',
  'lrt-15',
];

export const tacticalMapUnderwaterEnvironmentTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: { q: 0, r: 0 },
    facing: Facing.Northeast,
    side: GameSide.Player,
    isSelected: true,
    isValidTarget: false,
    isDestroyed: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: tacticalMapUnderwaterEnvironmentTargetId,
    name: 'Underwater Target',
    designation: 'UWT',
    position: { q: 2, r: 0 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    isDestroyed: false,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapUnderwaterEnvironmentHexTerrain: readonly IHexTerrain[] =
  [
    {
      coordinate: { q: 0, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Water, level: 1 }],
    },
    {
      coordinate: { q: 1, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Water, level: 1 }],
    },
    {
      coordinate: { q: 2, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Water, level: 2 }],
    },
  ];

export const tacticalMapUnderwaterEnvironmentCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: Object.fromEntries(
    tacticalMapUnderwaterEnvironmentTokens.map((token) => [
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

export const tacticalMapUnderwaterEnvironmentUnitWeapons: typeof tacticalMapUnitWeapons =
  {
    attacker: [
      ...tacticalMapSelectedWeapons(['medium-laser']),
      {
        id: 'lrt-15',
        name: 'LR Torpedo 15',
        location: 'left_torso',
        mountingArc: FiringArc.Front,
        mountingArcs: [
          FiringArc.Front,
          FiringArc.Left,
          FiringArc.Right,
          FiringArc.Rear,
        ],
        destroyed: false,
        firedThisTurn: false,
        heat: 5,
        damage: 9,
        ranges: { short: 7, medium: 14, long: 21 },
        isTorpedo: true,
      },
    ],
  };
