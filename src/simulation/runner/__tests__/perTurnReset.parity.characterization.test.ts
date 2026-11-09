/**
 * C7 characterization (state-machine audit, Wave 2 #16): per-turn unit reset,
 * runner vs reducer.
 *
 * Two code paths reset per-turn unit fields:
 *   - the reducer (`applyPhaseChanged` / `applyTurnStarted`), which serves the
 *     interactive session, `GameEngine.runToCompletion`, the multiplayer server
 *     and P2P replay;
 *   - the simulation runner (`resetTurnState`), which serves swarm, batch and
 *     validate-combat.
 *
 * This file pins what each does TODAY, field by field, over three turns.
 * `it` titles that start with `DIVERGENCE Dn` pin a place where the two paths
 * disagree. They are not endorsements: the pinned MegaMek rule (48fcb2f64) is
 * named beside each so a later change can flip the assertion deliberately.
 * Nothing here edits production code.
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameState,
  type IPendingPSR,
  type IUnitGameState,
} from '@/types/gameplay';
import { createPhaseChangedEvent } from '@/utils/gameplay/gameEvents/turnPhase';
import {
  advancePhase,
  resolveHeatPhase,
  resolvePendingPSRs,
} from '@/utils/gameplay/gameSession';
import { applyEvent } from '@/utils/gameplay/gameState';
import {
  runtimeMovementUnit,
  stateWithUnit,
} from '@/utils/gameplay/gameState/__tests__/runtimeMovementState.helpers';
import { stunnedVehicleSession } from '@/utils/gameplay/gameState/__tests__/vehicleCrewStun.helpers';
import { checkPhaseDamagePSR } from '@/utils/gameplay/pilotingSkillRolls';

import type { IViolation } from '../../invariants/types';

import { StandStillAIPlayer } from '../../ai/StandStillAIPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { runMovementPhase } from '../phases/movement';
import { runPhysicalAttackPhase } from '../phases/physicalAttack';
import { runHeatPhase } from '../phases/postCombatHeat';
import { runPSRPhase } from '../phases/postCombatPsr';
import { applyDamageThresholdPSR } from '../phases/weaponAttackHitResolution.helpers';
import { runAttackPhase } from '../phases/weaponAttackRunner';
import { resetTurnState } from '../SimulationRunnerState';
import { createMinimalGrid } from '../SimulationRunnerSupport';
import {
  createInteractiveHeatSession,
  createRunnerHeatState,
  createRunnerUnit,
  fixedRoller,
  withInteractiveUnit,
} from './heatEnvironmentParity.behavior.test-helpers';

const GAME_ID = 'c7-characterization';
const UNIT_ID = 'u1';

const QUEUED_PSR: IPendingPSR = {
  entityId: UNIT_ID,
  reason: 'twenty-plus-damage',
  additionalModifier: 0,
  triggerSource: '20+_damage',
};

/** What a unit accumulates during one turn of play. Re-applied every turn. */
const TRANSIENT_DIRT: Partial<IUnitGameState> = {
  movementThisTurn: MovementType.Run,
  hexesMovedThisTurn: 5,
  movedBackwardThisTurn: true,
  usedMechanicalJumpBoosterThisTurn: true,
  sprintedThisTurn: true,
  isEvading: true,
  evasionBonus: 1,
  activeMASC: true,
  weaponsFiredThisTurn: ['w1'],
  pendingPSRs: [QUEUED_PSR],
  damageThisPhase: 15,
  tagDesignated: true,
  externalHeatThisTurn: 10,
  pendingExternalHeat: 4,
  isSpotting: true,
  spotTargetId: 'opponent-1',
  isLoadingOrUnloadingCargo: true,
  lockState: LockState.Locked,
  pendingAction: { kind: 'declared' },
};

