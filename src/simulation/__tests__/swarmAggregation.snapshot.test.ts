/**
 * Task 6.8 — Snapshot test: 100 fake v2 results.
 *
 * Spec contract: combat-analytics/spec.md
 *   - chassisMatrix row sums equal total runs
 *   - gunneryBracket totals reconcile with participants count
 *   - aiVariantHeadToHead sum equals total runs (excluding mixed-variant runs)
 *
 * This test uses synthetic ISimulationRunResult objects. No live simulation
 * is run — the goal is to validate the aggregation logic in isolation with
 * controlled, reproducible inputs.
 *
 * Force composition: side A = "ATL-D-A" (gunnery 3, aggressive), side B = "LCT-1V" (gunnery 5, defensive)
 * 65 A-wins, 30 B-wins, 5 draws → deterministic distribution via seed-ordered assignment.
 */

import { describe, expect, it } from '@jest/globals';

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import type { ISimulationRunResult, IParticipant } from '../runner/types';

import { aggregateSwarmBatch } from '../metrics/swarmAggregation';

// =============================================================================
// Fixtures
// =============================================================================

function makeEvent(type: GameEventType, payload: unknown, seq = 0): IGameEvent {
  return {
    id: `evt-snap-${seq}`,
    gameId: 'snap-fixture',
    sequence: seq,
    timestamp: '2026-01-01T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.WeaponAttack,
    type,
    payload: payload as IGameEvent['payload'],
  };
}

interface ParticipantFixture {
  readonly sideId: string;
  readonly unitId: string;
  readonly chassisId: string;
  readonly pilotId: string;
  readonly gunnery: number;
  readonly piloting: number;
  readonly aiVariant: string;
}

function makeParticipant(fixture: ParticipantFixture): IParticipant {
  return {
    sideId: fixture.sideId,
    unitId: fixture.unitId,
    chassisId: fixture.chassisId,
    pilotId: fixture.pilotId,
    gunnery: fixture.gunnery,
    piloting: fixture.piloting,
    aiVariant: fixture.aiVariant,
  };
}

interface V2ResultFixture {
  readonly index: number;
  readonly winner: 'player' | 'opponent' | 'draw' | null;
  readonly chassisA: string;
  readonly chassisB: string;
  readonly gunneryA: number;
  readonly gunneryB: number;
  readonly variantA: string;
  readonly variantB: string;
  readonly pilotIdA: string;
  readonly pilotIdB: string;
  readonly damageAtoB?: number;
  readonly damageBtoA?: number;
}

/** Build a minimal v2 ISimulationRunResult for snapshot testing. */
function makeV2Result(fixture: V2ResultFixture): ISimulationRunResult {
  const { index, winner, damageAtoB = 50, damageBtoA = 40 } = fixture;
  const unitIdA = `unit-A-${index}`;
  const unitIdB = `unit-B-${index}`;

  const events: IGameEvent[] = [
    makeEvent(
      GameEventType.DamageApplied,
      {
        unitId: unitIdB,
        location: 'CT',
        damage: damageAtoB,
        armorRemaining: 10,
        structureRemaining: 10,
        locationDestroyed: false,
        sourceUnitId: unitIdA,
      },
      0,
    ),
    makeEvent(
      GameEventType.DamageApplied,
      {
        unitId: unitIdA,
        location: 'CT',
        damage: damageBtoA,
        armorRemaining: 8,
        structureRemaining: 10,
        locationDestroyed: false,
        sourceUnitId: unitIdB,
      },
      1,
    ),
  ];

  return {
    seed: 1000 + index,
    winner,
    turns: 10 + (index % 5),
    durationMs: 500 + index,
    events,
    violations: [],
    keyMoments: [],
    anomalies: [],
    haltedByCriticalAnomaly: false,
    schemaVersion: 2,
    participants: [
      makeParticipant({
        sideId: 'A',
        unitId: unitIdA,
        chassisId: fixture.chassisA,
        pilotId: fixture.pilotIdA,
        gunnery: fixture.gunneryA,
        piloting: 4,
        aiVariant: fixture.variantA,
      }),
      makeParticipant({
        sideId: 'B',
        unitId: unitIdB,
        chassisId: fixture.chassisB,
        pilotId: fixture.pilotIdB,
        gunnery: fixture.gunneryB,
        piloting: 4,
        aiVariant: fixture.variantB,
      }),
    ],
  };
}

/**
 * Build 100 v2 results:
 * - side A chassis "ATL-D-A", gunnery 3, variant "aggressive"
 * - side B chassis "LCT-1V", gunnery 5, variant "defensive"
 * - 65 A-wins, 30 B-wins, 5 draws
 * Pilot IDs are synthesized (synth-pilot-xxx) so pilotPerformance stays empty.
 */
function buildSnapshotBatch(): readonly ISimulationRunResult[] {
  const results: ISimulationRunResult[] = [];

  for (let i = 0; i < 100; i++) {
    let winner: 'player' | 'opponent' | 'draw' | null;
    if (i < 65) winner = 'player';
    else if (i < 95) winner = 'opponent';
    else winner = 'draw';

    results.push(
      makeV2Result({
        index: i,
        winner,
        chassisA: 'ATL-D-A',
        chassisB: 'LCT-1V',
        gunneryA: 3,
        gunneryB: 5,
        variantA: 'aggressive',
        variantB: 'defensive',
        pilotIdA: `synth-pilot-A-${i}`,
        pilotIdB: `synth-pilot-B-${i}`,
      }),
    );
  }
  return results;
}

// =============================================================================
// Tests
// =============================================================================

