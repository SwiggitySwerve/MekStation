import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type {
  ICombatRangeHex,
  IGameState,
  IHexGrid,
  IHexTerrain,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import { Facing, GameSide, TerrainType } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import {
  createTacticalMapTerrainGrid,
  createTacticalMapUnitState,
  overrideTacticalMapTokens,
} from './tactical-map.fixture-helpers';
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
  return createTacticalMapTerrainGrid(tacticalMapProneCombatHexTerrain, {
    missingHexLabel: 'tactical-map prone-combat fixture',
  });
}

const tacticalMapProneAttackerState: IUnitGameState =
  createTacticalMapUnitState({
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapProneAttackerHex,
    facing: Facing.Southeast,
    prone: true,
    gunnery: 4,
  });

const tacticalMapProneTargetState: IUnitGameState = createTacticalMapUnitState({
  id: tacticalMapProneCombatTargetId,
  side: GameSide.Opponent,
  position: tacticalMapProneTargetHex,
  facing: Facing.North,
  prone: true,
});

export const tacticalMapProneCombatTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Prone Shadow Hawk SHD-2H',
      designation: 'PRN',
      position: tacticalMapProneAttackerHex,
      facing: Facing.Southeast,
    },
    'blocked-target': {
      unitId: tacticalMapProneCombatTargetId,
      name: 'Prone Locust LCT-1V',
      designation: 'P-LCT',
      position: tacticalMapProneTargetHex,
      isActiveTarget: true,
    },
    occluded: {
      position: { q: -3, r: 3 },
      isActiveTarget: false,
      isValidTarget: false,
    },
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
