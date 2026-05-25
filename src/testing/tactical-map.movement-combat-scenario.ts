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

export const tacticalMapMovementCombatTargetId = 'moving-target';
export const tacticalMapMovementCombatSelectedWeaponIds = ['medium-laser'];

const tacticalMapMovementAttackerHex = { q: 0, r: 0 } as const;
const tacticalMapMovementInterveningHex = { q: 1, r: 0 } as const;
const tacticalMapMovementTargetHex = { q: 2, r: 0 } as const;

function isMovementCombatTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapMovementAttackerHex.q &&
      r === tacticalMapMovementAttackerHex.r) ||
    (q === tacticalMapMovementInterveningHex.q &&
      r === tacticalMapMovementInterveningHex.r) ||
    (q === tacticalMapMovementTargetHex.q &&
      r === tacticalMapMovementTargetHex.r)
  );
}

export const tacticalMapMovementCombatHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isMovementCombatTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapMovementAttackerHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapMovementInterveningHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapMovementTargetHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapMovementCombatGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapMovementCombatHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) {
      throw new Error(
        `Missing tactical-map movement-combat fixture hex ${key}`,
      );
    }
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

const tacticalMapMovementAttackerState: IUnitGameState = {
  id: 'attacker',
  side: GameSide.Player,
  position: tacticalMapMovementAttackerHex,
  facing: Facing.Southeast,
  heat: 0,
  movementThisTurn: MovementType.Run,
  hexesMovedThisTurn: 4,
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

const tacticalMapMovementTargetState: IUnitGameState = {
  id: tacticalMapMovementCombatTargetId,
  side: GameSide.Opponent,
  position: tacticalMapMovementTargetHex,
  facing: Facing.North,
  heat: 0,
  movementThisTurn: MovementType.Run,
  hexesMovedThisTurn: 5,
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

export const tacticalMapMovementCombatTokens: readonly IUnitToken[] =
  tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        name: 'Running Shadow Hawk SHD-2H',
        designation: 'RUN',
        position: tacticalMapMovementAttackerHex,
        facing: Facing.Southeast,
      };
    }
    if (token.unitId === 'blocked-target') {
      return {
        ...token,
        unitId: tacticalMapMovementCombatTargetId,
        name: 'Moving Locust LCT-1V',
        designation: 'TMM',
        position: tacticalMapMovementTargetHex,
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

export const tacticalMapMovementCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    attacker: tacticalMapMovementAttackerState,
    [tacticalMapMovementCombatTargetId]: tacticalMapMovementTargetState,
  },
};

const tacticalMapMovementCombatGridFixture = tacticalMapMovementCombatGrid();

export const tacticalMapMovementCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapMovementCombatTokens.find(
        (token) => token.unitId === 'attacker',
      )!,
      targetUnitId: tacticalMapMovementCombatTargetId,
      hexes: Array.from(
        tacticalMapMovementCombatGridFixture.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapMovementCombatGridFixture,
      tokens: tacticalMapMovementCombatTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapMovementCombatSelectedWeaponIds,
      ),
      combatState: tacticalMapMovementCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapMovementTargetHex.q &&
        projection.hex.r === tacticalMapMovementTargetHex.r,
    ),
  );

export function tacticalMapMovementCombatCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapMovementCombatTokens,
      combatState: tacticalMapMovementCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapMovementCombatTargetId,
    weaponIds: tacticalMapMovementCombatSelectedWeaponIds,
    grid: tacticalMapMovementCombatGridFixture,
  };
}
