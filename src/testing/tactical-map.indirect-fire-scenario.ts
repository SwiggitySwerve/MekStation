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

import {
  requireCombatProjection,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import { createTacticalMapTerrainGrid } from './tactical-map.fixture-helpers';
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
export const tacticalMapForwardObserverIndirectFireTargetId =
  tacticalMapIndirectFireTargetId;
export const tacticalMapForwardObserverIndirectFireSelectedWeaponIds =
  tacticalMapIndirectFireSelectedWeaponIds;
export const tacticalMapNarcBeaconIndirectFireTargetId =
  tacticalMapIndirectFireTargetId;
export const tacticalMapNarcBeaconIndirectFireSelectedWeaponIds =
  tacticalMapIndirectFireSelectedWeaponIds;
export const tacticalMapINarcBeaconIndirectFireTargetId =
  tacticalMapIndirectFireTargetId;
export const tacticalMapINarcBeaconIndirectFireSelectedWeaponIds =
  tacticalMapIndirectFireSelectedWeaponIds;
export const tacticalMapSemiGuidedTagIndirectFireTargetId =
  tacticalMapIndirectFireTargetId;
export const tacticalMapSemiGuidedTagIndirectFireSelectedWeaponIds = [
  'semi-guided-lrm-15',
];

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

export const tacticalMapNarcBeaconIndirectFireTokens: readonly IUnitToken[] = [
  tacticalMapIndirectFireAttackerToken,
  tacticalMapIndirectFireTargetToken,
];
export const tacticalMapINarcBeaconIndirectFireTokens =
  tacticalMapNarcBeaconIndirectFireTokens;
export const tacticalMapSemiGuidedTagIndirectFireTokens =
  tacticalMapNarcBeaconIndirectFireTokens;

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

export const tacticalMapForwardObserverIndirectFireTokens =
  tacticalMapIndirectFireTokens;
export const tacticalMapForwardObserverIndirectFireHexTerrain =
  tacticalMapIndirectFireHexTerrain;
export const tacticalMapForwardObserverIndirectFireCombatState: IGameState = {
  ...tacticalMapIndirectFireCombatState,
  units: {
    ...tacticalMapIndirectFireCombatState.units,
    [tacticalMapIndirectFireSpotterId]: {
      ...tacticalMapIndirectFireCombatState.units[
        tacticalMapIndirectFireSpotterId
      ],
      movementThisTurn: MovementType.Walk,
      pilotSpas: ['forward_observer'],
    },
  },
};

export const tacticalMapNarcBeaconIndirectFireHexTerrain =
  tacticalMapIndirectFireHexTerrain;
export const tacticalMapNarcBeaconIndirectFireCombatState: IGameState = {
  ...tacticalMapIndirectFireCombatState,
  units: {
    attacker: tacticalMapIndirectFireCombatState.units.attacker,
    [tacticalMapIndirectFireTargetId]: {
      ...tacticalMapIndirectFireCombatState.units[
        tacticalMapIndirectFireTargetId
      ],
      narcMarkedByTeams: [GameSide.Player],
    } as IGameState['units'][string] & {
      readonly narcMarkedByTeams: readonly string[];
    },
  },
};
export const tacticalMapINarcBeaconIndirectFireHexTerrain =
  tacticalMapIndirectFireHexTerrain;
export const tacticalMapINarcBeaconIndirectFireCombatState: IGameState = {
  ...tacticalMapIndirectFireCombatState,
  units: {
    attacker: tacticalMapIndirectFireCombatState.units.attacker,
    [tacticalMapIndirectFireTargetId]: {
      ...tacticalMapIndirectFireCombatState.units[
        tacticalMapIndirectFireTargetId
      ],
      iNarcMarkedByTeams: [GameSide.Player],
    } as IGameState['units'][string] & {
      readonly iNarcMarkedByTeams: readonly string[];
    },
  },
};
export const tacticalMapSemiGuidedTagIndirectFireHexTerrain =
  tacticalMapIndirectFireHexTerrain;
export const tacticalMapSemiGuidedTagIndirectFireCombatState: IGameState = {
  ...tacticalMapIndirectFireCombatState,
  units: {
    attacker: tacticalMapIndirectFireCombatState.units.attacker,
    [tacticalMapIndirectFireTargetId]: {
      ...tacticalMapIndirectFireCombatState.units[
        tacticalMapIndirectFireTargetId
      ],
      tagDesignated: true,
    },
  },
};

function tacticalMapIndirectFireGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapIndirectFireHexTerrain, {
    missingHexLabel: 'tactical-map indirect',
  });
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

export const tacticalMapForwardObserverIndirectFireCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapIndirectFireAttackerToken,
      targetUnitId: tacticalMapForwardObserverIndirectFireTargetId,
      hexes: Array.from(
        tacticalMapIndirectFireGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapIndirectFireGrid(),
      tokens: tacticalMapForwardObserverIndirectFireTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapForwardObserverIndirectFireSelectedWeaponIds,
      ),
      combatState: tacticalMapForwardObserverIndirectFireCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapIndirectFireTargetHex.q &&
        projection.hex.r === tacticalMapIndirectFireTargetHex.r,
    ),
  );

export const tacticalMapNarcBeaconIndirectFireCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapIndirectFireAttackerToken,
      targetUnitId: tacticalMapNarcBeaconIndirectFireTargetId,
      hexes: Array.from(
        tacticalMapIndirectFireGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapIndirectFireGrid(),
      tokens: tacticalMapNarcBeaconIndirectFireTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapNarcBeaconIndirectFireSelectedWeaponIds,
      ),
      combatState: tacticalMapNarcBeaconIndirectFireCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapIndirectFireTargetHex.q &&
        projection.hex.r === tacticalMapIndirectFireTargetHex.r,
    ),
  );

export const tacticalMapINarcBeaconIndirectFireCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapIndirectFireAttackerToken,
      targetUnitId: tacticalMapINarcBeaconIndirectFireTargetId,
      hexes: Array.from(
        tacticalMapIndirectFireGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapIndirectFireGrid(),
      tokens: tacticalMapINarcBeaconIndirectFireTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapINarcBeaconIndirectFireSelectedWeaponIds,
      ),
      combatState: tacticalMapINarcBeaconIndirectFireCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapIndirectFireTargetHex.q &&
        projection.hex.r === tacticalMapIndirectFireTargetHex.r,
    ),
  );

export const tacticalMapSemiGuidedTagIndirectFireCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapIndirectFireAttackerToken,
      targetUnitId: tacticalMapSemiGuidedTagIndirectFireTargetId,
      hexes: Array.from(
        tacticalMapIndirectFireGrid().hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapIndirectFireGrid(),
      tokens: tacticalMapSemiGuidedTagIndirectFireTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapSemiGuidedTagIndirectFireSelectedWeaponIds,
      ),
      combatState: tacticalMapSemiGuidedTagIndirectFireCombatState,
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

export function tacticalMapForwardObserverIndirectFireCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapForwardObserverIndirectFireTokens,
      combatState: tacticalMapForwardObserverIndirectFireCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapForwardObserverIndirectFireTargetId,
    weaponIds: tacticalMapForwardObserverIndirectFireSelectedWeaponIds,
    grid: tacticalMapIndirectFireGrid(),
  };
}

export function tacticalMapNarcBeaconIndirectFireCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapNarcBeaconIndirectFireTokens,
      combatState: tacticalMapNarcBeaconIndirectFireCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapNarcBeaconIndirectFireTargetId,
    weaponIds: tacticalMapNarcBeaconIndirectFireSelectedWeaponIds,
    grid: tacticalMapIndirectFireGrid(),
  };
}

export function tacticalMapINarcBeaconIndirectFireCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapINarcBeaconIndirectFireTokens,
      combatState: tacticalMapINarcBeaconIndirectFireCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapINarcBeaconIndirectFireTargetId,
    weaponIds: tacticalMapINarcBeaconIndirectFireSelectedWeaponIds,
    grid: tacticalMapIndirectFireGrid(),
  };
}

export function tacticalMapSemiGuidedTagIndirectFireCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapSemiGuidedTagIndirectFireTokens,
      combatState: tacticalMapSemiGuidedTagIndirectFireCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapSemiGuidedTagIndirectFireTargetId,
    weaponIds: tacticalMapSemiGuidedTagIndirectFireSelectedWeaponIds,
    grid: tacticalMapIndirectFireGrid(),
  };
}
