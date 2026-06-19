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

export const tacticalMapImmobileCombatTargetId = 'shutdown-target';
export const tacticalMapImmobileCombatSelectedWeaponIds = ['medium-laser'];

const tacticalMapImmobileAttackerHex = { q: 0, r: 0 } as const;
const tacticalMapImmobileInterveningHex = { q: 1, r: 0 } as const;
const tacticalMapImmobileTargetHex = { q: 2, r: 0 } as const;

function isImmobileCombatTerrainOverride(terrain: IHexTerrain): boolean {
  const { q, r } = terrain.coordinate;
  return (
    (q === tacticalMapImmobileAttackerHex.q &&
      r === tacticalMapImmobileAttackerHex.r) ||
    (q === tacticalMapImmobileInterveningHex.q &&
      r === tacticalMapImmobileInterveningHex.r) ||
    (q === tacticalMapImmobileTargetHex.q &&
      r === tacticalMapImmobileTargetHex.r)
  );
}

export const tacticalMapImmobileCombatHexTerrain: readonly IHexTerrain[] = [
  ...tacticalMapHexTerrain.filter(
    (terrain) => !isImmobileCombatTerrainOverride(terrain),
  ),
  {
    coordinate: tacticalMapImmobileAttackerHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapImmobileInterveningHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: tacticalMapImmobileTargetHex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
];

function tacticalMapImmobileCombatGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapImmobileCombatHexTerrain, {
    missingHexLabel: 'tactical-map immobile-combat fixture',
  });
}

const tacticalMapImmobileAttackerState: IUnitGameState =
  createTacticalMapUnitState({
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapImmobileAttackerHex,
    facing: Facing.Southeast,
    prone: false,
    shutdown: false,
    gunnery: 4,
  });

const tacticalMapImmobileTargetState: IUnitGameState =
  createTacticalMapUnitState({
    id: tacticalMapImmobileCombatTargetId,
    side: GameSide.Opponent,
    position: tacticalMapImmobileTargetHex,
    facing: Facing.North,
    prone: false,
    shutdown: true,
  });

export const tacticalMapImmobileCombatTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Shadow Hawk SHD-2H',
      designation: 'SHD',
      position: tacticalMapImmobileAttackerHex,
      facing: Facing.Southeast,
    },
    'blocked-target': {
      unitId: tacticalMapImmobileCombatTargetId,
      name: 'Shutdown Locust LCT-1V',
      designation: 'SDN',
      position: tacticalMapImmobileTargetHex,
      isActiveTarget: true,
    },
    occluded: {
      position: { q: -3, r: 3 },
      isActiveTarget: false,
      isValidTarget: false,
    },
  });

export const tacticalMapImmobileCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    attacker: tacticalMapImmobileAttackerState,
    [tacticalMapImmobileCombatTargetId]: tacticalMapImmobileTargetState,
  },
};

const tacticalMapImmobileCombatGridFixture = tacticalMapImmobileCombatGrid();

export const tacticalMapImmobileCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapImmobileCombatTokens.find(
        (token) => token.unitId === 'attacker',
      )!,
      targetUnitId: tacticalMapImmobileCombatTargetId,
      hexes: Array.from(
        tacticalMapImmobileCombatGridFixture.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapImmobileCombatGridFixture,
      tokens: tacticalMapImmobileCombatTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapImmobileCombatSelectedWeaponIds,
      ),
      combatState: tacticalMapImmobileCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapImmobileTargetHex.q &&
        projection.hex.r === tacticalMapImmobileTargetHex.r,
    ),
  );

export function tacticalMapImmobileCombatCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapImmobileCombatTokens,
      combatState: tacticalMapImmobileCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapImmobileCombatTargetId,
    weaponIds: tacticalMapImmobileCombatSelectedWeaponIds,
    grid: tacticalMapImmobileCombatGridFixture,
  };
}
