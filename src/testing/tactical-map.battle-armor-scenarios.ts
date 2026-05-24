import type { IGameState, IUnitToken } from '@/types/gameplay';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';

import { tacticalMapTokens } from './tactical-map.fixtures';

export const tacticalMapMountedBattleArmorTokens: readonly IUnitToken[] = [
  ...tacticalMapTokens.map((token) => {
    if (token.unitId === 'attacker') {
      return {
        ...token,
        position: { q: 0, r: 0 },
        facing: Facing.Northeast,
      } as IUnitToken;
    }

    if (token.unitId === 'occluded') {
      return {
        ...token,
        position: { q: 2, r: -1 },
      } as IUnitToken;
    }

    return token;
  }),
  {
    unitId: 'ba-passenger',
    name: 'Gray Death Scout BA',
    designation: 'GDS',
    position: { q: 2, r: 0 },
    facing: Facing.Southwest,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: false,
    unitType: TokenUnitType.BattleArmor,
    mountedOn: 'attacker',
    passengerBadge: { hostTokenId: 'attacker', slot: 'back' },
    trooperCount: 4,
  },
];

export const tacticalMapMountedBattleArmorCombatState: IGameState = {
  gameId: 'tactical-map-e2e',
  status: GameStatus.Active,
  turn: 1,
  phase: GamePhase.WeaponAttack,
  activationIndex: 0,
  turnEvents: [],
  units: Object.fromEntries(
    tacticalMapMountedBattleArmorTokens.map((token) => [
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
