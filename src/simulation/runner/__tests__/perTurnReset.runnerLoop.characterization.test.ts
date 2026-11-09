/**
 * C7 characterization (state-machine audit, Wave 2 #16): the runner's turn
 * loop against the reducer, using the real `SimulationRunner.run`.
 *
 * Pins two things the field-level file cannot:
 *   - DIVERGENCE D5: WHEN the reset runs. MegaMek 48fcb2f64 calls
 *     `resetEntityRound` on every INITIATIVE phase including round 1
 *     (TWPhasePreparationManager.java:77-84), so `Entity.newRound` runs before
 *     round 1. The runner resets before turn 1; the reducer has no turn-1
 *     boundary and first resets at turn 2.
 *   - A WEAK replay smoke check: a stand-still runner log folds through the
 *     reducer (`deriveState`) without error and lands on cleared per-turn
 *     fields. It proves the log is replayable. It does NOT prove replay
 *     fidelity, because with `StandStillAIPlayer` nothing is ever dirtied, so
 *     every field is cleared on both sides by construction.
 *
 * D-8's real-bot corpus is pinned in SimulationRunner.replayScope.test.ts:
 * seeds 1-8, four hydrated Atlas units, ten turns, map radius 4. Replay differs
 * on weaponsFiredThisTurn for 15/32 units and damageThisPhase for 10/32.
 * Missing PhaseChanged events leave phase damage uncleared within a turn.
 * Ordinary AttackDeclared/AttackResolved reducers also do not record the
 * runner's fired-weapon bookkeeping; phase markers alone cannot fix that gap.
 * All 32 units have sparse runner activeMASC/EMP keys versus explicit replay
 * defaults. This smoke check normalizes cleared values, so it hides key shape.
 * Deterministic playback does not establish runner-private state equality or
 * authoritative resume. Full fidelity remains separate work; these comments
 * and the scoped contract add no runtime admission fence.
 *
 * The runner is driven by `StandStillAIPlayer`, so nothing but the reset
 * itself touches per-turn fields; this is an ordering and replay-smoke test,
 * not a combat test. Full trajectory equality with `GameEngine.runToCompletion`
 * is deliberately not asserted: `InteractiveSession` isolates its AI RNG from
 * the dice roller (engine/AGENTS.md), so one seed gives different actions.
 */

import {
  GameEventType,
  GamePhase,
  LockState,
  MovementType,
  type IGameState,
  type IPendingPSR,
  type IUnitGameState,
} from '@/types/gameplay';
import { createPhaseChangedEvent } from '@/utils/gameplay/gameEvents/turnPhase';
import { applyEvent, deriveState } from '@/utils/gameplay/gameState';
import {
  runtimeMovementUnit,
  stateWithUnit,
} from '@/utils/gameplay/gameState/__tests__/runtimeMovementState.helpers';

import type { IInvariant } from '../../invariants/types';

import { StandStillAIPlayer } from '../../ai/StandStillAIPlayer';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { SimulationRunner } from '../SimulationRunner';
import { resetTurnState } from '../SimulationRunnerState';

jest.mock('../SimulationRunnerState', () => {
  const actual = jest.requireActual('../SimulationRunnerState');
  return { ...actual, resetTurnState: jest.fn(actual.resetTurnState) };
});

const CONFIG = {
  seed: 7001,
  turnLimit: 3,
  unitCount: { player: 1, opponent: 1 },
  mapRadius: 5,
};

const PER_TURN_FIELDS: readonly (keyof IUnitGameState)[] = [
  'movementThisTurn',
  'hexesMovedThisTurn',
  'movedBackwardThisTurn',
  'usedMechanicalJumpBoosterThisTurn',
  'sprintedThisTurn',
  'isEvading',
  'activeMASC',
  'weaponsFiredThisTurn',
  'pendingPSRs',
  'damageThisPhase',
  'tagDesignated',
  'externalHeatThisTurn',
  'pendingExternalHeat',
];

