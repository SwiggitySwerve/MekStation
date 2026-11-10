/**
 * D-8: deterministic playback is narrower than runner-private state equality.
 *
 * @spec openspec/changes/scope-runner-log-replay/specs/simulation-system/spec.md
 * @spec openspec/changes/scope-runner-log-replay/specs/game-state-management/spec.md
 */
import type { IGameEndedPayload } from '@/types/gameplay';

import { GameEventType, GameStatus, ReplaySource } from '@/types/gameplay';
import { deriveState, deriveStateAtSequence } from '@/utils/gameplay/gameState';

import {
  replayMismatchCount,
  RUNNER_REPLAY_CONFIG,
  RUNNER_REPLAY_SEEDS,
  runReplayCorpusSample,
  type RunnerReplaySample,
} from './SimulationRunner.replayScope.test-helpers';

// How each corpus game ends. C-1b removed the runner's flanking-and-turning
// PSR rolls, which shifted its seeded dice stream: seed 4 is now decided by
// destruction during turn 6 instead of running to the turn limit. The other
// seeds still run to turn 10.
const TURN_LIMIT_OUTCOME = {
  turns: RUNNER_REPLAY_CONFIG.turnLimit,
  endedBeforeEndPhase: false,
  winner: 'draw',
  reason: 'turn_limit',
} as const;
const EXPECTED_OUTCOME: Readonly<
  Record<
    (typeof RUNNER_REPLAY_SEEDS)[number],
    {
      readonly turns: number;
      readonly endedBeforeEndPhase: boolean;
      readonly winner: string;
      readonly reason: string;
    }
  >
> = {
  1: TURN_LIMIT_OUTCOME,
  2: TURN_LIMIT_OUTCOME,
  3: TURN_LIMIT_OUTCOME,
  4: {
    turns: 6,
    endedBeforeEndPhase: true,
    winner: 'player',
    reason: 'destruction',
  },
  5: TURN_LIMIT_OUTCOME,
  6: TURN_LIMIT_OUTCOME,
  7: TURN_LIMIT_OUTCOME,
  8: TURN_LIMIT_OUTCOME,
};

describe('standalone runner-log replay scope', () => {
  let samples: readonly RunnerReplaySample[];
  beforeAll(() => {
    samples = RUNNER_REPLAY_SEEDS.map(runReplayCorpusSample);
  });

  it.each(RUNNER_REPLAY_SEEDS)(
    'preserves ordered deterministic playback and turn/terminal interpretation for seed %i',
    (seed) => {
      const sample = samples.find((entry) => entry.seed === seed)!;
      const {
        gameId,
        result,
        originalEvents,
        runnerState,
        replayState,
        endedBeforeEndPhase,
      } = sample;
      const expected = EXPECTED_OUTCOME[seed];

      expect(result.turns).toBe(expected.turns);
      expect(endedBeforeEndPhase).toBe(expected.endedBeforeEndPhase);
      expect(result.events[0].type).toBe(GameEventType.GameCreated);
      for (const [sequence, event] of result.events.entries()) {
        expect(event.sequence).toBe(sequence);
        expect(event.gameId).toBe(gameId);
        expect(event.replaySource).toBe(ReplaySource.Swarm);
        if (event.type === GameEventType.TurnStarted) {
          expect(
            deriveStateAtSequence(gameId, result.events, sequence).turn,
          ).toBe(event.turn);
        }
      }

      // Removing TurnStarted from the producer leaves replay at turn 0. This
      // must fail even though the runner's private loop still reaches turn 10.
      expect(replayState.turn).toBe(runnerState.turn);
      expect(Object.keys(replayState.units).sort()).toEqual(
        Object.keys(runnerState.units).sort(),
      );
      const terminal = result.events[result.events.length - 1];
      expect(terminal.type).toBe(GameEventType.GameEnded);
      const outcome = terminal.payload as IGameEndedPayload;
      expect({ winner: outcome.winner, reason: outcome.reason }).toEqual({
        winner: expected.winner,
        reason: expected.reason,
      });
      expect(replayState.status).toBe(GameStatus.Completed);
      expect(replayState.result).toEqual({
        winner: outcome.winner,
        reason: outcome.reason,
      });
      expect(replayState.turn).toBe(outcome.turns);
      expect(deriveState(gameId, result.events)).toStrictEqual(replayState);
      expect(JSON.stringify(result.events)).toBe(originalEvents);
    },
  );

  it('characterizes the current fired-weapon and phase-damage gaps on the 32-unit corpus', () => {
    expect(samples.map(({ seed }) => seed)).toEqual(RUNNER_REPLAY_SEEDS);
    expect(
      samples.flatMap(({ runnerState }) => Object.keys(runnerState.units)),
    ).toHaveLength(32);
    // Re-pinned for C-1b's dice-stream shift (the runner no longer rolls
    // flanking-and-turning PSRs). Was 1/2, 1/1, 1/0, 2/1, 3/2, 3/2, 1/1 and
    // 3/1 as firedWeapons/phaseDamage for seeds 1-8 (totals 15 and 10).
    // Seed 4 ends during turn 6, so its runner state is the last state the
    // runner showed its invariants (after the weapon attack, before the PSR
    // phase that follows it), not an End-phase state.
    expect(
      samples.map((sample) => ({
        seed: sample.seed,
        firedWeapons: replayMismatchCount(sample, 'weaponsFiredThisTurn'),
        phaseDamage: replayMismatchCount(sample, 'damageThisPhase'),
      })),
    ).toEqual([
      { seed: 1, firedWeapons: 3, phaseDamage: 2 },
      { seed: 2, firedWeapons: 1, phaseDamage: 1 },
      { seed: 3, firedWeapons: 3, phaseDamage: 1 },
      { seed: 4, firedWeapons: 2, phaseDamage: 0 },
      { seed: 5, firedWeapons: 1, phaseDamage: 1 },
      { seed: 6, firedWeapons: 2, phaseDamage: 0 },
      { seed: 7, firedWeapons: 3, phaseDamage: 1 },
      { seed: 8, firedWeapons: 2, phaseDamage: 1 },
    ]);
    expect(
      samples.reduce(
        (total, sample) => ({
          firedWeapons:
            total.firedWeapons +
            replayMismatchCount(sample, 'weaponsFiredThisTurn'),
          phaseDamage:
            total.phaseDamage + replayMismatchCount(sample, 'damageThisPhase'),
        }),
        { firedWeapons: 0, phaseDamage: 0 },
      ),
    ).toEqual({ firedWeapons: 17, phaseDamage: 7 });
    for (const { result } of samples) {
      expect(
        result.events.some(
          (event) => event.type === GameEventType.PhaseChanged,
        ),
      ).toBe(false);
    }
  });

  it('characterizes sparse runner keys versus explicit MASC/EMP replay defaults', () => {
    const replayDefaults = {
      activeMASC: false,
      empInterferenceTurns: 0,
      empShutdownTurns: 0,
    } as const;
    for (const { runnerState, replayState } of samples) {
      for (const unit of Object.values(runnerState.units)) {
        const replayUnit = replayState.units[unit.id];
        for (const [field, value] of Object.entries(replayDefaults)) {
          expect(Object.hasOwn(unit, field)).toBe(false);
          expect(Object.hasOwn(replayUnit, field)).toBe(true);
          expect(replayUnit).toHaveProperty(field, value);
        }
      }
    }
  });
});
