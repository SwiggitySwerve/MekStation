import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IGameState, IUnitToken } from '@/types/gameplay';

import { Facing } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatGrid,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import {
  createTacticalMapGameStateForTokens,
  createTacticalMapMechToken,
  createTacticalMapPlayerMechToken,
} from './tactical-map.fixture-helpers';

export const tacticalMapSameHexTargetId = 'same-hex-target';
export const tacticalMapSameHexTargetHex = { q: 0, r: 0 } as const;
export const tacticalMapSameHexSelectedWeaponIds = ['medium-laser'];

export const tacticalMapSameHexTokens: readonly IUnitToken[] = [
  createTacticalMapPlayerMechToken({
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: tacticalMapSameHexTargetHex,
    facing: Facing.North,
  }),
  createTacticalMapMechToken({
    unitId: tacticalMapSameHexTargetId,
    name: 'Same Hex Target',
    designation: 'SHT',
    position: tacticalMapSameHexTargetHex,
    facing: Facing.South,
    isActiveTarget: true,
  }),
];

export const tacticalMapSameHexCombatState: IGameState =
  createTacticalMapGameStateForTokens(tacticalMapSameHexTokens);

const tacticalMapSameHexGrid = tacticalMapCombatGrid();

export const tacticalMapSameHexCombatProjection = requireCombatProjection(
  deriveCombatRangeHexes({
    attacker: tacticalMapSameHexTokens[0],
    targetUnitId: tacticalMapSameHexTargetId,
    hexes: Array.from(
      tacticalMapSameHexGrid.hexes.values(),
      (hex) => hex.coord,
    ),
    grid: tacticalMapSameHexGrid,
    tokens: tacticalMapSameHexTokens,
    weapons: tacticalMapSelectedWeapons(tacticalMapSameHexSelectedWeaponIds),
    combatState: tacticalMapSameHexCombatState,
  }).find(
    (projection) =>
      projection.hex.q === tacticalMapSameHexTargetHex.q &&
      projection.hex.r === tacticalMapSameHexTargetHex.r,
  ),
);

export function tacticalMapSameHexCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapSameHexTokens,
      combatState: tacticalMapSameHexCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapSameHexTargetId,
    weaponIds: tacticalMapSameHexSelectedWeaponIds,
    grid: tacticalMapSameHexGrid,
  };
}