/** Counters that carry across turns, plus state that must NOT be reset. */
const PERSISTENT: Partial<IUnitGameState> = {
  hasMASC: true,
  mascTurnsUsed: 1,
  empInterferenceTurns: 3,
  empShutdownTurns: 3,
  isStuck: true,
  canUnstickByJumping: true,
  hullDown: true,
  prone: true,
  shutdown: true,
  isRetreating: true,
  pilotWounds: 2,
  narcedBy: [GameSide.Opponent],
  infernoBurning: true,
};
const PERSISTENT_KEYS = Object.keys(PERSISTENT).filter(
  (key) =>
    !['mascTurnsUsed', 'empInterferenceTurns', 'empShutdownTurns'].includes(
      key,
    ),
) as (keyof IUnitGameState)[];

/** Fields where both paths agree after a turn boundary. */
const AGREEING_FIELDS: readonly (keyof IUnitGameState)[] = [
  'movementThisTurn',
  'hexesMovedThisTurn',
  'movedBackwardThisTurn',
  'usedMechanicalJumpBoosterThisTurn',
  'sprintedThisTurn',
  'isEvading',
  'evasionBonus',
  'activeMASC',
  'mascTurnsUsed',
  'mascFailureLevelIncreasedLastTurn',
  'weaponsFiredThisTurn',
  'pendingPSRs',
  'damageThisPhase',
  'tagDesignated',
  'externalHeatThisTurn',
  'pendingExternalHeat',
  'empShutdownTurns',
  'empInterferenceTurns',
];

interface IBoundarySnapshot {
  readonly turn: number;
  readonly reducer: IUnitGameState;
  readonly reducerAtMovement: IUnitGameState;
  readonly runner: IUnitGameState;
}

function withDirt(state: IGameState): IGameState {
  const unit = state.units[UNIT_ID];
  return { ...state, units: { [UNIT_ID]: { ...unit, ...TRANSIENT_DIRT } } };
}

function phaseChange(
  state: IGameState,
  turn: number,
  from: GamePhase,
  to: GamePhase,
): IGameState {
  return applyEvent(
    state,
    createPhaseChangedEvent(GAME_ID, turn * 10 + to.length, turn, from, to),
  );
}

/**
 * Turn 1 ends, turns 2 and 3 begin. The reducer path applies the same
 * `PhaseChanged(End -> Initiative)` event `advancePhase` emits; the runner
 * path calls `resetTurnState` the way `SimulationRunner.run` does at the top
 * of each turn.
 */
function runThreeTurns(base: IUnitGameState): readonly IBoundarySnapshot[] {
  let reducer: IGameState = {
    ...stateWithUnit(base),
    turn: 1,
    phase: GamePhase.End,
  };
  let runner = reducer;
  const snapshots: IBoundarySnapshot[] = [];
  for (const turn of [2, 3]) {
    reducer = withDirt(reducer);
    runner = withDirt(runner);
    reducer = phaseChange(reducer, turn, GamePhase.End, GamePhase.Initiative);
    runner = resetTurnState({ ...runner, turn });
    const reducerAtBoundary = reducer.units[UNIT_ID];
    reducer = phaseChange(
      reducer,
      turn,
      GamePhase.Initiative,
      GamePhase.Movement,
    );
    snapshots.push({
      turn,
      reducer: reducerAtBoundary,
      reducerAtMovement: reducer.units[UNIT_ID],
      runner: runner.units[UNIT_ID],
    });
    reducer = { ...reducer, phase: GamePhase.End };
    runner = { ...runner, phase: GamePhase.End };
  }
  return snapshots;
}

const SNAPSHOTS = runThreeTurns(
  runtimeMovementUnit({ id: UNIT_ID, ...PERSISTENT }),
);