describe('Task 6.8 — swarmAggregation snapshot (100 fake v2 results)', () => {
  const batch = buildSnapshotBatch();
  const report = aggregateSwarmBatch(batch);

  it('produces schemaVersion2RunCount = 100', () => {
    expect(report.schemaVersion2RunCount).toBe(100);
    expect(report.totalRuns).toBe(100);
  });

  it('aggregations are present (v2 batch)', () => {
    expect(report.aggregations).toBeDefined();
  });

  describe('chassisMatrix row sums equal total runs', () => {
    it('ATL-D-A row sums to 100 (65 wins, 30 losses, 5 draws)', () => {
      const cell = report.aggregations!.chassisMatrix['ATL-D-A']?.['LCT-1V'];
      expect(cell).toBeDefined();
      expect(cell!.wins + cell!.losses + cell!.draws).toBe(100);
      expect(cell!.wins).toBe(65);
      expect(cell!.losses).toBe(30);
      expect(cell!.draws).toBe(5);
    });

    it('LCT-1V row sums to 100 (mirror: 30 wins, 65 losses, 5 draws)', () => {
      const cell = report.aggregations!.chassisMatrix['LCT-1V']?.['ATL-D-A'];
      expect(cell).toBeDefined();
      expect(cell!.wins + cell!.losses + cell!.draws).toBe(100);
      expect(cell!.wins).toBe(30);
      expect(cell!.losses).toBe(65);
      expect(cell!.draws).toBe(5);
    });
  });

  describe('gunneryBracket totals reconcile with participant count', () => {
    it('total bracket entries = 200 (100 runs × 2 participants)', () => {
      const gb = report.aggregations!.gunneryBracket;
      const total =
        gb['1-2'].wins +
        gb['1-2'].losses +
        gb['1-2'].draws +
        (gb['3-4'].wins + gb['3-4'].losses + gb['3-4'].draws) +
        (gb['5-6'].wins + gb['5-6'].losses + gb['5-6'].draws) +
        (gb['7+'].wins + gb['7+'].losses + gb['7+'].draws);
      expect(total).toBe(200);
    });

    it("gunnery 3 → '3-4' bracket has 100 entries (all A participants)", () => {
      const bracket34 = report.aggregations!.gunneryBracket['3-4'];
      expect(bracket34.wins + bracket34.losses + bracket34.draws).toBe(100);
    });

    it("gunnery 5 → '5-6' bracket has 100 entries (all B participants)", () => {
      const bracket56 = report.aggregations!.gunneryBracket['5-6'];
      expect(bracket56.wins + bracket56.losses + bracket56.draws).toBe(100);
    });

    it("empty brackets ('1-2' and '7+') produce zeroed entries, not NaN", () => {
      const bracket12 = report.aggregations!.gunneryBracket['1-2'];
      const bracket7p = report.aggregations!.gunneryBracket['7+'];
      expect(bracket12.avgDamageDealt).toBe(0);
      expect(bracket7p.avgDamageDealt).toBe(0);
      expect(isNaN(bracket12.avgDamageDealt)).toBe(false);
      expect(isNaN(bracket7p.avgDamageDealt)).toBe(false);
    });

    it('avgDamageDealt in populated brackets is finite and non-negative', () => {
      const bracket34 = report.aggregations!.gunneryBracket['3-4'];
      const bracket56 = report.aggregations!.gunneryBracket['5-6'];
      expect(isFinite(bracket34.avgDamageDealt)).toBe(true);
      expect(bracket34.avgDamageDealt).toBeGreaterThanOrEqual(0);
      expect(isFinite(bracket56.avgDamageDealt)).toBe(true);
      expect(bracket56.avgDamageDealt).toBeGreaterThanOrEqual(0);
    });
  });

  describe('aiVariantHeadToHead sum equals total runs', () => {
    it("canonical key 'aggressive_vs_defensive' exists", () => {
      const h2h = report.aggregations!.aiVariantHeadToHead;
      expect(h2h['aggressive_vs_defensive']).toBeDefined();
    });

    it('aiVariantHeadToHead sum (wins + losses + draws) equals total runs', () => {
      const h2h = report.aggregations!.aiVariantHeadToHead;
      let total = 0;
      for (const cell of Object.values(h2h)) {
        total += cell.wins + cell.losses + cell.draws;
      }
      total += report.aggregations!.mixedVariantRuns;
      expect(total).toBe(100);
    });

    it('aggressive wins count from perspective of alphabetically-first variant', () => {
      const cell =
        report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
      // 'aggressive' < 'defensive' alphabetically → wins = aggressive wins = 65
      expect(cell.wins).toBe(65);
      expect(cell.losses).toBe(30);
      expect(cell.draws).toBe(5);
    });

    it('avgTurns is greater than 0', () => {
      const cell =
        report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
      expect(cell.avgTurns).toBeGreaterThan(0);
    });
  });

  describe('pilotPerformance is empty for synthesized pilots', () => {
    it('pilotPerformance = {} when all pilot IDs are synth-pilot-*', () => {
      expect(Object.keys(report.aggregations!.pilotPerformance)).toHaveLength(
        0,
      );
    });
  });

  describe('base rollups are always present', () => {
    it('damageMatrix has entries from all 100 runs', () => {
      const dm = report.baseRollups.damageMatrix;
      expect(Object.keys(dm).length).toBeGreaterThan(0);
    });

    it('killCredits is defined (even if 0 kills in no-destruction runs)', () => {
      expect(report.baseRollups.killCredits).toBeDefined();
    });
  });
});
