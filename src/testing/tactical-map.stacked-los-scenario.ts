import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type {
  ICombatRangeHex,
  IGameState,
  IHexGrid,
  IHexTerrain,
  IUnitToken,
} from '@/types/gameplay';

import {
  Facing,
  GameSide,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  requireCombatProjection,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import {
  tacticalMapCombatState,
  tacticalMapTokens,
} from './tactical-map.fixtures';

const tacticalMapStackedLosAttackerHex = { q: 0, r: 0 } as const;
const tacticalMapStackedLosBlockerHex = { q: 1, r: 0 } as const;
export const tacticalMapStackedLosTargetId = 'stacked-los-target';
export const tacticalMapStackedLosTargetHex = { q: 2, r: 0 } as const;
export const tacticalMapStackedLosSelectedWeaponIds = ['medium-laser'];

export const tacticalMapStackedLosHexTerrain: readonly IHexTerrain[] = [
  {
    coordinate: tacticalMapStackedLosBlockerHex,
    elevation: 0,
    features: [
      { type: TerrainType.HeavyWoods, level: 2 },
      { type: TerrainType.Smoke, level: 1 },
    ],
  },
];

export const tacticalMapStackedLosTokens: readonly IUnitToken[] =
  tacticalMapTokens
    .filter(
      (token) =>
        token.unitId === 'attacker' || token.unitId === 'blocked-target',
    )
    .map((token): IUnitToken => {
      if (token.unitId === 'attacker') {
        return {
          ...token,
          position: tacticalMapStackedLosAttackerHex,
          facing: Facing.Southeast,
        };
      }

      return {
        ...token,
        unitId: tacticalMapStackedLosTargetId,
        name: 'Locust LCT-1V',
        designation: 'LCT',
        position: tacticalMapStackedLosTargetHex,
        facing: Facing.North,
        side: GameSide.Opponent,
        isSelected: false,
        isValidTarget: true,
        isActiveTarget: true,
        unitType: TokenUnitType.Mech,
      };
    });

export const tacticalMapStackedLosCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    attacker: {
      ...tacticalMapCombatState.units.attacker,
      position: tacticalMapStackedLosAttackerHex,
      facing: Facing.Southeast,
      movementThisTurn: MovementType.Stationary,
    },
    [tacticalMapStackedLosTargetId]: {
      ...tacticalMapCombatState.units['blocked-target'],
      id: tacticalMapStackedLosTargetId,
      side: GameSide.Opponent,
      position: tacticalMapStackedLosTargetHex,
      facing: Facing.North,
      movementThisTurn: MovementType.Stationary,
    },
  },
};

function tacticalMapStackedLosGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapStackedLosHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map fixture hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

const tacticalMapStackedLosAttacker = tacticalMapStackedLosTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapStackedLosAttacker) {
  throw new Error('Missing tactical-map stacked LOS attacker token');
}

export const tacticalMapStackedLosCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapStackedLosAttacker,
      targetUnitId: tacticalMapStackedLosTargetId,
      hexes: Array.from(
        tacticalMapStackedLosGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapStackedLosGrid(),
      tokens: tacticalMapStackedLosTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapStackedLosSelectedWeaponIds,
      ),
      combatState: tacticalMapStackedLosCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapStackedLosTargetHex.q &&
        projection.hex.r === tacticalMapStackedLosTargetHex.r,
    ),
  );

export function tacticalMapStackedLosCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapStackedLosTokens,
      combatState: tacticalMapStackedLosCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapStackedLosTargetId,
    weaponIds: tacticalMapStackedLosSelectedWeaponIds,
    grid: tacticalMapStackedLosGrid(),
  };
}
