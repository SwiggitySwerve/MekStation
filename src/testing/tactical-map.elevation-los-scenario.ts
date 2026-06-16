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

const tacticalMapElevationLosAttackerHex = { q: 0, r: 0 } as const;
const tacticalMapElevationLosBlockerHex = { q: 1, r: 0 } as const;
const tacticalMapElevationCoverHex = { q: 1, r: -1 } as const;
const tacticalMapWoodsLosFirstBlockerHex = { q: 1, r: 0 } as const;
const tacticalMapWoodsLosSecondBlockerHex = { q: 2, r: 0 } as const;
export const tacticalMapElevationLosTargetId = 'elevation-blocked-target';
export const tacticalMapElevationLosTargetHex = { q: 2, r: 0 } as const;
export const tacticalMapElevationCoverTargetId = 'elevation-cover-target';
export const tacticalMapElevationCoverTargetHex = { q: 2, r: -2 } as const;
export const tacticalMapWoodsLosTargetId = 'woods-blocked-target';
export const tacticalMapWoodsLosTargetHex = { q: 3, r: 0 } as const;
export const tacticalMapElevationLosSelectedWeaponIds = ['medium-laser'];
export const tacticalMapWoodsLosSelectedWeaponIds = ['medium-laser'];

export const tacticalMapElevationLosHexTerrain: readonly IHexTerrain[] = [
  {
    coordinate: tacticalMapElevationLosBlockerHex,
    elevation: 2,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapElevationCoverHex,
    elevation: 1,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

export const tacticalMapWoodsLosHexTerrain: readonly IHexTerrain[] = [
  {
    coordinate: tacticalMapWoodsLosFirstBlockerHex,
    elevation: 0,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
  {
    coordinate: tacticalMapWoodsLosSecondBlockerHex,
    elevation: 0,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
];

const tacticalMapElevationLosBaseTokens: readonly IUnitToken[] =
  tacticalMapTokens
    .filter(
      (token) =>
        token.unitId === 'attacker' || token.unitId === 'blocked-target',
    )
    .map((token): IUnitToken => {
      if (token.unitId === 'attacker') {
        return {
          ...token,
          position: tacticalMapElevationLosAttackerHex,
          facing: Facing.Southeast,
        };
      }

      return {
        ...token,
        unitId: tacticalMapElevationLosTargetId,
        name: 'Locust LCT-1V',
        designation: 'LCT',
        position: tacticalMapElevationLosTargetHex,
        facing: Facing.North,
        side: GameSide.Opponent,
        isSelected: false,
        isValidTarget: true,
        isActiveTarget: true,
        unitType: TokenUnitType.Mech,
      };
    });

const tacticalMapElevationCoverTargetToken: IUnitToken = {
  unitId: tacticalMapElevationCoverTargetId,
  name: 'Wasp WSP-1A',
  designation: 'WSP',
  position: tacticalMapElevationCoverTargetHex,
  facing: Facing.North,
  side: GameSide.Opponent,
  isDestroyed: false,
  isSelected: false,
  isValidTarget: true,
  unitType: TokenUnitType.Mech,
};

export const tacticalMapElevationLosTokens: readonly IUnitToken[] = [
  ...tacticalMapElevationLosBaseTokens,
  tacticalMapElevationCoverTargetToken,
];

export const tacticalMapWoodsLosTokens: readonly IUnitToken[] =
  tacticalMapElevationLosBaseTokens.map((token): IUnitToken => {
    if (token.unitId === 'attacker') return token;

    return {
      ...token,
      unitId: tacticalMapWoodsLosTargetId,
      name: 'Locust LCT-1V',
      designation: 'LCT',
      position: tacticalMapWoodsLosTargetHex,
      facing: Facing.North,
      side: GameSide.Opponent,
      isSelected: false,
      isValidTarget: true,
      isActiveTarget: true,
      unitType: TokenUnitType.Mech,
    };
  });

export const tacticalMapElevationLosCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    attacker: {
      ...tacticalMapCombatState.units.attacker,
      position: tacticalMapElevationLosAttackerHex,
      facing: Facing.Southeast,
      movementThisTurn: MovementType.Stationary,
    },
    [tacticalMapElevationLosTargetId]: {
      ...tacticalMapCombatState.units['blocked-target'],
      id: tacticalMapElevationLosTargetId,
      side: GameSide.Opponent,
      position: tacticalMapElevationLosTargetHex,
      facing: Facing.North,
      movementThisTurn: MovementType.Stationary,
    },
    [tacticalMapElevationCoverTargetId]: {
      ...tacticalMapCombatState.units['blocked-target'],
      id: tacticalMapElevationCoverTargetId,
      side: GameSide.Opponent,
      position: tacticalMapElevationCoverTargetHex,
      facing: Facing.North,
      movementThisTurn: MovementType.Stationary,
    },
  },
};

export const tacticalMapWoodsLosCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    attacker: {
      ...tacticalMapCombatState.units.attacker,
      position: tacticalMapElevationLosAttackerHex,
      facing: Facing.Southeast,
      movementThisTurn: MovementType.Stationary,
    },
    [tacticalMapWoodsLosTargetId]: {
      ...tacticalMapCombatState.units['blocked-target'],
      id: tacticalMapWoodsLosTargetId,
      side: GameSide.Opponent,
      position: tacticalMapWoodsLosTargetHex,
      facing: Facing.North,
      movementThisTurn: MovementType.Stationary,
    },
  },
};

function tacticalMapElevationLosGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapElevationLosHexTerrain) {
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

function tacticalMapWoodsLosGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapWoodsLosHexTerrain) {
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

const tacticalMapElevationLosAttacker = tacticalMapElevationLosTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapElevationLosAttacker) {
  throw new Error('Missing tactical-map elevation LOS attacker token');
}

const tacticalMapWoodsLosAttacker = tacticalMapWoodsLosTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapWoodsLosAttacker) {
  throw new Error('Missing tactical-map woods LOS attacker token');
}

export const tacticalMapElevationLosCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapElevationLosAttacker,
      targetUnitId: tacticalMapElevationLosTargetId,
      hexes: Array.from(
        tacticalMapElevationLosGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapElevationLosGrid(),
      tokens: tacticalMapElevationLosTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapElevationLosSelectedWeaponIds,
      ),
      combatState: tacticalMapElevationLosCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapElevationLosTargetHex.q &&
        projection.hex.r === tacticalMapElevationLosTargetHex.r,
    ),
  );

export const tacticalMapElevationCoverCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapElevationLosAttacker,
      targetUnitId: tacticalMapElevationCoverTargetId,
      hexes: Array.from(
        tacticalMapElevationLosGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapElevationLosGrid(),
      tokens: tacticalMapElevationLosTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapElevationLosSelectedWeaponIds,
      ),
      combatState: tacticalMapElevationLosCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapElevationCoverTargetHex.q &&
        projection.hex.r === tacticalMapElevationCoverTargetHex.r,
    ),
  );

export const tacticalMapWoodsLosCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapWoodsLosAttacker,
      targetUnitId: tacticalMapWoodsLosTargetId,
      hexes: Array.from(
        tacticalMapWoodsLosGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapWoodsLosGrid(),
      tokens: tacticalMapWoodsLosTokens,
      weapons: tacticalMapSelectedWeapons(tacticalMapWoodsLosSelectedWeaponIds),
      combatState: tacticalMapWoodsLosCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapWoodsLosTargetHex.q &&
        projection.hex.r === tacticalMapWoodsLosTargetHex.r,
    ),
  );

export function tacticalMapElevationLosCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapElevationLosTokens,
      combatState: tacticalMapElevationLosCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapElevationLosTargetId,
    weaponIds: tacticalMapElevationLosSelectedWeaponIds,
    grid: tacticalMapElevationLosGrid(),
  };
}

export function tacticalMapWoodsLosCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapWoodsLosTokens,
      combatState: tacticalMapWoodsLosCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapWoodsLosTargetId,
    weaponIds: tacticalMapWoodsLosSelectedWeaponIds,
    grid: tacticalMapWoodsLosGrid(),
  };
}

export function tacticalMapElevationCoverCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapElevationLosTokens,
      combatState: tacticalMapElevationLosCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapElevationCoverTargetId,
    weaponIds: tacticalMapElevationLosSelectedWeaponIds,
    grid: tacticalMapElevationLosGrid(),
  };
}
