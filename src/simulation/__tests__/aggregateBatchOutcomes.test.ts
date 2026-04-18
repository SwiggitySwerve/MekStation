/**
 * Unit tests for `aggregateBatchOutcomes`.
 *
 * Covers every scenario from the combat-resolution + after-combat-report
 * spec deltas: win probability, percentile stats, frequency counters,
 * per-unit survival, most-likely-outcome tie handling, error exclusion,
 * and the empty-input contract.
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/after-combat-report/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type {
  IGameEvent,
  IShutdownCheckPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import {
  GameEventType,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IBatchOutcome } from '../batchOutcome';

import { aggregateBatchOutcomes } from '../aggregateBatchOutcomes';

// =============================================================================
// Test fixtures
// =============================================================================

function makeEvent(
  type: GameEventType,
  payload: unknown,
  sequence = 0,
): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: 'game-fixture',
    sequence,
    timestamp: '2026-04-17T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Heat,
    type,
    payload: payload as IGameEvent['payload'],
  };
}

function makeReport(opts: {
  winner: GameSide | 'draw';
  turnCount: number;
  units: readonly { id: string; side: GameSide }[];
  shutdownUnitIds?: readonly string[];
  destroyedUnitIds?: readonly string[];
}): IPostBattleReport {
  const log: IGameEvent[] = [];
  let seq = 0;
  for (const unitId of opts.shutdownUnitIds ?? []) {
    log.push(
      makeEvent(
        GameEventType.ShutdownCheck,
        {
          unitId,
          heatLevel: 26,
          targetNumber: 8,
          roll: 4,
          shutdownOccurred: true,
        } satisfies IShutdownCheckPayload,
        seq++,
      ),
    );
  }
  for (const unitId of opts.destroyedUnitIds ?? []) {
    log.push(
      makeEvent(
        GameEventType.UnitDestroyed,
        {
          unitId,
          cause: 'damage',
        } satisfies IUnitDestroyedPayload,
        seq++,
      ),
    );
  }
  return {
    version: 1,
    matchId: 'fixture',
    winner: opts.winner,
    reason: 'destruction',
    turnCount: opts.turnCount,
    units: opts.units.map((u) => ({
      unitId: u.id,
      side: u.side,
      designation: u.id,
      damageDealt: 0,
      damageReceived: 0,
      kills: 0,
      heatProblems: 0,
      physicalAttacks: 0,
      xpPending: true as const,
    })),
    mvpUnitId: null,
    log,
  };
}

function makeOutcome(
  runIndex: number,
  baseSeed: number,
  report: IPostBattleReport,
): IBatchOutcome {
  return { runIndex, seed: baseSeed + runIndex, durationMs: 1, report };
}

function makeErrorOutcome(runIndex: number, baseSeed: number): IBatchOutcome {
  return {
    runIndex,
    seed: baseSeed + runIndex,
    durationMs: 1,
    error: 'Synthetic failure',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('aggregateBatchOutcomes', () => {
  // ---- Empty handling ------------------------------------------------------
  describe('empty input', () => {
    it('returns a well-formed zero result for empty outcomes', () => {
      const result = aggregateBatchOutcomes([]);

      expect(result.totalRuns).toBe(0);
      expect(result.erroredRuns).toBe(0);
      expect(result.winProbability).toEqual({
        player: 0,
        opponent: 0,
        draw: 0,
      });
      expect(result.turnCount).toEqual({
        mean: 0,
        median: 0,
        p25: 0,
        p75: 0,
        p90: 0,
        min: 0,
        max: 0,
      });
      expect(result.heatShutdownFrequency).toEqual({
        player: 0,
        opponent: 0,
      });
      expect(result.mechDestroyedFrequency).toEqual({
        player: 0,
        opponent: 0,
      });
      expect(result.perUnitSurvival).toEqual({});
      expect(result.mostLikelyOutcome).toBe('draw');
    });

    it('returns empty-shaped result when every outcome errored, but preserves counts', () => {
      const outcomes = [
        makeErrorOutcome(0, 100),
        makeErrorOutcome(1, 100),
        makeErrorOutcome(2, 100),
      ];

      const result = aggregateBatchOutcomes(outcomes, 100);
      expect(result.totalRuns).toBe(3);
      expect(result.erroredRuns).toBe(3);
      expect(result.winProbability).toEqual({
        player: 0,
        opponent: 0,
        draw: 0,
      });
      expect(result.mostLikelyOutcome).toBe('draw');
    });
  });

  // ---- Win probability + most likely outcome -------------------------------
  describe('win probability', () => {
    it('computes player/opponent/draw fractions that sum to 1.0', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes: IBatchOutcome[] = [];
      // 62 player wins, 30 opponent, 8 draws — 100 total
      for (let i = 0; i < 62; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({ winner: GameSide.Player, turnCount: 8, units }),
          ),
        );
      }
      for (let i = 62; i < 92; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({ winner: GameSide.Opponent, turnCount: 12, units }),
          ),
        );
      }
      for (let i = 92; i < 100; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({ winner: 'draw', turnCount: 30, units }),
          ),
        );
      }

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.winProbability.player).toBeCloseTo(0.62, 6);
      expect(result.winProbability.opponent).toBeCloseTo(0.3, 6);
      expect(result.winProbability.draw).toBeCloseTo(0.08, 6);
      const sum =
        result.winProbability.player +
        result.winProbability.opponent +
        result.winProbability.draw;
      expect(sum).toBeCloseTo(1.0, 6);
      expect(result.mostLikelyOutcome).toBe(GameSide.Player);
    });

    it('excludes errored outcomes from the probability denominator', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes: IBatchOutcome[] = [];
      for (let i = 0; i < 10; i++) outcomes.push(makeErrorOutcome(i, 0));
      for (let i = 10; i < 55; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({ winner: GameSide.Player, turnCount: 5, units }),
          ),
        );
      }
      for (let i = 55; i < 91; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({ winner: GameSide.Opponent, turnCount: 7, units }),
          ),
        );
      }
      for (let i = 91; i < 100; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({ winner: 'draw', turnCount: 30, units }),
          ),
        );
      }

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.totalRuns).toBe(100);
      expect(result.erroredRuns).toBe(10);
      // 45 / 90, 36 / 90, 9 / 90
      expect(result.winProbability.player).toBeCloseTo(0.5, 6);
      expect(result.winProbability.opponent).toBeCloseTo(0.4, 6);
      expect(result.winProbability.draw).toBeCloseTo(0.1, 6);
    });

    it('resolves player/opponent ties to "draw" regardless of draw count', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes = [
        makeOutcome(
          0,
          0,
          makeReport({ winner: GameSide.Player, turnCount: 5, units }),
        ),
        makeOutcome(
          1,
          0,
          makeReport({ winner: GameSide.Opponent, turnCount: 5, units }),
        ),
        makeOutcome(2, 0, makeReport({ winner: 'draw', turnCount: 5, units })),
      ];

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.winProbability.player).toBeCloseTo(1 / 3, 6);
      expect(result.winProbability.opponent).toBeCloseTo(1 / 3, 6);
      expect(result.mostLikelyOutcome).toBe('draw');
    });

    it('returns "draw" as mostLikelyOutcome when all outcomes are draws', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes = Array.from({ length: 5 }, (_, i) =>
        makeOutcome(i, 0, makeReport({ winner: 'draw', turnCount: 30, units })),
      );

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.winProbability.draw).toBeCloseTo(1.0, 6);
      expect(result.mostLikelyOutcome).toBe('draw');
    });
  });

  // ---- Turn count percentiles ---------------------------------------------
  describe('turn count statistics', () => {
    it('computes mean / median / percentiles / min / max', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const turns = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
      const outcomes = turns.map((t, i) =>
        makeOutcome(
          i,
          0,
          makeReport({ winner: GameSide.Player, turnCount: t, units }),
        ),
      );

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.turnCount.min).toBe(6);
      expect(result.turnCount.max).toBe(24);
      expect(result.turnCount.mean).toBe(15);
      // Linear-interp percentile of [6..24] (10 items, step 2):
      //   p50 = 15, p25 = 10.5, p75 = 19.5, p90 = 22.2
      expect(result.turnCount.median).toBeCloseTo(15, 6);
      expect(result.turnCount.p25).toBeCloseTo(10.5, 6);
      expect(result.turnCount.p75).toBeCloseTo(19.5, 6);
      expect(result.turnCount.p90).toBeCloseTo(22.2, 6);
    });

    it('handles single-element turn count without NaN', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes = [
        makeOutcome(
          0,
          0,
          makeReport({ winner: GameSide.Player, turnCount: 7, units }),
        ),
      ];
      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.turnCount.min).toBe(7);
      expect(result.turnCount.max).toBe(7);
      expect(result.turnCount.mean).toBe(7);
      expect(result.turnCount.median).toBe(7);
      expect(result.turnCount.p25).toBe(7);
      expect(result.turnCount.p75).toBe(7);
      expect(result.turnCount.p90).toBe(7);
    });
  });

  // ---- Heat shutdown frequency --------------------------------------------
  describe('heat shutdown frequency', () => {
    it('counts each match with at least one shutdown once per side', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'p2', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes: IBatchOutcome[] = [];
      // 18 matches with at least one player shutdown
      for (let i = 0; i < 18; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: GameSide.Opponent,
              turnCount: 10,
              units,
              shutdownUnitIds: ['p1', 'p2'], // multiple shutdowns count once
            }),
          ),
        );
      }
      // 9 matches with at least one opponent shutdown
      for (let i = 18; i < 27; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: GameSide.Player,
              turnCount: 10,
              units,
              shutdownUnitIds: ['o1'],
            }),
          ),
        );
      }
      // 73 clean matches
      for (let i = 27; i < 100; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: GameSide.Player,
              turnCount: 10,
              units,
            }),
          ),
        );
      }

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.heatShutdownFrequency.player).toBeCloseTo(0.18, 6);
      expect(result.heatShutdownFrequency.opponent).toBeCloseTo(0.09, 6);
    });
  });

  // ---- Mech destroyed frequency -------------------------------------------
  describe('mech destroyed frequency', () => {
    it('counts each match with one or more destroyed units once per side', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'p2', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes: IBatchOutcome[] = [];
      // 50 matches: exactly 1 player mech destroyed
      for (let i = 0; i < 50; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: GameSide.Opponent,
              turnCount: 10,
              units,
              destroyedUnitIds: ['p1'],
            }),
          ),
        );
      }
      // 20 matches: 2 player mechs destroyed
      for (let i = 50; i < 70; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: GameSide.Opponent,
              turnCount: 12,
              units,
              destroyedUnitIds: ['p1', 'p2'],
            }),
          ),
        );
      }
      // 30 matches: no destruction
      for (let i = 70; i < 100; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: 'draw',
              turnCount: 30,
              units,
            }),
          ),
        );
      }

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.mechDestroyedFrequency.player).toBeCloseTo(0.7, 6);
      expect(result.mechDestroyedFrequency.opponent).toBe(0);
    });
  });

  // ---- Per-unit survival --------------------------------------------------
  describe('perUnitSurvival', () => {
    it('computes survival rate per unit id', () => {
      const units = [
        { id: 'p1-locust', side: GameSide.Player },
        { id: 'o1-atlas', side: GameSide.Opponent },
      ];
      const outcomes: IBatchOutcome[] = [];
      // 81 of 100 runs: p1-locust survives
      for (let i = 0; i < 81; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: GameSide.Player,
              turnCount: 10,
              units,
            }),
          ),
        );
      }
      // 19 of 100 runs: p1-locust destroyed
      for (let i = 81; i < 100; i++) {
        outcomes.push(
          makeOutcome(
            i,
            0,
            makeReport({
              winner: GameSide.Opponent,
              turnCount: 12,
              units,
              destroyedUnitIds: ['p1-locust'],
            }),
          ),
        );
      }

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.perUnitSurvival['p1-locust']).toBeCloseTo(0.81, 6);
      expect(result.perUnitSurvival['o1-atlas']).toBeCloseTo(1.0, 6);
    });

    it('reports 0.0 survival for units destroyed in every run', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'op1-locust', side: GameSide.Opponent },
      ];
      const outcomes = Array.from({ length: 100 }, (_, i) =>
        makeOutcome(
          i,
          0,
          makeReport({
            winner: GameSide.Player,
            turnCount: 5,
            units,
            destroyedUnitIds: ['op1-locust'],
          }),
        ),
      );

      const result = aggregateBatchOutcomes(outcomes, 0);
      expect(result.perUnitSurvival['op1-locust']).toBe(0);
      expect(result.perUnitSurvival['p1']).toBe(1);
    });
  });

  // ---- Base seed round-trip -----------------------------------------------
  describe('baseSeed reporting', () => {
    it('includes the supplied baseSeed verbatim', () => {
      const result = aggregateBatchOutcomes([], 9183);
      expect(result.baseSeed).toBe(9183);
    });

    it('derives baseSeed from outcome[0] when not supplied', () => {
      const units = [
        { id: 'p1', side: GameSide.Player },
        { id: 'o1', side: GameSide.Opponent },
      ];
      const outcomes = [
        makeOutcome(
          0,
          777,
          makeReport({ winner: GameSide.Player, turnCount: 5, units }),
        ),
      ];
      const result = aggregateBatchOutcomes(outcomes);
      expect(result.baseSeed).toBe(777);
    });
  });
});
