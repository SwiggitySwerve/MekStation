import type { IGameState, IUnitToken } from '@/types/gameplay';

import { Facing, GameSide, TokenUnitType } from '@/types/gameplay';

import {
  createTacticalMapGameStateForTokens,
  overrideTacticalMapTokens,
} from './tactical-map.fixture-helpers';
import { tacticalMapTokens } from './tactical-map.fixtures';

export const tacticalMapMountedBattleArmorTokens: readonly IUnitToken[] = [
  ...overrideTacticalMapTokens(tacticalMapTokens, {
    attacker: { position: { q: 0, r: 0 }, facing: Facing.Northeast },
    occluded: { position: { q: 2, r: -1 } },
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

export const tacticalMapMountedBattleArmorCombatState: IGameState =
  createTacticalMapGameStateForTokens(tacticalMapMountedBattleArmorTokens, {
    unitOverrides: () => ({
      prone: false,
      shutdown: false,
      hasRetreated: false,
      gunnery: 4,
    }),
  });
