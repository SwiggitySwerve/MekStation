import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IWeaponStatus } from '@/types/gameplay';

import { FiringArc } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatSession,
  tacticalMapOutOfRangeAttacker,
  tacticalMapOutOfRangeGrid,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios.core';
import {
  tacticalMapCombatState,
  tacticalMapOutOfRangeSelectedWeaponIds,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
  tacticalMapUnitWeapons,
} from './tactical-map.fixtures';

const tacticalMapMediumRangeTargetId = 'medium-target';
const tacticalMapMediumRangeTargetHex = { q: 1, r: 2 } as const;
const tacticalMapMinimumRangeTargetId = 'occluded';
const tacticalMapMinimumRangeTargetHex = { q: 0, r: 0 } as const;
const tacticalMapOutOfRangeTargetId = 'medium-target';
const tacticalMapOutOfRangeTargetHex = { q: 1, r: 2 } as const;
const tacticalMapBlockedLosTargetId = 'blocked-target';
const tacticalMapBlockedLosTargetHex = { q: 2, r: 0 } as const;

export const tacticalMapOutOfAmmoTargetId = tacticalMapOutOfRangeTargetId;
export const tacticalMapOutOfAmmoSelectedWeaponIds = ['dry-ac-5'];
export const tacticalMapOutOfAmmoUnitWeapons: Record<
  string,
  readonly IWeaponStatus[]
> = {
  attacker: [
    {
      id: 'dry-ac-5',
      name: 'AC/5',
      location: 'right_torso',
      mountingArc: FiringArc.Front,
      mountingArcs: [
        FiringArc.Front,
        FiringArc.Left,
        FiringArc.Right,
        FiringArc.Rear,
      ],
      destroyed: false,
      firedThisTurn: false,
      heat: 1,
      damage: 5,
      ranges: { short: 3, medium: 6, long: 9 },
      ammoRemaining: 0,
    },
  ],
};

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

export const tacticalMapMinimumRangeCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapMinimumRangeTargetId,
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
      projection.hex.q === tacticalMapMinimumRangeTargetHex.q &&
      projection.hex.r === tacticalMapMinimumRangeTargetHex.r,
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

export const tacticalMapBlockedLosCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapOutOfRangeAttacker,
    targetUnitId: tacticalMapBlockedLosTargetId,
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
      projection.hex.q === tacticalMapBlockedLosTargetHex.q &&
      projection.hex.r === tacticalMapBlockedLosTargetHex.r,
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

export function tacticalMapBlockedLosCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapBlockedLosTargetId,
    weaponIds: tacticalMapSelectedWeaponIds,
    grid: tacticalMapOutOfRangeGrid,
  };
}

export function tacticalMapMinimumRangeCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession(),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapMinimumRangeTargetId,
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
