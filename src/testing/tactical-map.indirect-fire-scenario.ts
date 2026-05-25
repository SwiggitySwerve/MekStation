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

const tacticalMapIndirectFireAttackerHex = { q: 0, r: 0 } as const;
const tacticalMapIndirectFireSpotterId = 'indirect-spotter';
const tacticalMapIndirectFireSpotterHex = { q: 3, r: -1 } as const;
export const tacticalMapIndirectFireTargetId = 'indirect-target';
export const tacticalMapIndirectFireTargetHex = { q: 3, r: 0 } as const;
export const tacticalMapIndirectFireSelectedWeaponIds = ['minimum-lrm'];

export const tacticalMapIndirectFireHexTerrain: readonly IHexTerrain[] = [
  {
    coordinate: { q: 1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
  {
    coordinate: { q: 2, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
];

const tacticalMapIndirectFireAttackerToken: IUnitToken = {
  ...tacticalMapTokens[0],
  position: tacticalMapIndirectFireAttackerHex,
  facing: Facing.Southeast,
};

const tacticalMapIndirectFireSpotterToken: IUnitToken = {
  unitId: tacticalMapIndirectFireSpotterId,
  name: 'Raven RVN-3L',
  designation: 'RVN',
  position: tacticalMapIndirectFireSpotterHex,
  facing: Facing.Southwest,
  side: GameSide.Player,
  isDestroyed: false,
  isSelected: false,
  isValidTarget: false,
  unitType: TokenUnitType.Mech,
};

const tacticalMapIndirectFireTargetToken: IUnitToken = {
  unitId: tacticalMapIndirectFireTargetId,
  name: 'Locust LCT-1V',
  designation: 'LCT',
  position: tacticalMapIndirectFireTargetHex,
  facing: Facing.North,
  side: GameSide.Opponent,
  isDestroyed: false,
  isSelected: false,
  isValidTarget: true,
  isActiveTarget: true,
  unitType: TokenUnitType.Mech,
};

export const tacticalMapIndirectFireTokens: readonly IUnitToken[] = [
  tacticalMapIndirectFireAttackerToken,
  tacticalMapIndirectFireSpotterToken,
  tacticalMapIndirectFireTargetToken,
];

export const tacticalMapIndirectFireCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    attacker: {
      ...tacticalMapCombatState.units.attacker,
      position: tacticalMapIndirectFireAttackerHex,
      facing: Facing.Southeast,
      movementThisTurn: MovementType.Stationary,
    },
    [tacticalMapIndirectFireSpotterId]: {
      ...tacticalMapCombatState.units.attacker,
      id: tacticalMapIndirectFireSpotterId,
      side: GameSide.Player,
      position: tacticalMapIndirectFireSpotterHex,
      facing: Facing.Southwest,
      movementThisTurn: MovementType.Stationary,
    },
    [tacticalMapIndirectFireTargetId]: {
      ...tacticalMapCombatState.units['blocked-target'],
      id: tacticalMapIndirectFireTargetId,
      side: GameSide.Opponent,
      position: tacticalMapIndirectFireTargetHex,
      facing: Facing.North,
      movementThisTurn: MovementType.Stationary,
    },
  },
};

function tacticalMapIndirectFireGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapIndirectFireHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map indirect hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

export const tacticalMapIndirectFireCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapIndirectFireAttackerToken,
      targetUnitId: tacticalMapIndirectFireTargetId,
      hexes: Array.from(
        tacticalMapIndirectFireGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapIndirectFireGrid(),
      tokens: tacticalMapIndirectFireTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapIndirectFireSelectedWeaponIds,
      ),
      combatState: tacticalMapIndirectFireCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapIndirectFireTargetHex.q &&
        projection.hex.r === tacticalMapIndirectFireTargetHex.r,
    ),
  );

export function tacticalMapIndirectFireCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapIndirectFireTokens,
      combatState: tacticalMapIndirectFireCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapIndirectFireTargetId,
    weaponIds: tacticalMapIndirectFireSelectedWeaponIds,
    grid: tacticalMapIndirectFireGrid(),
  };
}