describe('per-turn reset parity: runner resetTurnState vs reducer boundary', () => {
  it('runs the same two boundaries (turn 2 and turn 3) on both paths', () => {
    expect(SNAPSHOTS.map((snapshot) => snapshot.turn)).toEqual([2, 3]);
  });

  describe.each(AGREEING_FIELDS)('%s', (field) => {
    it.each([2, 3])('is identical on both paths at turn %i', (turn) => {
      const snapshot = SNAPSHOTS.find((candidate) => candidate.turn === turn)!;
      expect(snapshot.runner[field]).toEqual(snapshot.reducer[field]);
    });
  });

  it('resets what the turn dirtied, on both paths', () => {
    for (const { reducer, runner } of SNAPSHOTS) {
      for (const unit of [reducer, runner]) {
        expect(unit).toMatchObject({
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          movedBackwardThisTurn: false,
          usedMechanicalJumpBoosterThisTurn: false,
          sprintedThisTurn: false,
          isEvading: false,
          activeMASC: false,
          weaponsFiredThisTurn: [],
          pendingPSRs: [],
          damageThisPhase: 0,
          tagDesignated: false,
          externalHeatThisTurn: 0,
          pendingExternalHeat: 0,
        });
      }
    }
  });

  it('advances the MASC and EMP-shutdown counters once per boundary on both paths', () => {
    const [turn2, turn3] = SNAPSHOTS;
    // mascTurnsUsed 1 -> 2 -> 3 (active both turns); empShutdownTurns 3 -> 2 -> 1.
    expect(turn2.runner.mascTurnsUsed).toBe(2);
    expect(turn3.runner.mascTurnsUsed).toBe(3);
    expect(turn2.reducer.empShutdownTurns).toBe(2);
    expect(turn3.reducer.empShutdownTurns).toBe(1);
  });

  it('does not advance counters a second time when the reducer enters Movement', () => {
    for (const snapshot of SNAPSHOTS) {
      expect(snapshot.reducerAtMovement.mascTurnsUsed).toBe(
        snapshot.reducer.mascTurnsUsed,
      );
      expect(snapshot.reducerAtMovement.empShutdownTurns).toBe(
        snapshot.reducer.empShutdownTurns,
      );
    }
  });

  it.each(PERSISTENT_KEYS)(
    'never resets persistent state: %s survives on both paths',
    (key) => {
      for (const { reducer, runner } of SNAPSHOTS) {
        expect(reducer[key]).toEqual(PERSISTENT[key]);
        expect(runner[key]).toEqual(PERSISTENT[key]);
      }
    },
  );
});

describe('per-turn reset parity: vehicle crewStunnedPhases (C14)', () => {
  // MegaMek 48fcb2f64 Tank.java:1112-1121 decrements the stun once per round.
  // C14 added advanceVehicleCrewStun at both boundary sites as its own step.
  it('decrements once per boundary on both paths and clamps at zero', () => {
    const start = stunnedVehicleSession().currentState;
    const asVehicle = (state: IGameState): number => {
      const combat = state.units.target.combatState;
      if (combat?.kind !== 'vehicle') throw new Error('Expected a vehicle');
      return combat.state.motive.crewStunnedPhases;
    };
    let reducer: IGameState = { ...start, phase: GamePhase.End };
    let runner = reducer;
    const seen: number[][] = [];
    for (const turn of [start.turn + 1, start.turn + 2, start.turn + 3]) {
      reducer = phaseChange(reducer, turn, GamePhase.End, GamePhase.Initiative);
      runner = resetTurnState({ ...runner, turn });
      seen.push([asVehicle(reducer), asVehicle(runner)]);
      reducer = { ...reducer, phase: GamePhase.End };
      runner = { ...runner, phase: GamePhase.End };
    }
    expect(seen).toEqual([
      [1, 1],
      [0, 0],
      [0, 0],
    ]);
  });
});

