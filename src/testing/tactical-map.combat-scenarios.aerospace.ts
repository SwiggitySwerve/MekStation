import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IGameState, IUnitGameState, IUnitToken } from '@/types/gameplay';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import { Facing, GameSide } from '@/types/gameplay';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatSession,
  tacticalMapOutOfRangeAttacker,
  tacticalMapOutOfRangeGrid,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios.core';
import { createTacticalMapUnitState } from './tactical-map.fixture-helpers';
import {
  tacticalMapCombatState,
  tacticalMapTokens,
  tacticalMapUnitWeapons,
} from './tactical-map.fixtures';

export const tacticalMapAirborneAerospaceMinimumRangeTargetId =
  'airborne-aero-target';
export const tacticalMapAirborneAerospaceMinimumRangeTargetHex = {
  q: 0,
  r: 0,
} as const;
export const tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds = [
  'minimum-lrm',
];
export const tacticalMapAirborneAerospaceIndirectSelectedWeaponIds = [
  'minimum-lrm',
];

const tacticalMapAirborneAerospaceTargetState: IUnitGameState =
  createTacticalMapUnitState({
    id: tacticalMapAirborneAerospaceMinimumRangeTargetId,
    side: GameSide.Opponent,
    position: tacticalMapAirborneAerospaceMinimumRangeTargetHex,
    facing: Facing.Southwest,
    combatState: {
      kind: 'aero',
      state: createAerospaceCombatState({
        maxSI: 8,
        armorByArc: { nose: 20, leftWing: 15, rightWing: 15, aft: 10 },
        heatSinks: 12,
        fuelPoints: 400,
        safeThrust: 5,
        maxThrust: 8,
        altitude: 3,
        currentVelocity: 5,
        nextVelocity: 5,
        airborneState: 'airborne',
      }),
    },
  });

const tacticalMapAirborneAerospaceTargetToken = unitStateToToken(
  tacticalMapAirborneAerospaceTargetState.id,
  tacticalMapAirborneAerospaceTargetState,
  {
    name: 'Seydlitz SYD-21',
    side: GameSide.Opponent,
  },
  {
    isValidTarget: true,
    isActiveTarget: true,
  },
);

export const tacticalMapAirborneAerospaceMinimumRangeTokens: readonly IUnitToken[] =
  [
    ...tacticalMapTokens.filter((token) => token.unitId !== 'occluded'),
    tacticalMapAirborneAerospaceTargetToken,
  ];

export const tacticalMapAirborneAerospaceMinimumRangeCombatState: IGameState = {
  ...tacticalMapCombatState,
  units: {
    ...Object.fromEntries(
      Object.entries(tacticalMapCombatState.units).filter(
        ([unitId]) => unitId !== 'occluded',
      ),
    ),
    [tacticalMapAirborneAerospaceMinimumRangeTargetId]:
      tacticalMapAirborneAerospaceTargetState,
  },
};

export const tacticalMapAirborneAerospaceMinimumRangeCombatProjection =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapOutOfRangeAttacker,
      targetUnitId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
      hexes: Array.from(
        tacticalMapOutOfRangeGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapOutOfRangeGrid,
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds,
      ),
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }).find(
      (projection) =>
        projection.hex.q ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.q &&
        projection.hex.r ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.r,
    ),
  );

const tacticalMapAirborneAerospaceIndirectWeapons = tacticalMapSelectedWeapons(
  tacticalMapAirborneAerospaceIndirectSelectedWeaponIds,
).map((weapon) => ({ ...weapon, mode: 'Indirect' as const }));

export const tacticalMapAirborneAerospaceIndirectUnitWeapons: typeof tacticalMapUnitWeapons =
  {
    ...tacticalMapUnitWeapons,
    attacker: tacticalMapUnitWeapons.attacker.map((weapon) =>
      tacticalMapAirborneAerospaceIndirectSelectedWeaponIds.includes(weapon.id)
        ? { ...weapon, mode: 'Indirect' as const }
        : weapon,
    ),
  };

export const tacticalMapAirborneAerospaceIndirectCombatProjection =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapOutOfRangeAttacker,
      targetUnitId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
      hexes: Array.from(
        tacticalMapOutOfRangeGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapOutOfRangeGrid,
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      weapons: tacticalMapAirborneAerospaceIndirectWeapons,
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }).find(
      (projection) =>
        projection.hex.q ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.q &&
        projection.hex.r ===
          tacticalMapAirborneAerospaceMinimumRangeTargetHex.r,
    ),
  );

export function tacticalMapAirborneAerospaceMinimumRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
    weaponIds: tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapAirborneAerospaceIndirectCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapAirborneAerospaceMinimumRangeTokens,
      combatState: tacticalMapAirborneAerospaceMinimumRangeCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapAirborneAerospaceMinimumRangeTargetId,
    weaponIds: tacticalMapAirborneAerospaceIndirectSelectedWeaponIds,
    weaponModesByWeaponId: { 'minimum-lrm': 'Indirect' },
    grid: tacticalMapOutOfRangeGrid,
  };
}
