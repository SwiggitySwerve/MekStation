import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type {
  IGameState,
  IGameSession,
  IHexCoordinate,
  IHexGrid,
  IHexTerrain,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import { buildGameplayTokens } from '@/components/gameplay/GameplayLayout.viewModel';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
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
  tacticalMapCombatGrid,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import {
  tacticalMapCombatState,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
} from './tactical-map.fixtures';

export const tacticalMapMixedVisibilityTargetId = 'medium-target';
export const tacticalMapMixedVisibilityTargetHex = { q: 1, r: 2 } as const;
export const tacticalMapMixedVisibilitySelectedWeaponIds =
  tacticalMapSelectedWeaponIds;
export const tacticalMapFogLosTargetId = 'fog-los-target';
export const tacticalMapFogLosTargetHex = { q: 3, r: 0 } as const;
export const tacticalMapFogLosSelectedWeaponIds = ['medium-laser'];

const mixedVisibilityHiddenId = 'same-hex-hidden-contact';
const mixedVisibilityLastKnownId = 'same-hex-last-known-contact';
const fogViewerPlayerId = 'player-1';
const fogSideOwners = {
  [GameSide.Player]: fogViewerPlayerId,
  [GameSide.Opponent]: 'opponent-1',
} as unknown as IGameSession['sideOwners'];

function mixedVisibilityToken({
  unitId,
  name,
  designation,
  fogStatus,
  position,
  lastKnownPosition,
}: {
  readonly unitId: string;
  readonly name: string;
  readonly designation: string;
  readonly fogStatus: 'hidden' | 'lastKnown';
  readonly position: IHexCoordinate;
  readonly lastKnownPosition?: IHexCoordinate;
}): IUnitToken {
  return {
    unitId,
    name,
    designation,
    position,
    lastKnownPosition,
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: false,
    fogStatus,
    unitType: TokenUnitType.Mech,
  };
}

function mixedVisibilityUnitState(
  unitId: string,
  position: IHexCoordinate,
): IUnitGameState {
  return {
    id: unitId,
    side: GameSide.Opponent,
    position,
    facing: Facing.Southwest,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    prone: false,
    shutdown: false,
    hasRetreated: false,
    gunnery: 4,
  };
}

export const tacticalMapMixedVisibilityTokens: readonly IUnitToken[] = [
  ...tacticalMapTokens,
  mixedVisibilityToken({
    unitId: mixedVisibilityHiddenId,
    name: 'Hidden Contact',
    designation: 'HID',
    fogStatus: 'hidden',
    position: tacticalMapMixedVisibilityTargetHex,
  }),
  mixedVisibilityToken({
    unitId: mixedVisibilityLastKnownId,
    name: 'Last Known Contact',
    designation: 'LKC',
    fogStatus: 'lastKnown',
    position: { q: 3, r: -1 },
    lastKnownPosition: tacticalMapMixedVisibilityTargetHex,
  }),
];

export const tacticalMapMixedVisibilityCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: {
    ...tacticalMapCombatState.units,
    [mixedVisibilityHiddenId]: mixedVisibilityUnitState(
      mixedVisibilityHiddenId,
      tacticalMapMixedVisibilityTargetHex,
    ),
    [mixedVisibilityLastKnownId]: mixedVisibilityUnitState(
      mixedVisibilityLastKnownId,
      { q: 3, r: -1 },
    ),
  },
};

const tacticalMapMixedVisibilityGrid = tacticalMapCombatGrid();
const tacticalMapMixedVisibilityAttacker = tacticalMapTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapMixedVisibilityAttacker) {
  throw new Error('Missing tactical-map attacker token');
}

export const tacticalMapMixedVisibilityCombatProjection =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapMixedVisibilityAttacker,
      hexes: Array.from(
        tacticalMapMixedVisibilityGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapMixedVisibilityGrid,
      tokens: tacticalMapMixedVisibilityTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapMixedVisibilitySelectedWeaponIds,
      ),
      combatState: tacticalMapMixedVisibilityCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapMixedVisibilityTargetHex.q &&
        projection.hex.r === tacticalMapMixedVisibilityTargetHex.r,
    ),
  );

export function tacticalMapMixedVisibilityCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapMixedVisibilityTokens,
      combatState: tacticalMapMixedVisibilityCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapMixedVisibilityTargetId,
    weaponIds: tacticalMapMixedVisibilitySelectedWeaponIds,
    grid: tacticalMapMixedVisibilityGrid,
  };
}

