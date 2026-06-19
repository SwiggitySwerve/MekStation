import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  ICombatRangeHex,
  IGameSession,
  IGameUnit,
  IGameState,
  IHexGrid,
  IUnitGameState,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  TokenUnitType,
} from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import {
  createTacticalMapTerrainGrid,
  createTacticalMapUnitState,
} from './tactical-map.fixture-helpers';
import {
  tacticalMapCombatState,
  tacticalMapHexTerrain,
  tacticalMapTokens,
  tacticalMapUnitWeapons,
} from './tactical-map.fixtures';

export const tacticalMapTargetTerrainModifierTargetId = 'woods-target';
export const tacticalMapTargetTerrainModifierTargetHex = {
  q: 0,
  r: 1,
} as const;
export const tacticalMapTargetTerrainModifierSelectedWeaponIds = [
  'medium-laser',
];

const tacticalMapTargetTerrainModifierTargetState: IUnitGameState =
  createTacticalMapUnitState({
    id: tacticalMapTargetTerrainModifierTargetId,
    side: GameSide.Opponent,
    position: tacticalMapTargetTerrainModifierTargetHex,
    facing: Facing.Southwest,
    prone: false,
    shutdown: false,
    hasRetreated: false,
    gunnery: 4,
  });

const tacticalMapTargetTerrainModifierTargetToken: IUnitToken = {
  unitId: tacticalMapTargetTerrainModifierTargetId,
  name: 'Panther PNT-9R',
  designation: 'PNT',
  position: tacticalMapTargetTerrainModifierTargetHex,
  facing: Facing.Southwest,
  side: GameSide.Opponent,
  isDestroyed: false,
  isSelected: false,
  isValidTarget: true,
  isActiveTarget: true,
  unitType: TokenUnitType.Mech,
};

export const tacticalMapTargetTerrainModifierTokens: readonly IUnitToken[] = [
  ...tacticalMapTokens,
  tacticalMapTargetTerrainModifierTargetToken,
];

export const tacticalMapTargetTerrainModifierCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: {
    ...tacticalMapCombatState.units,
    [tacticalMapTargetTerrainModifierTargetId]:
      tacticalMapTargetTerrainModifierTargetState,
  },
};

function buildTacticalMapTargetTerrainGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapHexTerrain);
}

function tacticalMapTargetTerrainGameUnits(): readonly IGameUnit[] {
  return tacticalMapTargetTerrainModifierTokens.map((token) => ({
    id: token.unitId,
    name: token.name,
    side: token.side,
    unitRef: token.unitId,
    pilotRef: `${token.unitId}-pilot`,
    gunnery: 4,
    piloting: 5,
  }));
}

function tacticalMapTargetTerrainCombatSession(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    tacticalMapTargetTerrainGameUnits(),
  );
  session = startGame(session, tacticalMapTokens[0].side);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);

  for (const [unitId, unitState] of Object.entries(
    tacticalMapTargetTerrainModifierCombatState.units,
  )) {
    session.currentState.units[unitId] = {
      ...session.currentState.units[unitId],
      ...unitState,
    };
  }

  return session;
}

function weaponStatusToCommitWeapon(status: IWeaponStatus): IWeapon {
  return {
    id: status.id,
    name: status.name,
    shortRange: status.ranges.short,
    mediumRange: status.ranges.medium,
    longRange: status.ranges.long,
    extremeRange: status.ranges.extreme,
    damage: typeof status.damage === 'number' ? status.damage : 0,
    heat: status.heat,
    minRange: status.ranges.minimum ?? 0,
    location: status.location,
    ammoPerTon:
      status.ammoRemaining === undefined
        ? -1
        : Math.max(1, status.ammoMax ?? status.ammoRemaining),
    destroyed: status.destroyed,
    mountingArc: status.mountingArc,
    mountingArcs: status.mountingArcs,
    isTorpedo: status.isTorpedo,
  };
}

function tacticalMapTargetTerrainWeaponsByUnit(): Map<
  string,
  readonly IWeapon[]
> {
  return new Map(
    Object.entries(tacticalMapUnitWeapons).map(([unitId, weapons]) => [
      unitId,
      weapons.map(weaponStatusToCommitWeapon),
    ]),
  );
}

function tacticalMapTargetTerrainSelectedWeapons(
  weaponIds: readonly string[],
): readonly IWeaponStatus[] {
  return weaponIds.map((weaponId) => {
    const weapon = tacticalMapUnitWeapons.attacker.find(
      (candidate) => candidate.id === weaponId,
    );
    if (!weapon) throw new Error(`Missing tactical-map weapon ${weaponId}`);
    return weapon;
  });
}

const tacticalMapTargetTerrainGrid = buildTacticalMapTargetTerrainGrid();
const tacticalMapTargetTerrainAttacker = tacticalMapTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapTargetTerrainAttacker) {
  throw new Error('Missing tactical-map attacker token');
}

function requireCombatProjection(
  projection: ICombatRangeHex | undefined,
): ICombatRangeHex {
  if (!projection) {
    throw new Error('Expected tactical-map target-terrain combat projection');
  }
  return projection;
}

export const tacticalMapTargetTerrainModifierCombatProjection =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapTargetTerrainAttacker,
      targetUnitId: tacticalMapTargetTerrainModifierTargetId,
      hexes: Array.from(
        tacticalMapTargetTerrainGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapTargetTerrainGrid,
      tokens: tacticalMapTargetTerrainModifierTokens,
      weapons: tacticalMapTargetTerrainSelectedWeapons(
        tacticalMapTargetTerrainModifierSelectedWeaponIds,
      ),
      combatState: tacticalMapTargetTerrainModifierCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapTargetTerrainModifierTargetHex.q &&
        projection.hex.r === tacticalMapTargetTerrainModifierTargetHex.r,
    ),
  );

export function tacticalMapTargetTerrainModifierCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapTargetTerrainCombatSession(),
    weaponsByUnit: tacticalMapTargetTerrainWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapTargetTerrainModifierTargetId,
    weaponIds: tacticalMapTargetTerrainModifierSelectedWeaponIds,
    grid: tacticalMapTargetTerrainGrid,
  };
}
