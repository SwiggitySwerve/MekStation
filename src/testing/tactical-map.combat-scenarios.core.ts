import type { IWeapon } from '@/simulation/ai/types';
import type {
  ICombatRangeHex,
  IGameState,
  IGameSession,
  IGameUnit,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import { createTacticalMapTerrainGrid } from './tactical-map.fixture-helpers';
import {
  tacticalMapCombatState,
  tacticalMapHexTerrain,
  tacticalMapTokens,
  tacticalMapUnitWeapons,
} from './tactical-map.fixtures';

export function tacticalMapCombatGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(tacticalMapHexTerrain);
}

function tacticalMapGameUnits(
  tokens: readonly IUnitToken[] = tacticalMapTokens,
): readonly IGameUnit[] {
  return tokens.map((token) => ({
    id: token.unitId,
    name: token.name,
    side: token.side,
    unitRef: token.unitId,
    pilotRef: `${token.unitId}-pilot`,
    gunnery: 4,
    piloting: 5,
  }));
}

export function tacticalMapCombatSession({
  tokens = tacticalMapTokens,
  combatState = tacticalMapCombatState,
}: {
  readonly tokens?: readonly IUnitToken[];
  readonly combatState?: IGameState;
} = {}): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    tacticalMapGameUnits(tokens),
  );
  session = startGame(session, tacticalMapTokens[0].side);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);

  for (const [unitId, unitState] of Object.entries(combatState.units)) {
    session.currentState.units[unitId] = {
      ...session.currentState.units[unitId],
      ...unitState,
    };
  }
  session = {
    ...session,
    currentState: {
      ...session.currentState,
      ...(combatState.c3State ? { c3State: combatState.c3State } : {}),
    },
  };

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

export function tacticalMapWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map(
    Object.entries(tacticalMapUnitWeapons).map(([unitId, weapons]) => [
      unitId,
      weapons.map(weaponStatusToCommitWeapon),
    ]),
  );
}

export const tacticalMapOutOfRangeGrid = tacticalMapCombatGrid();
const tacticalMapOutOfRangeAttackerToken = tacticalMapTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapOutOfRangeAttackerToken) {
  throw new Error('Missing tactical-map attacker token');
}

export const tacticalMapOutOfRangeAttacker = tacticalMapOutOfRangeAttackerToken;

export function requireCombatProjection(
  projection: ICombatRangeHex | undefined,
): ICombatRangeHex {
  if (!projection) {
    throw new Error('Expected tactical-map out-of-range combat projection');
  }
  return projection;
}

export function tacticalMapSelectedWeapons(
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
