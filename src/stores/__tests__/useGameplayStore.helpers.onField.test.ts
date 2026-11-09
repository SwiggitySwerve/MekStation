/**
 * Wave 4 C1 PR2, site 2: the no-grid weapon-target filter in
 * `useGameplayStore.helpers` (`deriveSelectableWeaponTargetIds`).
 *
 * Reached through the exported token-click handler with a stubbed session that
 * has no grid. Every enemy in the lifecycle flag domain is on the map at once;
 * the selectable ids must be exactly the enemies the frozen pre-delegation
 * formula (`!destroyed && !hasRetreated && !hasEjected`) keeps in play.
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { GamePhase, GameSide } from '@/types/gameplay';
import {
  FLAG_DOMAIN,
  beforeSurvives,
  unitWith,
} from '@/utils/gameplay/__tests__/unitFlagDomain.test-helpers';

import { INITIAL_ATTACK_INTENT_STATE } from '../useGameplayStore.attackIntent';
import {
  handleInteractiveTokenClickLogic,
  InteractivePhase,
} from '../useGameplayStore.helpers';

describe('no-grid weapon-target filter (C1 PR2 site 2)', () => {
  it('selects exactly the enemies the frozen formula keeps in play', () => {
    const enemies = FLAG_DOMAIN.map((flags, index) => ({
      id: `enemy-${index}`,
      flags,
    }));
    const units = {
      attacker: unitWith('attacker', GameSide.Player),
      friend: unitWith('friend', GameSide.Player),
      ...Object.fromEntries(
        enemies.map(({ id, flags }) => [
          id,
          unitWith(id, GameSide.Opponent, flags),
        ]),
      ),
    };
    // No `getGrid`: that is what routes to the filter under test.
    const session = {
      getState: () => ({ phase: GamePhase.WeaponAttack, units }),
    } as unknown as InteractiveSession;

    let state = {
      session: null,
      ui: { selectedUnitId: 'attacker' },
      interactivePhase: InteractivePhase.SelectUnit,
      validMovementHexes: [],
      validTargetIds: [] as readonly string[],
      hitChance: null,
      unitWeapons: {},
      attackIntent: INITIAL_ATTACK_INTENT_STATE,
    };
    const set = (
      update:
        | Partial<typeof state>
        | ((current: typeof state) => Partial<typeof state>),
    ) => {
      state = {
        ...state,
        ...(typeof update === 'function' ? update(state) : update),
      };
    };

    handleInteractiveTokenClickLogic(
      'attacker',
      InteractivePhase.SelectUnit,
      session,
      (() => state) as never,
      set as never,
      { selectUnitForMovement: jest.fn(), selectAttackTarget: jest.fn() },
    );

    const expected = enemies
      .filter(({ flags }) => beforeSurvives(flags))
      .map(({ id }) => id);
    expect([...state.validTargetIds].sort()).toEqual([...expected].sort());
    // Both outcomes occur, and a same-side unit is never a target.
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(enemies.length);
    expect(state.validTargetIds).not.toContain('friend');
  });
});
