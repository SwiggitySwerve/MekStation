/**
 * Task 6.10 — Schema-version migration test.
 *
 * Spec contract: combat-analytics/spec.md
 *   Requirement: "Schema-Version-Gated Rollups"
 *   Scenario: "Backward compatibility for schemaVersion 1 inputs"
 *   Scenario: "Mixed-schema-version inputs"
 *
 * Three scenarios validated:
 *   A. Pure v1 batch (60 runs) → no aggregations, no error
 *   B. Mixed batch (60 v1 + 40 v2) → aggregations from v2 only, schemaVersion2RunCount = 40
 *   C. Pure v2 batch (40 runs) → all rollups present, schemaVersion2RunCount = 40
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
    id: `evt-sv-${seq}`,
    gameId: 'sv-fixture',
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
  index: number,
  gunnery: number,
  aiVariant: string,
): IParticipant {
  return {
    sideId,
    unitId: `unit-${sideId}-${index}`,
    chassisId: sideId === 'A' ? 'ATL-D-A' : 'LCT-1V',
    pilotId: `synth-pilot-${sideId}-${index}-${Math.floor(index * 7919)}`,
    gunnery,
    piloting: 4,
    aiVariant,
  };
}

/** Build a schema-version-1 ISimulationRunResult (no participants field). */
function makeV1Result(index: number): ISimulationRunResult {
  return {
    seed: 2000 + index,
    winner: index % 3 === 0 ? 'player' : index % 3 === 1 ? 'opponent' : 'draw',
    turns: 12,
    durationMs: 400,
    events: [
      makeEvent(
        GameEventType.DamageApplied,
        {
          unitId: `unit-v1-B-${index}`,
          location: 'CT',
          damage: 30,
          armorRemaining: 5,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: `unit-v1-A-${index}`,
        },
        0,
      ),
    ],
    violations: [],
    keyMoments: [],
    anomalies: [],
    haltedByCriticalAnomaly: false,
    schemaVersion: 1,
    // participants intentionally absent — schemaVersion 1
  };
}

/** Build a schema-version-2 ISimulationRunResult with full participants. */
function makeV2Result(index: number): ISimulationRunResult {
  const unitIdA = `unit-v2-A-${index}`;
  const unitIdB = `unit-v2-B-${index}`;
  const winner: 'player' | 'opponent' | 'draw' =
    index % 3 === 0 ? 'player' : index % 3 === 1 ? 'opponent' : 'draw';

  return {
    seed: 3000 + index,
    winner,
    turns: 15,
    durationMs: 500,
    events: [
      makeEvent(
        GameEventType.DamageApplied,
        {
          unitId: unitIdB,
          location: 'LT',
          damage: 20,
          armorRemaining: 8,
          structureRemaining: 10,
          locationDestroyed: false,
          sourceUnitId: unitIdA,
        },
        0,
      ),
    ],
    violations: [],
    keyMoments: [],
    anomalies: [],
    haltedByCriticalAnomaly: false,
    schemaVersion: 2,
    participants: [
      makeParticipant('A', index, 3, 'aggressive'),
      makeParticipant('B', index, 5, 'defensive'),
    ],
  };
}

// =============================================================================
// Scenario A — pure v1 batch
// =============================================================================

describe('Task 6.10-A — pure schemaVersion-1 batch (60 runs)', () => {
  const batch = Array.from({ length: 60 }, (_, i) => makeV1Result(i));
  const report = aggregateSwarmBatch(batch);

  it('does not throw', () => {
    expect(() => aggregateSwarmBatch(batch)).not.toThrow();
  });

  it('totalRuns = 60', () => {
    expect(report.totalRuns).toBe(60);
  });

  it('schemaVersion2RunCount = 0', () => {
    expect(report.schemaVersion2RunCount).toBe(0);
  });

  it('aggregations is undefined (new rollups NOT produced for v1 batch)', () => {
    expect(report.aggregations).toBeUndefined();
  });

  it('baseRollups are present (damageMatrix populated from v1 events)', () => {
    expect(report.baseRollups).toBeDefined();
    expect(Object.keys(report.baseRollups.damageMatrix).length).toBeGreaterThan(
      0,
    );
  });
});

// =============================================================================
// Scenario B — mixed batch (60 v1 + 40 v2)
// =============================================================================

describe('Task 6.10-B — mixed batch (60 v1 + 40 v2)', () => {
  const v1Batch = Array.from({ length: 60 }, (_, i) => makeV1Result(i));
  const v2Batch = Array.from({ length: 40 }, (_, i) => makeV2Result(i));
  const mixed = [...v1Batch, ...v2Batch];
  const report = aggregateSwarmBatch(mixed);

  it('totalRuns = 100', () => {
    expect(report.totalRuns).toBe(100);
  });

  it('schemaVersion2RunCount = 40', () => {
    expect(report.schemaVersion2RunCount).toBe(40);
  });

  it('aggregations are present (triggered by v2 inputs)', () => {
    expect(report.aggregations).toBeDefined();
  });

  it('baseRollups present and populated from all 100 inputs', () => {
    // Both v1 and v2 damage events contribute to damageMatrix
    const dmKeys = Object.keys(report.baseRollups.damageMatrix);
    expect(dmKeys.length).toBeGreaterThan(0);
  });

  it('chassisMatrix derived exclusively from 40 v2 inputs', () => {
    const cm = report.aggregations!.chassisMatrix;
    // Only v2 chassis appear in the matrix
    expect(cm['ATL-D-A']).toBeDefined();
    expect(cm['LCT-1V']).toBeDefined();
    // Row sum for ATL-D-A vs LCT-1V = 40 (40 v2 runs)
    const cell = cm['ATL-D-A']!['LCT-1V']!;
    expect(cell.wins + cell.losses + cell.draws).toBe(40);
  });

  it('gunneryBracket total entries = 80 (40 runs × 2 participants each)', () => {
    const gb = report.aggregations!.gunneryBracket;
    const total =
      gb['1-2'].wins +
      gb['1-2'].losses +
      gb['1-2'].draws +
      (gb['3-4'].wins + gb['3-4'].losses + gb['3-4'].draws) +
      (gb['5-6'].wins + gb['5-6'].losses + gb['5-6'].draws) +
      (gb['7+'].wins + gb['7+'].losses + gb['7+'].draws);
    expect(total).toBe(80);
  });

  it("aiVariantHeadToHead 'aggressive_vs_defensive' sum = 40 (v2 runs only)", () => {
    const cell =
      report.aggregations!.aiVariantHeadToHead['aggressive_vs_defensive']!;
    expect(cell.wins + cell.losses + cell.draws).toBe(40);
  });
});