describe('per-turn reset parity: pinned divergences', () => {
  const [turn2, turn3] = SNAPSHOTS;

  // D2, FIXED in C7 PR3. MegaMek 48fcb2f64 Entity.newRound (Entity.java:~8240)
  // decrements empInterferenceRounds every round. The reducer already did; the
  // runner set the counter (movementMineDamage.ts) but never decremented it
  // (it stayed at 3 on both boundaries).
  it('D2 (fixed): both paths decrement empInterferenceTurns each boundary', () => {
    expect(turn2.reducer.empInterferenceTurns).toBe(2);
    expect(turn3.reducer.empInterferenceTurns).toBe(1);
    expect(turn2.runner.empInterferenceTurns).toBe(2);
    expect(turn3.runner.empInterferenceTurns).toBe(1);
  });

  // MegaMek Entity.newRound: setSpotting(false); spotTargetId = NONE.
  // Dormant today: nothing in the runner ever sets isSpotting.
  it('DIVERGENCE D3: runner does not clear isSpotting / spotTargetId', () => {
    expect(turn2.reducer.isSpotting).toBe(false);
    expect(turn2.reducer.spotTargetId).toBeUndefined();
    expect(turn2.runner.isSpotting).toBe(true);
    expect(turn2.runner.spotTargetId).toBe('opponent-1');
  });

  // MegaMek Entity.newRound: loadedThisTurn = unloadedThisTurn = false.
  // Dormant today: only the reducer's ground-object handlers set the flag.
  it('DIVERGENCE D4: runner does not clear isLoadingOrUnloadingCargo', () => {
    expect(turn2.reducer.isLoadingOrUnloadingCargo).toBe(false);
    expect(turn2.runner.isLoadingOrUnloadingCargo).toBe(true);
  });

  // By design: lock state is the interactive lock protocol, which the runner
  // does not have. It stays in applyPhaseChanged.
  it('DIVERGENCE D7 (by design): only the reducer resets lockState / pendingAction', () => {
    expect(turn2.reducer.lockState).toBe(LockState.Pending);
    expect(turn2.reducer.pendingAction).toBeUndefined();
    expect(turn2.runner.lockState).toBe(LockState.Locked);
    expect(turn2.runner.pendingAction).toEqual({ kind: 'declared' });
  });

  // C8 precedent: perTurnMovementState.ts:78 preserves absence so replay
  // digests do not move. The reducer materializes explicit cleared values; the
  // runner leaves a never-set field absent. A shared helper must keep both.
  it('DIVERGENCE D6: key presence differs for a unit that never set the EMP/spotting/cargo fields', () => {
    const plain = runtimeMovementUnit({ id: UNIT_ID });
    let reducer: IGameState = {
      ...stateWithUnit(plain),
      turn: 1,
      phase: GamePhase.End,
    };
    reducer = phaseChange(reducer, 2, GamePhase.End, GamePhase.Initiative);
    const runner = resetTurnState({
      ...stateWithUnit(plain),
      turn: 2,
      phase: GamePhase.End,
    });
    const reducerKeys = Object.keys(reducer.units[UNIT_ID]);
    const runnerKeys = Object.keys(runner.units[UNIT_ID]);
    expect(
      reducerKeys.filter((key) => !runnerKeys.includes(key)).sort(),
    ).toEqual([
      'empInterferenceTurns',
      'empShutdownTurns',
      'isLoadingOrUnloadingCargo',
      'isSpotting',
      'pendingAction',
      'spotTargetId',
    ]);
    expect(runnerKeys.filter((key) => !reducerKeys.includes(key))).toEqual([]);
  });
});

