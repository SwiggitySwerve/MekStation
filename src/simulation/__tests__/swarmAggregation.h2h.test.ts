/**
 * Task 6.9 — AI variant head-to-head: 200-run non-degenerate win-rate.
 *
 * Spec contract: combat-analytics/spec.md
 *   Requirement: "AI Variant Head-to-Head Matrix"
 *   Scenario: "Mixed-variant per-side runs are excluded or grouped explicitly"
 *
 * What this test actually validates:
 *   - The h2h rollup produces a non-degenerate win-rate when fed a varied
 *     batch of v2 results (i.e., neither variant is at 0% or 100%).
 *   - Canonical key ordering is correct (alphabetically-first variant name
 *     comes first; wins are recorded from that variant's perspective).
 *   - mixedVariantRuns counter increments for runs that have >1 variant on
 *     a single side (and those runs are excluded from h2h cells).
 *
 * Why synthetic data instead of live SimulationRunner:
 *   The production runner has `MAX_TURNS = 10` (see SimulationRunnerConstants.ts),
 *   which clamps any larger turnLimit. With minimal units and a 10-turn cap,
 *   the engine returns `winner = null` for most runs (no destruction within
 *   the cap), leaving too few decided games to assert meaningful win-rate
 *   bounds. Behavioral divergence between AI variants is validated separately
 *   in `ai-variants-headtohead.test.ts` (Phase 3 task 3.10) at the registry +
 *   structural level. This test focuses on the analytics layer and proves the
 *   h2h aggregation is correctly wired with a controlled, deterministic input.
 *
 * Distribution:
 *   - 200 runs total
 *   - 120 runs: aggressive (side A) vs defensive (side B), 75 A-wins, 40 B-wins, 5 draws
 *   - 60 runs: defensive (side A) vs aggressive (side B), 25 A-wins, 30 B-wins, 5 draws
 *   - 20 runs: mixed-variant on side A (one aggressive + one defensive unit) — excluded
 *
 * Expected canonical key: 'aggressive_vs_defensive' (aggressive < defensive alphabetically).
 *   - wins (aggressive) = 75 (from batch 1) + 30 (from batch 2; aggressive on B won) = 105
 *   - losses (defensive won) = 40 + 25 = 65
 *   - draws = 5 + 5 = 10
 *   - mixedVariantRuns = 20
 */

import { describe, expect, it } from '@jest/globals';

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IParticipant, ISimulationRunResult } from '../runner/types';

import { aggregateSwarmBatch } from '../metrics/swarmAggregation';

// =============================================================================
// Fixtures
// =============================================================================

function makeEvent(type: GameEventType, payload: unknown, seq = 0): IGameEvent {
  return {
    id: `evt-h2h-${seq}`,
    gameId: 'h2h-fixture',
    sequence: seq,
    timestamp: '2026-01-01T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.WeaponAttack,
    type,
    payload: payload as IGameEvent['payload'],
  };
}

function makeParticipant(
  sideId: string,
  unitIdSuffix: string,
  aiVariant: string,
): IParticipant {
  return {
    sideId,
    unitId: `unit-${sideId}-${unitIdSuffix}`,
    chassisId: sideId === 'A' ? 'ATL-D-A' : 'LCT-1V',
    pilotId: `synth-pilot-${sideId}-${unitIdSuffix}-000000`,
    gunnery: 4,
    piloting: 5,
    aiVariant,
  };
}

/** Build a 1v1 v2 result with controlled winner + variant assignments. */
function makeRun(
  index: number,
  winner: 'player' | 'opponent' | 'draw' | null,
  variantA: string,
  variantB: string,
  turns: number,
): ISimulationRunResult {
  return {
    seed: 1_000_000 + index,
    winner,
    turns,
    durationMs: 100,
    events: [
      makeEvent(GameEventType.DamageApplied, {
        unitId: `unit-B-${index}`,
        location: 'CT',
        damage: 10,
        armorRemaining: 5,
        structureRemaining: 10,
        locationDestroyed: false,
        sourceUnitId: `unit-A-${index}`,
      }),
    ],
    violations: [],
    keyMoments: [],
    anomalies: [],
    haltedByCriticalAnomaly: false,
    schemaVersion: 2,
    participants: [
      makeParticipant('A', String(index), variantA),
      makeParticipant('B', String(index), variantB),
    ],
  };
}

/** Build a 2v1 v2 result where side A has mixed variants (aggressive + defensive). */
function makeMixedSideRun(index: number): ISimulationRunResult {
  return {
    seed: 2_000_000 + index,
    winner: 'player',
    turns: 8,
    durationMs: 100,
    events: [],
    violations: [],
    keyMoments: [],
    anomalies: [],
    haltedByCriticalAnomaly: false,
    schemaVersion: 2,
    participants: [
      makeParticipant('A', `${index}-aggro`, 'aggressive'),
      makeParticipant('A', `${index}-def`, 'defensive'),
      makeParticipant('B', String(index), 'aggressive'),
    ],
  };
}

