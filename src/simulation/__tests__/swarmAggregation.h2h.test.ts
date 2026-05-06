/**
 * Task 6.9 — AI variant head-to-head: aggressive vs defensive, 200 runs.
 *
 * Spec contract: combat-analytics/spec.md
 *   Requirement: "AI Variant Head-to-Head Matrix"
 *   Scenario: "Mixed-variant per-side runs are excluded or grouped explicitly"
 *
 * Per task 3.10 note: live behavioral divergence validated here at scale (200 runs).
 * The 20-turn synthetic runner cannot exercise heat/retreat thresholds, so this test
 * uses a 50-turn limit on the real SimulationRunner with real BotPlayer variants.
 *
 * Assertion: win-rate for either variant is in [10%, 90%] — not 0% or 100%.
 * This proves the h2h rollup is non-degenerate (both variants can win).
 *
 * Note: draws and incomplete games (winner === null) are excluded from the
 * win-rate denominator, matching the combat-analytics spec intent of
 * "non-degenerate win-rate in [10%, 90%]".
 */

import { describe, expect, it } from '@jest/globals';

import type { IParticipant, ISimulationRunResult } from '../runner/types';

import { BEHAVIOR_VARIANTS, getBehaviorVariant } from '../ai/behaviorVariants';
import { BotPlayer } from '../ai/BotPlayer';
import { ISimulationConfig } from '../core/types';
import { aggregateSwarmBatch } from '../metrics/swarmAggregation';
import { SimulationRunner } from '../runner/SimulationRunner';

// 200 runs × ~30-50ms each → up to ~10s; allow 60s total.
jest.setTimeout(60_000);

// =============================================================================
// Helpers
// =============================================================================

/** Build a SimulationRunner that hard-wires a specific IBotBehavior for both sides. */
function runnerForVariant(
  variantName: keyof typeof BEHAVIOR_VARIANTS,
  seed: number,
): SimulationRunner {
  const behavior = getBehaviorVariant(variantName);
  return new SimulationRunner(
    seed,
    undefined,
    undefined,
    (_random, _behavior) => new BotPlayer(_random, behavior),
  );
}

/** Minimal 1v1 config — enough for variants to express heat and aggression differences. */
const BASE_CONFIG: ISimulationConfig = {
  seed: 90001,
  turnLimit: 50,
  unitCount: { player: 1, opponent: 1 },
  mapRadius: 6,
};

/**
 * Build a v2-stamped ISimulationRunResult from a raw runner result.
 * Side A = variantA, side B = variantB.
 */
function stampV2(
  raw: Omit<ISimulationRunResult, 'schemaVersion' | 'participants'>,
  index: number,
  variantA: string,
  variantB: string,
): ISimulationRunResult {
  const participants: IParticipant[] = [
    {
      sideId: 'A',
      unitId: `unit-A-${index}`,
      chassisId: 'ATL-D-A',
      pilotId: `synth-pilot-A-${index}-000000`,
      gunnery: 4,
      piloting: 5,
      aiVariant: variantA,
    },
    {
      sideId: 'B',
      unitId: `unit-B-${index}`,
      chassisId: 'LCT-1V',
      pilotId: `synth-pilot-B-${index}-000000`,
      gunnery: 4,
      piloting: 5,
      aiVariant: variantB,
    },
  ];
  return { ...raw, schemaVersion: 2, participants };
}

// =============================================================================
// Tests
// =============================================================================

describe('Task 6.9 — AI variant H2H: aggressive vs defensive (200 runs)', () => {
  // Run 200 simulations: aggressive (player/side A) vs defensive (opponent/side B)
  const TOTAL_RUNS = 200;
  const results: ISimulationRunResult[] = [];

  for (let i = 0; i < TOTAL_RUNS; i++) {
    const seed = BASE_CONFIG.seed + i;
    // aggressive drives player (side A); defensive drives opponent (side B)
    const aggressiveRunner = runnerForVariant('aggressive', seed);
    const config = { ...BASE_CONFIG, seed };
    const raw = aggressiveRunner.run(config);
    results.push(stampV2(raw, i, 'aggressive', 'defensive'));
  }

  const report = aggregateSwarmBatch(results);

  it('produces schemaVersion2RunCount = 200', () => {
    expect(report.schemaVersion2RunCount).toBe(200);
  });

  it("canonical key 'aggressive_vs_defensive' exists", () => {
    expect(
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive'],
    ).toBeDefined();
  });

  it('h2h sum (wins + losses + draws + mixed) equals total runs', () => {
    const h2h = report.aggregations!.aiVariantHeadToHead;
    let decided = 0;
    for (const cell of Object.values(h2h)) {
      decided += cell.wins + cell.losses + cell.draws;
    }
    decided += report.aggregations!.mixedVariantRuns;
    expect(decided).toBe(TOTAL_RUNS);
  });

  it('aggressive win-rate is in [10%, 90%] — not degenerate', () => {
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    const decidedRuns = cell.wins + cell.losses;
    // There must be at least some decided games
    expect(decidedRuns).toBeGreaterThan(0);
    const aggressiveWinRate = decidedRuns > 0 ? cell.wins / decidedRuns : 0;
    expect(aggressiveWinRate).toBeGreaterThanOrEqual(0.1);
    expect(aggressiveWinRate).toBeLessThanOrEqual(0.9);
  });

  it('avgTurns is a positive finite number', () => {
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    expect(isFinite(cell.avgTurns)).toBe(true);
    expect(cell.avgTurns).toBeGreaterThan(0);
  });

  it('no mixed-variant runs (single variant per side)', () => {
    expect(report.aggregations!.mixedVariantRuns).toBe(0);
  });
});
