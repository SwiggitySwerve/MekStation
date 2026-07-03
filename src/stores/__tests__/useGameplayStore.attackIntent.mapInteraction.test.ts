/**
 * Target-first map interaction (change `attack-phase-intent-composer`,
 * phase 3, task 3.2): during the weapon-attack phase an enemy token click
 * focuses the composer's working target — subsequent weapon toggles assign
 * against it — and the click itself never declares an attack (Attack
 * Intent Map Interaction scenarios).
 *
 * Exercises `handleInteractiveTokenClickLogic` with a stubbed
 * InteractiveSession so the routing (click → focusTargetReducer) is under
 * test, not the engine.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-map-interface/spec.md
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { GamePhase, GameSide } from '@/types/gameplay';

import { INITIAL_ATTACK_INTENT_STATE } from '../useGameplayStore.attackIntent';
import {
  handleInteractiveTokenClickLogic,
  InteractivePhase,
} from '../useGameplayStore.helpers';

function makeInteractiveSessionStub(): InteractiveSession {
  return {
    getState: () => ({
      phase: GamePhase.WeaponAttack,
      units: {
        a1: { side: GameSide.Player, destroyed: false },
        t1: { side: GameSide.Opponent, destroyed: false },
      },
    }),
  } as unknown as InteractiveSession;
}

describe('handleInteractiveTokenClickLogic — target-first focus (D6)', () => {
  it('enemy click focuses the composer working target without declaring', () => {
    let state = {
      session: null,
      ui: { selectedUnitId: 'a1' },
      interactivePhase: InteractivePhase.SelectTarget,
      validMovementHexes: [],
      validTargetIds: ['t1'],
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
    const selectAttackTarget = jest.fn();

    handleInteractiveTokenClickLogic(
      't1',
      InteractivePhase.SelectTarget,
      makeInteractiveSessionStub(),
      (() => state) as never,
      set as never,
      {
        selectUnitForMovement: jest.fn(),
        selectAttackTarget,
      } as never,
    );

    // The click focused the working target...
    expect(state.attackIntent.focusedTargetId).toBe('t1');
    // ...kept assignments untouched (no declaration by the click itself)...
    expect(state.attackIntent.assignments).toEqual([]);
    // ...and still routed the legacy single-target mirror.
    expect(selectAttackTarget).toHaveBeenCalledWith('t1');
  });

  it('enemy click outside validTargetIds still focuses (palette will block at source)', () => {
    let state = {
      session: null,
      ui: { selectedUnitId: 'a1' },
      interactivePhase: InteractivePhase.SelectTarget,
      validMovementHexes: [],
      validTargetIds: ['someone-else'],
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
    const selectAttackTarget = jest.fn();

    handleInteractiveTokenClickLogic(
      't1',
      InteractivePhase.SelectTarget,
      makeInteractiveSessionStub(),
      (() => state) as never,
      set as never,
      {
        selectUnitForMovement: jest.fn(),
        selectAttackTarget,
      } as never,
    );

    expect(state.attackIntent.focusedTargetId).toBe('t1');
    // Legacy mirror refuses invalid targets — unchanged behavior.
    expect(selectAttackTarget).not.toHaveBeenCalled();
  });
});
