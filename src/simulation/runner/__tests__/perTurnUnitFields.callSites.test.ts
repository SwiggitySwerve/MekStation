/**
 * C7 PR 2 drift guard: both turn-boundary call sites must produce exactly what
 * `resetPerTurnUnitFields` produces for their shape. If either site goes back
 * to a hand-written reset, the paths can drift again (the audit's C7 finding).
 *
 * The reducer's boundary also owns damageThisPhase/lockState (per-phase), and
 * the runner's reset still zeroes damageThisPhase itself; both are the pending
 * D1/D8 questions and are asserted explicitly here, not hidden in the helper.
 */

import {
  GameEventType,
  GamePhase,
  LockState,
  MovementType,
  type IGameEvent,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  runtimeMovementUnit,
  stateWithUnit,
} from '@/utils/gameplay/gameState/__tests__/runtimeMovementState.helpers';
import { applyTurnStarted } from '@/utils/gameplay/gameState/phaseManagement';
import { resetPerTurnUnitFields } from '@/utils/gameplay/perTurnUnitFields';

import { resetTurnState } from '../SimulationRunnerState';

const UNITS: Record<string, IUnitGameState> = {
  'never-set unit': runtimeMovementUnit({ id: 'u1' }),
  'fully dirtied unit': runtimeMovementUnit({
    id: 'u1',
    movementThisTurn: MovementType.Run,
    hexesMovedThisTurn: 5,
    sprintedThisTurn: true,
    hasMASC: true,
    activeMASC: true,
    mascTurnsUsed: 2,
    weaponsFiredThisTurn: ['w1'],
    pendingPSRs: [
      {
        entityId: 'u1',
        reason: 'x',
        additionalModifier: 0,
        triggerSource: 'attack',
      },
    ],
    damageThisPhase: 15,
    tagDesignated: true,
    externalHeatThisTurn: 10,
    pendingExternalHeat: 4,
    isSpotting: true,
    spotTargetId: 'opponent-1',
    isLoadingOrUnloadingCargo: true,
    empInterferenceTurns: 3,
    empShutdownTurns: 2,
    lockState: LockState.Locked,
  }),
};

function turnStarted(turn: number): IGameEvent {
  return {
    id: 'evt-turn-started',
    gameId: 'game-1',
    sequence: 1,
    timestamp: '2026-11-09T00:00:00.000Z',
    type: GameEventType.TurnStarted,
    turn,
    phase: GamePhase.Initiative,
    payload: { _type: 'turn_started' } as never,
  };
}

describe.each(Object.entries(UNITS))('call sites: %s', (_label, unit) => {
  it('the reducer (applyTurnStarted) resets exactly as the explicit shape', () => {
    const state = { ...stateWithUnit(unit), turn: 1 };
    expect(applyTurnStarted(state, turnStarted(2)).units.u1).toStrictEqual(
      resetPerTurnUnitFields(unit, { presence: 'explicit' }),
    );
  });

  it('the runner (resetTurnState) resets exactly as the sparse shape plus its own damageThisPhase zero', () => {
    const state = { ...stateWithUnit(unit), turn: 2 };
    expect(resetTurnState(state).units.u1).toStrictEqual({
      ...resetPerTurnUnitFields(unit, { presence: 'sparse' }),
      damageThisPhase: 0,
    });
  });
});