// =============================================================================
// Build the 200-run batch
// =============================================================================

function buildBatch(): readonly ISimulationRunResult[] {
  const results: ISimulationRunResult[] = [];

  // Batch 1 — aggressive (A) vs defensive (B): 75/40/5
  let idx = 0;
  for (let i = 0; i < 75; i++) {
    results.push(makeRun(idx++, 'player', 'aggressive', 'defensive', 7));
  }
  for (let i = 0; i < 40; i++) {
    results.push(makeRun(idx++, 'opponent', 'aggressive', 'defensive', 9));
  }
  for (let i = 0; i < 5; i++) {
    results.push(makeRun(idx++, 'draw', 'aggressive', 'defensive', 10));
  }

  // Batch 2 — defensive (A) vs aggressive (B): 25/30/5
  for (let i = 0; i < 25; i++) {
    results.push(makeRun(idx++, 'player', 'defensive', 'aggressive', 8));
  }
  for (let i = 0; i < 30; i++) {
    results.push(makeRun(idx++, 'opponent', 'defensive', 'aggressive', 6));
  }
  for (let i = 0; i < 5; i++) {
    results.push(makeRun(idx++, 'draw', 'defensive', 'aggressive', 10));
  }

  // Batch 3 — mixed-variant side A: 20 runs (excluded from h2h)
  for (let i = 0; i < 20; i++) {
    results.push(makeMixedSideRun(idx++));
  }

  return results;
}

// =============================================================================
// Tests
// =============================================================================

describe('Task 6.9 — AI variant H2H: aggressive vs defensive (200 runs)', () => {
  const batch = buildBatch();
  const report = aggregateSwarmBatch(batch);

  it('totalRuns = 200', () => {
    expect(report.totalRuns).toBe(200);
    expect(batch.length).toBe(200);
  });

  it('schemaVersion2RunCount = 200', () => {
    expect(report.schemaVersion2RunCount).toBe(200);
  });

  it("canonical key 'aggressive_vs_defensive' exists", () => {
    expect(
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive'],
    ).toBeDefined();
  });

  it('h2h sum (wins + losses + draws) + mixedVariantRuns = total runs', () => {
    const h2h = report.aggregations!.aiVariantHeadToHead;
    let decided = 0;
    for (const cell of Object.values(h2h)) {
      decided += cell.wins + cell.losses + cell.draws;
    }
    decided += report.aggregations!.mixedVariantRuns;
    expect(decided).toBe(200);
  });

  it("mixedVariantRuns = 20 (the 'aggressive+defensive on A' batch)", () => {
    expect(report.aggregations!.mixedVariantRuns).toBe(20);
  });

  it('aggressive wins are tallied from BOTH side-A and side-B placements', () => {
    // Batch 1: aggressive=A, 75 wins (player) → wins++
    // Batch 2: aggressive=B, 30 wins (opponent) → wins++
    // Total aggressive wins = 105
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    expect(cell.wins).toBe(105);
  });

  it('defensive wins are tallied as h2h losses (from aggressive perspective)', () => {
    // Batch 1: aggressive=A, 40 losses (opponent=defensive won) → losses++
    // Batch 2: aggressive=B, 25 losses (player=defensive won) → losses++
    // Total = 65
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    expect(cell.losses).toBe(65);
  });

  it('draws total to 10 across both sub-batches', () => {
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    expect(cell.draws).toBe(10);
  });

  it('aggressive win-rate is in [10%, 90%] — non-degenerate', () => {
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    const decidedRuns = cell.wins + cell.losses;
    expect(decidedRuns).toBeGreaterThan(0);
    const aggressiveWinRate = cell.wins / decidedRuns;
    // 105 / 170 ≈ 0.6176
    expect(aggressiveWinRate).toBeGreaterThanOrEqual(0.1);
    expect(aggressiveWinRate).toBeLessThanOrEqual(0.9);
  });

  it('avgTurns is a positive finite number', () => {
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    expect(isFinite(cell.avgTurns)).toBe(true);
    expect(cell.avgTurns).toBeGreaterThan(0);
    // 180 decided runs (75+40+5+25+30+5), turn sum:
    //   75*7 + 40*9 + 5*10 + 25*8 + 30*6 + 5*10 = 525 + 360 + 50 + 200 + 180 + 50 = 1365
    // 1365 / 180 = 7.583...
    expect(cell.avgTurns).toBeCloseTo(7.583, 2);
  });

  it('no canonical pair key crosses with itself (no aggressive_vs_aggressive entries)', () => {
    const h2h = report.aggregations!.aiVariantHeadToHead;
    // Mixed-variant runs go to mixedVariantRuns, NOT to a self-pair like 'aggressive_vs_aggressive'.
    // The only h2h key produced should be 'aggressive_vs_defensive'.
    const keys = Object.keys(h2h);
    expect(keys).toEqual(['aggressive_vs_defensive']);
  });
});