function runThreeStandStillTurns() {
  const endOfTurnStates: IGameState[] = [];
  const recorder: IInvariant = {
    name: 'record-end-of-turn-state',
    description: 'Captures the runner state handed to the End-phase check',
    severity: 'warning',
    check: (state) => {
      if (state.phase === GamePhase.End) endOfTurnStates.push(state);
      return [];
    },
  };
  const invariantRunner = new InvariantRunner();
  invariantRunner.register(recorder);
  const runner = new SimulationRunner(
    CONFIG.seed,
    invariantRunner,
    undefined,
    () => new StandStillAIPlayer(),
  );
  const result = runner.run(CONFIG);
  return { result, endOfTurnStates };
}

/** Treat absent, false, 0 and [] as the same "cleared" value. */
function cleared(value: unknown): unknown {
  if (value === undefined || value === false || value === 0) return 'clear';
  if (Array.isArray(value) && value.length === 0) return 'clear';
  return value;
}

describe('runner turn loop vs reducer: DIVERGENCE D5 (turn-1 reset)', () => {
  it('runner: resetTurnState runs at the top of turns 1, 2 and 3', () => {
    jest.mocked(resetTurnState).mockClear();
    runThreeStandStillTurns();
    expect(
      jest.mocked(resetTurnState).mock.calls.map(([state]) => state.turn),
    ).toEqual([1, 2, 3]);
  });

  it('reducer: no reset happens in turn 1; the first boundary is turn 2', () => {
    const seeded = runtimeMovementUnit({
      id: 'u1',
      hasMASC: true,
      activeMASC: true,
      mascTurnsUsed: 2,
      empShutdownTurns: 2,
      pendingPSRs: [
        {
          entityId: 'u1',
          reason: 'seeded',
          additionalModifier: 0,
          triggerSource: 'attack',
        } satisfies IPendingPSR,
      ],
      movementThisTurn: MovementType.Walk,
      lockState: LockState.Pending,
    });
    let state: IGameState = {
      ...stateWithUnit(seeded),
      turn: 1,
      phase: GamePhase.Initiative,
    };
    for (const [from, to] of [
      [GamePhase.Initiative, GamePhase.Movement],
      [GamePhase.Movement, GamePhase.WeaponAttack],
    ] as const) {
      state = applyEvent(
        state,
        createPhaseChangedEvent('c7-d5', 1, 1, from, to),
      );
    }
    // Turn 1: seeded counters and queue are untouched by the reducer...
    expect(state.units.u1).toMatchObject({
      mascTurnsUsed: 2,
      empShutdownTurns: 2,
    });
    expect(state.units.u1.pendingPSRs).toHaveLength(1);
    // ...whereas the runner's reset, called at turn 1, would advance them.
    const runnerTurn1 = resetTurnState({ ...state, turn: 1 }).units.u1;
    expect(runnerTurn1).toMatchObject({
      mascTurnsUsed: 3,
      empShutdownTurns: 1,
      pendingPSRs: [],
    });
  });
});

describe('runner event log replayed through the reducer (weak smoke check, stand-still units only)', () => {
  it('emits TurnStarted for turns 1-3, which the reducer maps to applyTurnStarted', () => {
    const { result } = runThreeStandStillTurns();
    const turns = result.events
      .filter((event) => event.type === GameEventType.TurnStarted)
      .map((event) => event.turn);
    expect(turns).toEqual([1, 2, 3]);
  });

  it('a stand-still runner log replays through deriveState to the same (all-cleared) per-turn fields; says nothing about dirtied units', () => {
    const { result, endOfTurnStates } = runThreeStandStillTurns();
    const runnerEnd = endOfTurnStates[endOfTurnStates.length - 1];
    const derived = deriveState(`sim-${CONFIG.seed}`, result.events);

    expect(endOfTurnStates).toHaveLength(3);
    expect(Object.keys(derived.units).sort()).toEqual(
      Object.keys(runnerEnd.units).sort(),
    );
    for (const id of Object.keys(runnerEnd.units)) {
      for (const field of PER_TURN_FIELDS) {
        expect([id, field, cleared(derived.units[id][field])]).toEqual([
          id,
          field,
          cleared(runnerEnd.units[id][field]),
        ]);
      }
    }
  });
});
