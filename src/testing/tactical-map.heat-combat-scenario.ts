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

export const tacticalMapHeatCombatTargetId = 'heat-target';
export const tacticalMapHeatCombatSelectedWeaponIds = ['medium-laser'];

const tacticalMapHeatAttackerHex = { q: 0, r: 0 } as const;
const tacticalMapHeatInterveningHex = { q: 1, r: 0 } as const;
const tacticalMapHeatTargetHex = { q: 2, r: 0 } as const;

function isHeatCombatTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapHeatAttackerHex.q &&
      r === tacticalMapHeatAttackerHex.r) ||
    (q === tacticalMapHeatInterveningHex.q &&
      r === tacticalMapHeatInterveningHex.r) ||
    (q === tacticalMapHeatTargetHex.q && r === tacticalMapHeatTargetHex.r)
  );
}

export const tacticalMapHeatCombatHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isHeatCombatTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapHeatAttackerHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapHeatInterveningHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapHeatTargetHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapHeatCombatGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapHeatCombatHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) {
      throw new Error(`Missing tactical-map heat-combat fixture hex ${key}`);
    }
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

const tacticalMapHeatAttackerState: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapHeatAttackerHex,
  facing: Facing.Southeast,
  heat: 13,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  prone: false,
  armor: {},
  structure: {},
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
  shutdown: false,
  lockState: LockState.Pending,
  gunnery: 4,
};

const tacticalMapHeatTargetState: IUnitGameState = {
  id: tacticalMapHeatCombatTargetId,
  side: GameSide.Opponent,
  position: tacticalMapHeatTargetHex,
  facing: Facing.North,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  prone: false,
  armor: {},
  structure: {},
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
  shutdown: false,
  lockState: LockState.Pending,
};

export const tacticalMapHeatCombatTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Overheated Shadow Hawk SHD-2H',
        designation: 'HOT',
        position: tacticalMapHeatAttackerHex,
        facing: Facing.Southeast,
      };
    }
    if (token.unitId === 'blocked-target') {
      return {
        ...token,
        unitId: tacticalMapHeatCombatTargetId,
        name: 'Cool Locust LCT-1V',
        designation: 'COOL',
        position: tacticalMapHeatTargetHex,
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

export const tacticalMapHeatCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    attacker: tacticalMapHeatAttackerState,
    [tacticalMapHeatCombatTargetId]: tacticalMapHeatTargetState,
  },
};

const tacticalMapHeatCombatGridFixture = tacticalMapHeatCombatGrid();

export const tacticalMapHeatCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapHeatCombatTokens.find(
        (token) => token.unitId === 'attacker',
      )!,
      targetUnitId: tacticalMapHeatCombatTargetId,
      hexes: Array.from(
        tacticalMapHeatCombatGridFixture.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapHeatCombatGridFixture,
      tokens: tacticalMapHeatCombatTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapHeatCombatSelectedWeaponIds,
      ),
      combatState: tacticalMapHeatCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapHeatTargetHex.q &&
        projection.hex.r === tacticalMapHeatTargetHex.r,
    ),
  );

export function tacticalMapHeatCombatCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapHeatCombatTokens,
      combatState: tacticalMapHeatCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapHeatCombatTargetId,
    weaponIds: tacticalMapHeatCombatSelectedWeaponIds,
    grid: tacticalMapHeatCombatGridFixture,
  };
}