// =============================================================================
// Scenario C — pure v2 batch (40 runs), all rollups present
// =============================================================================

describe('Task 6.10-C — pure schemaVersion-2 batch (40 runs)', () => {
  const batch = Array.from({ length: 40 }, (_, i) => makeV2Result(i));
  const report = aggregateSwarmBatch(batch);

  it('schemaVersion2RunCount = 40', () => {
    expect(report.schemaVersion2RunCount).toBe(40);
  });

  it('all four v2 rollups are present', () => {
    const agg = report.aggregations!;
    expect(agg.chassisMatrix).toBeDefined();
    expect(agg.gunneryBracket).toBeDefined();
    expect(agg.aiVariantHeadToHead).toBeDefined();
    expect(agg.pilotPerformance).toBeDefined();
  });

  it('chassisMatrix row sum = 40 for single-chassis-pair batch', () => {
    const cell = report.aggregations!.chassisMatrix['ATL-D-A']?.['LCT-1V'];
    expect(cell).toBeDefined();
    expect(cell!.wins + cell!.losses + cell!.draws).toBe(40);
  });

  it('pilotPerformance is empty (all synth-pilot-* IDs excluded)', () => {
    expect(Object.keys(report.aggregations!.pilotPerformance)).toHaveLength(0);
  });
});

// =============================================================================
// Scenario D — vault pilots appear in pilotPerformance
// =============================================================================

describe('Task 6.10-D — vault pilots populate pilotPerformance', () => {
  // Build 10 v2 results where pilots have real (non-synthesized) IDs
  const vaultPilotIdA = 'vault-pilot-alpha-001';
  const vaultPilotIdB = 'vault-pilot-beta-002';

  const batch: ISimulationRunResult[] = Array.from({ length: 10 }, (_, i) => {
    const unitIdA = `unit-vp-A-${i}`;
    const unitIdB = `unit-vp-B-${i}`;
    return {
      seed: 5000 + i,
      winner: i < 6 ? 'player' : 'opponent',
      turns: 10,
      durationMs: 300,
      events: [
        makeEvent(
          GameEventType.UnitDestroyed,
          {
            unitId: unitIdB,
            cause: 'damage',
            killerUnitId: unitIdA,
          },
          0,
        ),
        makeEvent(
          GameEventType.PilotHit,
          {
            unitId: unitIdA,
            wounds: 1,
            totalWounds: 1,
            source: 'head_hit',
            consciousnessCheckRequired: false,
          },
          1,
        ),
      ],
      violations: [],
      keyMoments: [],
      anomalies: [],
      haltedByCriticalAnomaly: false,
      schemaVersion: 2,
      participants: [
        {
          sideId: 'A',
          unitId: unitIdA,
          chassisId: 'ATL-D-A',
          pilotId: vaultPilotIdA,
          gunnery: 3,
          piloting: 4,
          aiVariant: 'aggressive',
        },
        {
          sideId: 'B',
          unitId: unitIdB,
          chassisId: 'LCT-1V',
          pilotId: vaultPilotIdB,
          gunnery: 4,
          piloting: 4,
          aiVariant: 'defensive',
        },
      ],
    };
  });

  const report = aggregateSwarmBatch(batch);

  it('vault pilot A appears in pilotPerformance', () => {
    expect(report.aggregations!.pilotPerformance[vaultPilotIdA]).toBeDefined();
  });

  it('vault pilot A: runs = 10, wins = 6', () => {
    const pp = report.aggregations!.pilotPerformance[vaultPilotIdA]!;
    expect(pp.runs).toBe(10);
    expect(pp.wins).toBe(6);
  });

  it('vault pilot A: kills = 10 (killed B in every run)', () => {
    const pp = report.aggregations!.pilotPerformance[vaultPilotIdA]!;
    expect(pp.kills).toBe(10);
  });

  it('vault pilot A: takenWounds = 10 (PilotHit once per run)', () => {
    const pp = report.aggregations!.pilotPerformance[vaultPilotIdA]!;
    expect(pp.takenWounds).toBe(10);
  });

  it('vault pilot B: runs = 10, wins = 4 (opponent wins)', () => {
    const pp = report.aggregations!.pilotPerformance[vaultPilotIdB]!;
    expect(pp.runs).toBe(10);
    expect(pp.wins).toBe(4);
  });
});
