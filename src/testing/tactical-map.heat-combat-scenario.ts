import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type {
  ICombatRangeHex,
  IGameState,
  IHexGrid,
  IHexTerrain,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import { Facing, GameSide, MovementType, TerrainType } from '@/types/gameplay';
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
  return createTacticalMapTerrainGrid(tacticalMapHeatCombatHexTerrain, {
    missingHexLabel: 'tactical-map heat-combat fixture',
  });
}

const tacticalMapHeatAttackerState: IUnitGameState = createTacticalMapUnitState(
  {
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapHeatAttackerHex,
    facing: Facing.Southeast,
    heat: 13,
    prone: false,
    shutdown: false,
    gunnery: 4,
  },
);

const tacticalMapHeatTargetState: IUnitGameState = createTacticalMapUnitState({
  id: tacticalMapHeatCombatTargetId,
  side: GameSide.Opponent,
  position: tacticalMapHeatTargetHex,
  facing: Facing.North,
  prone: false,
  shutdown: false,
});

export const tacticalMapHeatCombatTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Overheated Shadow Hawk SHD-2H',
      designation: 'HOT',
      position: tacticalMapHeatAttackerHex,
      facing: Facing.Southeast,
    },
    'blocked-target': {
      unitId: tacticalMapHeatCombatTargetId,
      name: 'Cool Locust LCT-1V',
      designation: 'COOL',
      position: tacticalMapHeatTargetHex,
      isActiveTarget: true,
    },
    occluded: {
      position: { q: -3, r: 3 },
      isActiveTarget: false,
      isValidTarget: false,
    },
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