function fogLosUnitState({
  unitId,
  side,
  position,
  facing,
}: {
  readonly unitId: string;
  readonly side: GameSide;
  readonly position: IHexCoordinate;
  readonly facing: Facing;
}): IUnitGameState {
  return {
    id: unitId,
    side,
    position,
    facing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    prone: false,
    shutdown: false,
    hasRetreated: false,
    gunnery: 4,
  };
}

export const tacticalMapFogLosHexTerrain: readonly IHexTerrain[] = [
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

export const tacticalMapFogLosCombatState: IGameState = {
  gameId: 'tactical-map-fog-los',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: {
    attacker: fogLosUnitState({
      unitId: 'attacker',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    }),
    [tacticalMapFogLosTargetId]: fogLosUnitState({
      unitId: tacticalMapFogLosTargetId,
      side: GameSide.Opponent,
      position: tacticalMapFogLosTargetHex,
      facing: Facing.Northwest,
    }),
  },
};

function tacticalMapFogLosGrid({
  blocked,
}: {
  readonly blocked: boolean;
}): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  if (!blocked) return grid;

  const hexes = new Map(grid.hexes);
  for (const terrain of tacticalMapFogLosHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map fog LOS hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }
  return { ...grid, hexes };
}

const tacticalMapFogLosClearGrid = tacticalMapFogLosGrid({ blocked: false });
const tacticalMapFogLosBlockedGrid = tacticalMapFogLosGrid({ blocked: true });
const tacticalMapFogLosSessionStub = {
  id: 'tactical-map-fog-los',
  config: {
    mapRadius: 3,
    fogOfWar: true,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  },
  currentState: tacticalMapFogLosCombatState,
  units: [
    {
      id: 'attacker',
      name: 'Shadow Hawk SHD-2H',
      side: GameSide.Player,
      unitRef: 'attacker',
      pilotRef: 'attacker-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: tacticalMapFogLosTargetId,
      name: 'Wasp WSP-1A',
      side: GameSide.Opponent,
      unitRef: tacticalMapFogLosTargetId,
      pilotRef: `${tacticalMapFogLosTargetId}-pilot`,
      gunnery: 4,
      piloting: 5,
    },
  ],
  events: [],
  sideOwners: fogSideOwners,
} as unknown as IGameSession;
const tacticalMapFogLosUnitInfo = {
  attacker: { name: 'Shadow Hawk SHD-2H', side: GameSide.Player },
  [tacticalMapFogLosTargetId]: {
    name: 'Wasp WSP-1A',
    side: GameSide.Opponent,
  },
};

function tacticalMapFogLosTokensForGrid(grid: IHexGrid): readonly IUnitToken[] {
  return buildGameplayTokens({
    currentState: tacticalMapFogLosCombatState,
    config: tacticalMapFogLosSessionStub.config,
    session: tacticalMapFogLosSessionStub,
    unitInfoLookup: tacticalMapFogLosUnitInfo,
    selectedUnitId: 'attacker',
    validTargetIds: [tacticalMapFogLosTargetId],
    activeTargetId: tacticalMapFogLosTargetId,
    playerSide: GameSide.Player,
    localFogPlayerId: fogViewerPlayerId,
    visibilityState: {
      ...tacticalMapFogLosCombatState,
      sideOwners: fogSideOwners,
      grid,
    },
  });
}

export const tacticalMapFogLosVisibleTokens = tacticalMapFogLosTokensForGrid(
  tacticalMapFogLosClearGrid,
);

export const tacticalMapFogLosTokens = tacticalMapFogLosTokensForGrid(
  tacticalMapFogLosBlockedGrid,
);

const tacticalMapFogLosAttacker = tacticalMapFogLosTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapFogLosAttacker) {
  throw new Error('Missing tactical-map fog LOS attacker token');
}

export const tacticalMapFogLosCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapFogLosAttacker,
    targetUnitId: tacticalMapFogLosTargetId,
    hexes: Array.from(
      tacticalMapFogLosBlockedGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapFogLosBlockedGrid,
    tokens: tacticalMapFogLosTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapFogLosSelectedWeaponIds),
    combatState: tacticalMapFogLosCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapFogLosTargetHex.q &&
      projection.hex.r === tacticalMapFogLosTargetHex.r,
  ),
);

export function tacticalMapFogLosCommitInput(): IApplyAttackInput {
  const session = tacticalMapCombatSession({
    tokens: tacticalMapFogLosTokens,
    combatState: tacticalMapFogLosCombatState,
  });
  return {
    session: {
      ...session,
      config: { ...session.config, fogOfWar: true },
      sideOwners: fogSideOwners,
    },
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapFogLosTargetId,
    weaponIds: tacticalMapFogLosSelectedWeaponIds,
    grid: tacticalMapFogLosBlockedGrid,
  };
}