describe('per-phase damage: D1 (fixed in C7 PR3)', () => {
  // MegaMek 48fcb2f64 TWGameManager.resetEntityPhase zeroes damageThisPhase at
  // the start of EVERY phase (TWGameManager.java:1572-1573, called per phase by
  // TWPhasePreparationManager). The 20+ damage PSR reads it per phase
  // (TWGameManager.java:17850-17856). The reducer zeroes it on every
  // PhaseChanged (phaseManagement.ts:27). The runner used to zero it only at
  // turn start, so Movement-phase mine damage counted toward the weapon
  // phase's 20+ threshold; it now zeroes it as each later phase begins
  // (perPhaseDamage.test.ts covers the pooling itself).
  const MOVEMENT_PHASE_DAMAGE = 12;
  const WEAPON_HIT = 10;

  it('reducer: Movement-phase damage does not carry into the weapon phase', () => {
    const base = runtimeMovementUnit({
      id: UNIT_ID,
      damageThisPhase: MOVEMENT_PHASE_DAMAGE,
    });
    let state: IGameState = {
      ...stateWithUnit(base),
      turn: 1,
      phase: GamePhase.Movement,
    };
    state = phaseChange(state, 1, GamePhase.Movement, GamePhase.WeaponAttack);
    expect(state.units[UNIT_ID].damageThisPhase).toBe(0);
    const afterHit = {
      ...state.units[UNIT_ID],
      damageThisPhase: WEAPON_HIT,
    };
    expect(checkPhaseDamagePSR(afterHit)).toBeNull();
  });

  it('runner: Movement-phase damage survives the Movement phase but is zeroed as the attack and physical phases begin', () => {
    const botPlayer = new StandStillAIPlayer();
    const invariantRunner = new InvariantRunner();
    const violations: IViolation[] = [];
    const events: IGameEvent[] = [];
    const random = new SeededRandom(1);
    const grid = createMinimalGrid(3);
    let state = createRunnerHeatState(
      createRunnerUnit({ damageThisPhase: MOVEMENT_PHASE_DAMAGE }),
    );
    state = runMovementPhase({
      state,
      botPlayer,
      grid,
      invariantRunner,
      violations,
      events,
      gameId: GAME_ID,
      random,
    });
    expect(state.units['player-1'].damageThisPhase).toBe(MOVEMENT_PHASE_DAMAGE);
    state = runAttackPhase({
      state,
      botPlayer,
      grid,
      invariantRunner,
      violations,
      events,
      gameId: GAME_ID,
      random,
    });
    expect(state.units['player-1'].damageThisPhase).toBe(0);
    state = {
      ...state,
      units: {
        ...state.units,
        'player-1': { ...state.units['player-1'], damageThisPhase: WEAPON_HIT },
      },
    };
    state = runPhysicalAttackPhase({
      state,
      botPlayer,
      grid,
      invariantRunner,
      violations,
      events,
      gameId: GAME_ID,
      random,
    });
    expect(state.units['player-1'].damageThisPhase).toBe(0);
  });
});

describe('bare TurnStarted: D8 (fixed in C7 PR3)', () => {
  // MegaMek zeroes damageThisPhase at the start of every phase, the first of a
  // round included (TWGameManager.java:1572-1573). The runner's log carries
  // TurnStarted but no PhaseChanged, so the reducer's TurnStarted handler must
  // zero it itself or a replayed runner log keeps stale damage across turns.
  it('zeroes damageThisPhase without a PhaseChanged', () => {
    const state = {
      ...stateWithUnit(
        runtimeMovementUnit({ id: UNIT_ID, damageThisPhase: 15 }),
      ),
      turn: 1,
      phase: GamePhase.End,
    };
    const next = applyEvent(state, {
      ...createPhaseChangedEvent(
        GAME_ID,
        1,
        2,
        GamePhase.End,
        GamePhase.Initiative,
      ),
      type: GameEventType.TurnStarted,
      payload: {},
    });
    expect(next.turn).toBe(2);
    expect(next.units[UNIT_ID].damageThisPhase).toBe(0);
  });
});

describe('Heat-phase shutdown PSR: interactive reference (runner fixed in C7 PR3)', () => {
  // Interactive path: Heat queues the shutdown PSR
  // (gameSessionHeat.effects.ts:82-101) and the End-phase resolvePendingPSRs
  // rolls it. The runner used to queue it in runHeatPhase (heatShutdownPsr.ts)
  // with no PSR phase after Heat, so the next resetTurnState cleared it
  // unrolled; SimulationRunner.run now runs runPSRPhase after the Heat phase
  // (heatShutdownPsr.resolution.test.ts asserts the PSRResolved).
  const SHUTDOWN_HEAT = 40; // >= HEAT_THRESHOLDS.AUTO_SHUTDOWN

  it('interactive: the shutdown PSR queued in Heat is rolled in the End phase', () => {
    let session = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: SHUTDOWN_HEAT,
      }),
      fixedRoller,
    );
    expect(session.currentState.units['player-1'].pendingPSRs).toHaveLength(1);
    session = advancePhase(session); // Heat -> End
    session = resolvePendingPSRs(session, fixedRoller);
    expect(session.currentState.units['player-1'].pendingPSRs).toEqual([]);
    expect(
      session.events.some((event) => event.type === GameEventType.PSRResolved),
    ).toBe(true);
  });
});
