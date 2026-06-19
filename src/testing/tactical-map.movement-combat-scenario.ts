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

export const tacticalMapMovementCombatTargetId = 'moving-target';
export const tacticalMapMovementCombatSelectedWeaponIds = ['medium-laser'];
export const tacticalMapWalkCombatTargetId = 'walking-target';
export const tacticalMapWalkCombatSelectedWeaponIds =
  tacticalMapMovementCombatSelectedWeaponIds;
export const tacticalMapJumpCombatTargetId = 'jumping-target';
export const tacticalMapJumpCombatSelectedWeaponIds =
  tacticalMapMovementCombatSelectedWeaponIds;

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
  return createTacticalMapTerrainGrid(tacticalMapMovementCombatHexTerrain, {
    missingHexLabel: 'tactical-map movement-combat fixture',
  });
}

const tacticalMapMovementAttackerState: IUnitGameState =
  createTacticalMapUnitState({
    id: 'attacker',
    side: GameSide.Player,
    position: tacticalMapMovementAttackerHex,
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Run,
    hexesMovedThisTurn: 4,
    prone: false,
    shutdown: false,
    gunnery: 4,
  });

const tacticalMapMovementTargetState: IUnitGameState =
  createTacticalMapUnitState({
    id: tacticalMapMovementCombatTargetId,
    side: GameSide.Opponent,
    position: tacticalMapMovementTargetHex,
    facing: Facing.North,
    movementThisTurn: MovementType.Run,
    hexesMovedThisTurn: 5,
    prone: false,
    shutdown: false,
  });

const tacticalMapWalkAttackerState: IUnitGameState = {
  ...tacticalMapMovementAttackerState,
  movementThisTurn: MovementType.Walk,
  hexesMovedThisTurn: 3,
};

const tacticalMapWalkTargetState: IUnitGameState = {
  ...tacticalMapMovementTargetState,
  id: tacticalMapWalkCombatTargetId,
  movementThisTurn: MovementType.Walk,
  hexesMovedThisTurn: 3,
};

const tacticalMapJumpAttackerState: IUnitGameState = {
  ...tacticalMapMovementAttackerState,
  movementThisTurn: MovementType.Jump,
  hexesMovedThisTurn: 4,
};

const tacticalMapJumpTargetState: IUnitGameState = {
  ...tacticalMapMovementTargetState,
  id: tacticalMapJumpCombatTargetId,
  movementThisTurn: MovementType.Jump,
  hexesMovedThisTurn: 7,
};

export const tacticalMapMovementCombatTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Running Shadow Hawk SHD-2H',
      designation: 'RUN',
      position: tacticalMapMovementAttackerHex,
      facing: Facing.Southeast,
    },
    'blocked-target': {
      unitId: tacticalMapMovementCombatTargetId,
      name: 'Moving Locust LCT-1V',
      designation: 'TMM',
      position: tacticalMapMovementTargetHex,
      isActiveTarget: true,
    },
    occluded: {
      position: { q: -3, r: 3 },
      isActiveTarget: false,
      isValidTarget: false,
    },
  });

export const tacticalMapWalkCombatTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Walking Shadow Hawk SHD-2H',
      designation: 'WLK',
      position: tacticalMapMovementAttackerHex,
      facing: Facing.Southeast,
    },
    'blocked-target': {
      unitId: tacticalMapWalkCombatTargetId,
      name: 'Walking Locust LCT-1V',
      designation: 'W-TMM',
      position: tacticalMapMovementTargetHex,
      isActiveTarget: true,
    },
    occluded: {
      position: { q: -3, r: 3 },
      isActiveTarget: false,
      isValidTarget: false,
    },
  });

export const tacticalMapJumpCombatTokens: readonly IUnitToken[] =
  overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: {
      name: 'Jumping Shadow Hawk SHD-2H',
      designation: 'JMP',
      position: tacticalMapMovementAttackerHex,
      facing: Facing.Southeast,
    },
    'blocked-target': {
      unitId: tacticalMapJumpCombatTargetId,
      name: 'Jumping Locust LCT-1V',
      designation: 'J-TMM',
      position: tacticalMapMovementTargetHex,
      isActiveTarget: true,
    },
    occluded: {
      position: { q: -3, r: 3 },
      isActiveTarget: false,
      isValidTarget: false,
    },
  });

export const tacticalMapMovementCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    attacker: tacticalMapMovementAttackerState,
    [tacticalMapMovementCombatTargetId]: tacticalMapMovementTargetState,
  },
};

export const tacticalMapWalkCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    attacker: tacticalMapWalkAttackerState,
    [tacticalMapWalkCombatTargetId]: tacticalMapWalkTargetState,
  },
};

export const tacticalMapJumpCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...tacticalMapCombatState.units,
    attacker: tacticalMapJumpAttackerState,
    [tacticalMapJumpCombatTargetId]: tacticalMapJumpTargetState,
  },
};

const tacticalMapMovementCombatGridFixture = tacticalMapMovementCombatGrid();

function tacticalMapMovementProjection({
  tokens,
  targetUnitId,
  selectedWeaponIds,
  combatState,
}: {
  readonly tokens: readonly IUnitToken[];
  readonly targetUnitId: string;
  readonly selectedWeaponIds: readonly string[];
  readonly combatState: IGameState;
}): ICombatRangeHex {
  return requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tokens.find((token) => token.unitId === 'attacker')!,
      targetUnitId,
      hexes: Array.from(
        tacticalMapMovementCombatGridFixture.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapMovementCombatGridFixture,
      tokens,
      weapons: tacticalMapSelectedWeapons(selectedWeaponIds),
      combatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapMovementTargetHex.q &&
        projection.hex.r === tacticalMapMovementTargetHex.r,
    ),
  );
}

export const tacticalMapMovementCombatProjection: ICombatRangeHex =
  tacticalMapMovementProjection({
    tokens: tacticalMapMovementCombatTokens,
    targetUnitId: tacticalMapMovementCombatTargetId,
    selectedWeaponIds: tacticalMapMovementCombatSelectedWeaponIds,
    combatState: tacticalMapMovementCombatState,
  });

export const tacticalMapWalkCombatProjection: ICombatRangeHex =
  tacticalMapMovementProjection({
    tokens: tacticalMapWalkCombatTokens,
    targetUnitId: tacticalMapWalkCombatTargetId,
    selectedWeaponIds: tacticalMapWalkCombatSelectedWeaponIds,
    combatState: tacticalMapWalkCombatState,
  });

export const tacticalMapJumpCombatProjection: ICombatRangeHex =
  tacticalMapMovementProjection({
    tokens: tacticalMapJumpCombatTokens,
    targetUnitId: tacticalMapJumpCombatTargetId,
    selectedWeaponIds: tacticalMapJumpCombatSelectedWeaponIds,
    combatState: tacticalMapJumpCombatState,
  });

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

export function tacticalMapWalkCombatCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapWalkCombatTokens,
      combatState: tacticalMapWalkCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapWalkCombatTargetId,
    weaponIds: tacticalMapWalkCombatSelectedWeaponIds,
    grid: tacticalMapMovementCombatGridFixture,
  };
}

export function tacticalMapJumpCombatCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapJumpCombatTokens,
      combatState: tacticalMapJumpCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapJumpCombatTargetId,
    weaponIds: tacticalMapJumpCombatSelectedWeaponIds,
    grid: tacticalMapMovementCombatGridFixture,
  };
}
