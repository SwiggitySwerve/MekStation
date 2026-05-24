import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  ICombatRangeHex,
  IGameSession,
  IGameUnit,
  IHexGrid,
  IWeaponStatus,
} from '@/types/gameplay';

import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  tacticalMapCombatState,
  tacticalMapHexTerrain,
  tacticalMapOutOfRangeSelectedWeaponIds,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
  tacticalMapUnitWeapons,
} from './tactical-map.fixtures';

const tacticalMapMediumRangeTargetId = 'medium-target';
const tacticalMapMediumRangeTargetHex = { q: 1, r: 2 } as const;
const tacticalMapOutOfRangeTargetId = 'medium-target';
const tacticalMapOutOfRangeTargetHex = { q: 1, r: 2 } as const;

function tacticalMapCombatGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map fixture hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

function tacticalMapGameUnits(): readonly IGameUnit[] {
  return tacticalMapTokens.map((token) => ({
    id: token.unitId,
    name: token.name,
    side: token.side,
    unitRef: token.unitId,
    pilotRef: `${token.unitId}-pilot`,
    gunnery: 4,
    piloting: 5,
  }));
}

function tacticalMapCombatSession(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    tacticalMapGameUnits(),
  );
  session = startGame(session, tacticalMapTokens[0].side);
  session = rollInitiative(session);
  session = advancePhase(session);
  session = advancePhase(session);

  for (const [unitId, unitState] of Object.entries(
    tacticalMapCombatState.units,
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

function tacticalMapWeaponsByUnit(): Map<string, readonly IWeapon[]> {
  return new Map(
    Object.entries(tacticalMapUnitWeapons).map(([unitId, weapons]) => [
      unitId,
      weapons.map(weaponStatusToCommitWeapon),
    ]),
  );
}

const tacticalMapOutOfRangeGrid = tacticalMapCombatGrid();
const tacticalMapOutOfRangeAttacker = tacticalMapTokens.find(
  (token) => token.unitId === 'attacker',
);

if (!tacticalMapOutOfRangeAttacker) {
  throw new Error('Missing tactical-map attacker token');
}

function requireCombatProjection(
  projection: ICombatRangeHex | undefined,
): ICombatRangeHex {
  if (!projection) {
    throw new Error('Expected tactical-map out-of-range combat projection');
  }
  return projection;
}

function tacticalMapSelectedWeapons(
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

export const tacticalMapMediumRangeCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapMediumRangeTargetId,
    hexes: Array.from(
      tacticalMapOutOfRangeGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfRangeGrid,
    tokens: tacticalMapTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapSelectedWeaponIds),
    combatState: tacticalMapCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapMediumRangeTargetHex.q &&
      projection.hex.r === tacticalMapMediumRangeTargetHex.r,
  ),
);

export const tacticalMapOutOfRangeCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapOutOfRangeTargetId,
    hexes: Array.from(
      tacticalMapOutOfRangeGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapOutOfRangeGrid,
    tokens: tacticalMapTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapOutOfRangeSelectedWeaponIds),
    combatState: tacticalMapCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapOutOfRangeTargetHex.q &&
      projection.hex.r === tacticalMapOutOfRangeTargetHex.r,
  ),
);

export function tacticalMapMediumRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapMediumRangeTargetId,
    weaponIds: tacticalMapSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapOutOfRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapOutOfRangeTargetId,
    weaponIds: tacticalMapOutOfRangeSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}
