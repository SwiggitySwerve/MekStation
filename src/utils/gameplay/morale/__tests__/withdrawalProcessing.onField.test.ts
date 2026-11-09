/**
 * Wave 4 C1 PR2, site 4: the skip guards in `applyWithdrawalEdgeExits`.
 *
 * Frozen pre-delegation formula: a unit with `destroyed`, `hasRetreated` or
 * `hasEjected` is skipped before the withdrawing/retreating check. Every row
 * of the lifecycle flag domain sits on its locked edge, so `UnitRetreated`
 * must be appended exactly when the frozen formula keeps the unit in play and
 * the unit is withdrawing or retreating.
 */

import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameSession,
} from '@/types/gameplay';
import {
  FLAG_DOMAIN,
  beforeLeftPlay,
  flagLabel,
} from '@/utils/gameplay/__tests__/unitFlagDomain.test-helpers';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';

import { applyWithdrawalEdgeExits } from '../withdrawalProcessing';

const config: IGameConfig = {
  mapRadius: 5,
  turnLimit: 0,
  victoryConditions: ['elimination'],
  optionalRules: [],
};

const base: IGameSession = startGame(
  createGameSession(config, [
    {
      id: 'player-1',
      name: 'player-1',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player-1',
      gunnery: 4,
      piloting: 5,
    },
  ]),
  GameSide.Player,
);

describe('applyWithdrawalEdgeExits skip guards (C1 PR2 site 4)', () => {
  it('retreats exactly the withdrawing units the frozen formula keeps in play', () => {
    let retreated = 0;
    for (const flags of FLAG_DOMAIN) {
      const session: IGameSession = {
        ...base,
        currentState: {
          ...base.currentState,
          units: {
            'player-1': {
              ...base.currentState.units['player-1'],
              ...flags,
              retreatTargetEdge: 'north',
            },
          },
        },
      };
      const result = applyWithdrawalEdgeExits(session);
      const appended = result.events
        .slice(session.events.length)
        .filter((event) => event.type === GameEventType.UnitRetreated).length;

      const expected =
        !beforeLeftPlay(flags) && (flags.isWithdrawing || flags.isRetreating)
          ? 1
          : 0;
      expect({ at: flagLabel(flags), appended }).toEqual({
        at: flagLabel(flags),
        appended: expected,
      });
      retreated += appended;
    }
    // Both outcomes occur, so the comparison above is not vacuous.
    expect(retreated).toBeGreaterThan(0);
    expect(retreated).toBeLessThan(FLAG_DOMAIN.length);
  });
});
