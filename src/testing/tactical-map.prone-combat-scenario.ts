import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type {
  ICombatRangeHex,
  IGameState,
  IHexGrid,
  IHexTerrain,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  TerrainType,
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
  tacticalMapHexTerrain,
  tacticalMapTokens,
} from './tactical-map.fixtures';

export const tacticalMapProneCombatTargetId = 'prone-target';
export const tacticalMapProneCombatSelectedWeaponIds = ['medium-laser'];

const tacticalMapProneAttackerHex = { q: 0, r: 0 } as const;
const tacticalMapProneInterveningHex = { q: 1, r: 0 } as const;
const tacticalMapProneTargetHex = { q: 2, r: 0 } as const;

function isProneCombatTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapProneAttackerHex.q &&
      r === tacticalMapProneAttackerHex.r) ||
    (q === tacticalMapProneInterveningHex.q &&
      r === tacticalMapProneInterveningHex.r) ||
    (q === tacticalMapProneTargetHex.q && r === tacticalMapProneTargetHex.r)
  );
}

export const tacticalMapProneCombatHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isProneCombatTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapProneAttackerHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapProneInterveningHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapProneTargetHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapProneCombatGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapProneCombatHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) {
      throw new Error(`Missing tactical-map prone-combat fixture hex ${key}`);
    }
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

const tacticalMapProneAttackerState: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapProneAttackerHex,
  facing: Facing.Southeast,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  prone: true,
  armor: {},
  structure: {},
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
  lockState: LockState.Pending,
  gunnery: 4,
};

const tacticalMapProneTargetState: IUnitGameState = {
  id: tacticalMapProneCombatTargetId,
  side: GameSide.Opponent,
  position: tacticalMapProneTargetHex,
  facing: Facing.North,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  prone: true,
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

export const tacticalMapProneCombatTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Prone Shadow Hawk SHD-2H',
        designation: 'PRN',
        position: tacticalMapProneAttackerHex,
        facing: Facing.Southeast,
      };
    }
    if (token.unitId === 'blocked-target') {
      return {
        ...token,
        unitId: tacticalMapProneCombatTargetId,
        name: 'Prone Locust LCT-1V',
        designation: 'P-LCT',
        position: tacticalMapProneTargetHex,
        isActiveTarget: true,
      };
    }
    if (token.unitId === 'occluded') {
      return {
        ...token,
        position: { q: -3, r: 3 },
        isActiveTarget: false,
        isValidTarget: false,
      };
    }
    return token;
  });

export const tacticalMapProneCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    attacker: tacticalMapProneAttackerState,
    [tacticalMapProneCombatTargetId]: tacticalMapProneTargetState,
  },
};

export const tacticalMapProneCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapProneCombatTokens.find(
        (token) => token.unitId === 'attacker',
      )!,
      targetUnitId: tacticalMapProneCombatTargetId,
      hexes: Array.from(
        tacticalMapProneCombatGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapProneCombatGrid(),
      tokens: tacticalMapProneCombatTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapProneCombatSelectedWeaponIds,
      ),
      combatState: tacticalMapProneCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapProneTargetHex.q &&
        projection.hex.r === tacticalMapProneTargetHex.r,
    ),
  );

export function tacticalMapProneCombatCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapProneCombatTokens,
      combatState: tacticalMapProneCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapProneCombatTargetId,
    weaponIds: tacticalMapProneCombatSelectedWeaponIds,
    grid: tacticalMapProneCombatGrid(),
  };
}
