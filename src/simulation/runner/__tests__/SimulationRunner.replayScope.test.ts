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

describe('standalone runner-log replay scope', () => {
  let samples: readonly RunnerReplaySample[];
  beforeAll(() => {
    samples = RUNNER_REPLAY_SEEDS.map(runReplayCorpusSample);
  });

  it.each(RUNNER_REPLAY_SEEDS)(
    'preserves ordered deterministic playback and turn/terminal interpretation for seed %i',
    (seed) => {
      const sample = samples.find((entry) => entry.seed === seed)!;
      const { gameId, result, originalEvents, runnerState, replayState } =
        sample;

      expect(result.turns).toBe(RUNNER_REPLAY_CONFIG.turnLimit);
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
    expect(
      samples.map((sample) => ({
        seed: sample.seed,
        firedWeapons: replayMismatchCount(sample, 'weaponsFiredThisTurn'),
        phaseDamage: replayMismatchCount(sample, 'damageThisPhase'),
      })),
    ).toEqual([
      { seed: 1, firedWeapons: 1, phaseDamage: 2 },
      { seed: 2, firedWeapons: 1, phaseDamage: 1 },
      { seed: 3, firedWeapons: 1, phaseDamage: 0 },
      { seed: 4, firedWeapons: 2, phaseDamage: 1 },
      { seed: 5, firedWeapons: 3, phaseDamage: 2 },
      { seed: 6, firedWeapons: 3, phaseDamage: 2 },
      { seed: 7, firedWeapons: 1, phaseDamage: 1 },
      { seed: 8, firedWeapons: 3, phaseDamage: 1 },
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
    ).toEqual({ firedWeapons: 15, phaseDamage: 10 });
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
