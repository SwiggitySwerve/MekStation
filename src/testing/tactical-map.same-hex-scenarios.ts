import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { IGameState, IUnitToken } from '@/types/gameplay';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatGrid,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';

export const tacticalMapSameHexTargetId = 'same-hex-target';
export const tacticalMapSameHexTargetHex = { q: 0, r: 0 } as const;
export const tacticalMapSameHexSelectedWeaponIds = ['medium-laser'];

export const tacticalMapSameHexTokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: tacticalMapSameHexTargetHex,
    facing: Facing.North,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: tacticalMapSameHexTargetId,
    name: 'Same Hex Target',
    designation: 'SHT',
    position: tacticalMapSameHexTargetHex,
    facing: Facing.South,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    unitType: TokenUnitType.Mech,
  },
];

export const tacticalMapSameHexCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: Object.fromEntries(
    tacticalMapSameHexTokens.map((token) => [
      token.unitId,
      {
        id: token.unitId,
        side: token.side,
        position: token.position,
        facing: token.facing,
        heat: 0,
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
        prone: false,
        destroyed: token.isDestroyed,
        shutdown: false,
        hasRetreated: false,
        gunnery: 4,
      },
    ]),
  ) as IGameState['units'],
};

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
