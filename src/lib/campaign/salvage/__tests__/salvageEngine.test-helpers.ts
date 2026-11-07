/**
 * Salvage Engine Tests
 *
 * Covers the pure-function pipeline:
 *   classifyDamageLevel → computeRecoveryPercentage → estimate*
 *   → aggregateSalvageCandidates → splitByContract / splitByAuction
 *   → applyHostileTerritoryModifier → computeSalvage (top-level).
 *
 * @spec openspec/changes/add-salvage-rules-engine/specs/salvage-rules/spec.md
 */

import { createHash } from 'node:crypto';

import { applyUnitDelta } from '@/lib/campaign/processors/postBattleProcessor.helpers';
import { createContract } from '@/types/campaign/Mission';
import {
  CBILLS_PER_BATTLE_VALUE,
  DamageLevel,
  RECOVERY_PERCENTAGE_BY_DAMAGE,
  REPAIR_COST_PER_TON_BY_DAMAGE,
} from '@/types/campaign/Salvage';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
  type ICombatOutcome,
  type IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  aggregateSalvageCandidates,
  applyHostileTerritoryModifier,
  classifyDamageLevel,
  computeRecoveryPercentage,
  computeSalvage,
  estimatePartRepairCost,
  estimateRepairCost,
  estimateUnitValue,
  resolveSalvagePercent,
  splitByAuction,
  splitByContract,
} from '../salvageEngine';
import { validateSalvageUnitRecovery } from '../salvageUnitRecovery';

// =============================================================================
// Fixture helpers
// =============================================================================

function makeDelta(overrides?: Partial<IUnitCombatDelta>): IUnitCombatDelta {
  return {
    unitId: 'enemy-1',
    side: GameSide.Opponent,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 10, LT: 8, RT: 8, LA: 6, RA: 6, LL: 6, RL: 6, HD: 5 },
    internalsRemaining: {
      CT: 10,
      LT: 7,
      RT: 7,
      LA: 5,
      RA: 5,
      LL: 7,
      RL: 7,
      HD: 3,
    },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

function makeOutcome(overrides?: Partial<ICombatOutcome>): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'match-1',
    contractId: 'contract-1',
    scenarioId: null,
    endReason: CombatEndReason.ObjectiveMet,
    report: {} as ICombatOutcome['report'],
    unitDeltas: [],
    capturedAt: '2026-04-17T00:00:00Z',
    ...overrides,
  };
}

const baselineStructure: Readonly<Record<string, number>> = {
  CT: 10,
  LT: 7,
  RT: 7,
  LA: 5,
  RA: 5,
  LL: 7,
  RL: 7,
  HD: 3,
};

describe('salvage compatibility bytes', () => {
  it('preserves the existing candidate fixture set outside recovery payloads', () => {
    const fixtures = Object.values(UnitFinalStatus).map((finalStatus) => {
      const outcome = makeOutcome({
        unitDeltas: [
          makeDelta({
            unitRef: 'marauder-mad-3r',
            finalStatus,
            destroyedComponents: ['Medium Laser'],
          }),
        ],
      });
      return aggregateSalvageCandidates(outcome, {
        lookup: () => ({
          designation: 'Marauder MAD-3R',
          tonnage: 75,
          battleValue: 1363,
        }),
      });
    });
    const bytes = JSON.stringify(fixtures, (key, value: unknown) =>
      key === 'recovery' ? undefined : value,
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '6224f3213bbed376211f2495045b24f786f618369896cbd29de9af465dff0881',
    );
  });
});

describe('whole-unit recovery payload', () => {
  function recoveredCandidate(overrides: Partial<IUnitCombatDelta> = {}) {
    const delta = makeDelta({
      unitRef: 'marauder-mad-3r',
      unitSource: 'canonical',
      armorRemaining: { CT: 3, LT: 0 },
      internalsRemaining: { CT: 7, LT: 0 },
      destroyedLocations: ['LT'],
      destroyedComponents: ['Medium Laser'],
      heatEnd: 8,
      ammoRemaining: { 'bin-ac5': 4 },
      ...overrides,
    });
    const outcome = makeOutcome({ unitDeltas: [delta] });
    const candidate = aggregateSalvageCandidates(outcome).candidates[0];
    return { candidate, delta, outcome };
  }

  it('carries the canonical reference, explicit source and recovered damage', () => {
    const { candidate, delta, outcome } = recoveredCandidate();
    expect(candidate.recovery).toEqual({
      unitRef: delta.unitRef,
      unitSource: 'canonical',
      combatState: applyUnitDelta(
        undefined,
        delta,
        outcome.matchId,
        outcome.capturedAt,
      ),
    });
    expect(candidate.recovery?.combatState.currentArmorPerLocation).toEqual({
      CT: 3,
      LT: 0,
    });
    expect(validateSalvageUnitRecovery(candidate).kind).toBe('ready');
    expect(candidate.recovery).not.toHaveProperty('pilotRef');
    expect(candidate.recovery).not.toHaveProperty('sourceVersion');
  });

  it('preserves a custom historical version only when the outcome recorded it', () => {
    const pinned = recoveredCandidate({
      unitRef: 'custom-marauder',
      unitSource: 'custom',
      sourceVersion: 3,
    }).candidate;
    expect(pinned.recovery).toMatchObject({
      unitRef: 'custom-marauder',
      unitSource: 'custom',
      sourceVersion: 3,
    });
    expect(validateSalvageUnitRecovery(pinned).kind).toBe('ready');
    const unpinned = recoveredCandidate({
      unitRef: 'custom-marauder',
      unitSource: 'custom',
    }).candidate;
    expect(unpinned.recovery).not.toHaveProperty('sourceVersion');
    expect(validateSalvageUnitRecovery(unpinned).kind).toBe('refused');
  });

  it('does not assume canonical source; confirmation must name the exact preserved ref', () => {
    const { candidate } = recoveredCandidate({ unitSource: undefined });
    expect(candidate.recovery).not.toHaveProperty('unitSource');
    expect(validateSalvageUnitRecovery(candidate).kind).toBe('refused');
    expect(validateSalvageUnitRecovery(candidate, 'different-ref').kind).toBe(
      'refused',
    );
    expect(
      validateSalvageUnitRecovery(candidate, 'marauder-mad-3r'),
    ).toMatchObject({
      kind: 'ready',
      recovery: { unitSource: 'canonical' },
    });
  });

  it('accepts source confirmation from metadata only for the exact preserved reference', () => {
    const delta = makeDelta({ unitRef: 'marauder-mad-3r' });
    for (const unitRef of ['marauder-mad-3r', 'wrong-ref']) {
      const candidate = aggregateSalvageCandidates(
        makeOutcome({ unitDeltas: [delta] }),
        {
          lookup: () => ({
            designation: 'Marauder',
            tonnage: 75,
            battleValue: 1363,
            unitRef,
            unitSource: 'canonical',
          }),
        },
      ).candidates[0];
      expect(candidate.recovery?.unitSource).toBe(
        unitRef === delta.unitRef ? 'canonical' : undefined,
      );
    }
  });

  it('leaves legacy candidates without a fabricated recovery payload', () => {
    const candidate = aggregateSalvageCandidates(
      makeOutcome({ unitDeltas: [makeDelta()] }),
    ).candidates[0];
    expect(candidate).not.toHaveProperty('recovery');
    expect(validateSalvageUnitRecovery(candidate).kind).toBe('refused');
  });

  it('never attaches whole-unit recovery to parts or heals a destroyed unit', () => {
    const delta = makeDelta({
      unitRef: 'marauder-mad-3r',
      unitSource: 'canonical',
      destroyed: true,
      finalStatus: UnitFinalStatus.Destroyed,
      internalsRemaining: { CT: 0 },
      destroyedComponents: ['Medium Laser'],
    });
    const candidates = aggregateSalvageCandidates(
      makeOutcome({ unitDeltas: [delta] }),
    ).candidates;
    expect(candidates[0].recovery?.combatState.combatReady).toBe(false);
    expect(
      candidates[0].recovery?.combatState.currentStructurePerLocation,
    ).toEqual({ CT: 0 });
    expect(
      candidates.filter((candidate) => candidate.source === 'part').length,
    ).toBeGreaterThan(0);
    expect(
      candidates
        .filter((candidate) => candidate.source === 'part')
        .every((candidate) => !candidate.recovery),
    ).toBe(true);
  });

  it('rejects malformed persisted payloads without canonical confirmation overriding bad source facts', () => {
    const { candidate } = recoveredCandidate();
    const recovery = candidate.recovery!;
    const malformed: unknown[] = [
      null,
      {},
      { ...candidate, source: 'part' },
      { ...candidate, unitId: 'different-instance' },
      { ...candidate, destroyedFromBattle: 'different-battle' },
      ...[
        null,
        { ...recovery, unitRef: '' },
        { ...recovery, unitSource: 'invalid' },
        { ...recovery, unitSource: 'custom', sourceVersion: 0 },
        { ...recovery, unitSource: 'custom', sourceVersion: 1.5 },
        { ...recovery, unitSource: 'custom', sourceVersion: undefined },
        {
          ...recovery,
          combatState: {
            ...recovery.combatState,
            currentArmorPerLocation: { CT: -1 },
          },
        },
        {
          ...recovery,
          combatState: {
            ...recovery.combatState,
            currentStructurePerLocation: {},
          },
        },
        {
          ...recovery,
          combatState: { ...recovery.combatState, heatEnd: Infinity },
        },
        {
          ...recovery,
          combatState: {
            ...recovery.combatState,
            destroyedComponents: ['Laser'],
          },
        },
      ].map((recovery) => ({ ...candidate, recovery })),
    ];
    for (const invalid of malformed) {
      expect(validateSalvageUnitRecovery(invalid, 'marauder-mad-3r').kind).toBe(
        'refused',
      );
    }
  });
});

// =============================================================================
// Damage classification
// =============================================================================

describe('classifyDamageLevel', () => {
  it('classifies INTACT when no structure lost', () => {
    expect(
      classifyDamageLevel(
        makeDelta({
          finalStatus: UnitFinalStatus.Intact,
          internalsRemaining: { ...baselineStructure },
        }),
        baselineStructure,
      ),
    ).toBe(DamageLevel.Intact);
  });

  it('classifies LIGHT for <30% structure lost', () => {
    // baseline total = 51; lose 5 (~10%) → LIGHT
    const delta = makeDelta({
      finalStatus: UnitFinalStatus.Damaged,
      internalsRemaining: {
        CT: 8,
        LT: 6,
        RT: 6,
        LA: 4,
        RA: 4,
        LL: 7,
        RL: 7,
        HD: 3,
      },
    });
    expect(classifyDamageLevel(delta, baselineStructure)).toBe(
      DamageLevel.Light,
    );
  });

  it('classifies MODERATE for 30–60% structure lost', () => {
    // baseline 51; lose ~22 (~43%)
    const delta = makeDelta({
      finalStatus: UnitFinalStatus.Damaged,
      internalsRemaining: {
        CT: 5,
        LT: 3,
        RT: 3,
        LA: 2,
        RA: 2,
        LL: 7,
        RL: 7,
        HD: 0,
      },
    });
    expect(classifyDamageLevel(delta, baselineStructure)).toBe(
      DamageLevel.Moderate,
    );
  });

  it('classifies HEAVY for 60–99% structure lost (Crippled)', () => {
    const delta = makeDelta({
      finalStatus: UnitFinalStatus.Crippled,
      internalsRemaining: {
        CT: 1,
        LT: 0,
        RT: 0,
        LA: 0,
        RA: 0,
        LL: 1,
        RL: 1,
        HD: 0,
      },
    });
    expect(classifyDamageLevel(delta, baselineStructure)).toBe(
      DamageLevel.Heavy,
    );
  });

  it('classifies DESTROYED when delta.destroyed is true', () => {
    const delta = makeDelta({
      destroyed: true,
      finalStatus: UnitFinalStatus.Destroyed,
    });
    expect(classifyDamageLevel(delta, baselineStructure)).toBe(
      DamageLevel.Destroyed,
    );
  });

  it('classifies DESTROYED when CT is in destroyedLocations', () => {
    const delta = makeDelta({
      destroyedLocations: ['CT'],
      finalStatus: UnitFinalStatus.Destroyed,
    });
    expect(classifyDamageLevel(delta, baselineStructure)).toBe(
      DamageLevel.Destroyed,
    );
  });
});

// =============================================================================
// Recovery percentage table
// =============================================================================

describe('computeRecoveryPercentage', () => {
  it('returns canonical percentages per damage level', () => {
    expect(computeRecoveryPercentage(DamageLevel.Intact)).toBe(1.0);
    expect(computeRecoveryPercentage(DamageLevel.Light)).toBe(0.75);
    expect(computeRecoveryPercentage(DamageLevel.Moderate)).toBe(0.5);
    expect(computeRecoveryPercentage(DamageLevel.Heavy)).toBe(0.25);
    expect(computeRecoveryPercentage(DamageLevel.Destroyed)).toBe(0.0);
  });

  it('matches the exported table', () => {
    for (const level of Object.values(DamageLevel)) {
      expect(computeRecoveryPercentage(level)).toBe(
        RECOVERY_PERCENTAGE_BY_DAMAGE[level],
      );
    }
  });
});

// =============================================================================
// Estimators
// =============================================================================

describe('estimateUnitValue', () => {
  it('multiplies BV by CBILLS_PER_BATTLE_VALUE', () => {
    expect(
      estimateUnitValue({
        designation: 'Atlas',
        tonnage: 100,
        battleValue: 2000,
      }),
    ).toBe(2000 * CBILLS_PER_BATTLE_VALUE);
  });

  it('falls back to default when meta is null', () => {
    expect(estimateUnitValue(null)).toBe(1_000 * CBILLS_PER_BATTLE_VALUE);
  });
});

describe('estimateRepairCost', () => {
  it('scales by tonnage × per-ton table', () => {
    expect(
      estimateRepairCost(
        { designation: 'X', tonnage: 50, battleValue: 1000 },
        DamageLevel.Moderate,
      ),
    ).toBe(50 * REPAIR_COST_PER_TON_BY_DAMAGE[DamageLevel.Moderate]);
  });

  it('returns 0 for INTACT and DESTROYED', () => {
    expect(
      estimateRepairCost(
        { designation: 'X', tonnage: 50, battleValue: 1000 },
        DamageLevel.Intact,
      ),
    ).toBe(0);
    expect(
      estimateRepairCost(
        { designation: 'X', tonnage: 50, battleValue: 1000 },
        DamageLevel.Destroyed,
      ),
    ).toBe(0);
  });
});

describe('estimatePartRepairCost', () => {
  it('returns original × (1 - recovery)', () => {
    expect(estimatePartRepairCost(100_000, 0.25)).toBe(75_000);
  });

  it('returns 0 when fully recovered', () => {
    expect(estimatePartRepairCost(50_000, 1.0)).toBe(0);
  });
});

// =============================================================================
// Aggregation
// =============================================================================

describe('aggregateSalvageCandidates', () => {
  it('skips player-side units', () => {
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta({
          unitId: 'player-1',
          side: GameSide.Player,
          finalStatus: UnitFinalStatus.Damaged,
        }),
        makeDelta({
          unitId: 'enemy-1',
          finalStatus: UnitFinalStatus.Damaged,
        }),
      ],
    });
    const pool = aggregateSalvageCandidates(outcome);
    expect(pool.candidates.every((c) => c.unitId !== 'player-1')).toBe(true);
    expect(pool.candidates.length).toBe(1);
  });

  it('skips INTACT and EJECTED enemies', () => {
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta({
          unitId: 'enemy-intact',
          finalStatus: UnitFinalStatus.Intact,
        }),
        makeDelta({
          unitId: 'enemy-ejected',
          finalStatus: UnitFinalStatus.Ejected,
        }),
        makeDelta({
          unitId: 'enemy-damaged',
          finalStatus: UnitFinalStatus.Damaged,
        }),
      ],
    });
    const pool = aggregateSalvageCandidates(outcome);
    expect(pool.candidates.length).toBe(1);
    expect(pool.candidates[0].unitId).toBe('enemy-damaged');
  });

  it('emits both unit candidate (recovery 0) and salvageable parts for DESTROYED', () => {
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta({
          unitId: 'enemy-1',
          destroyed: true,
          finalStatus: UnitFinalStatus.Destroyed,
          destroyedComponents: ['Medium Laser', 'Engine', 'Gyro', 'Heat Sink'],
        }),
      ],
    });
    const pool = aggregateSalvageCandidates(outcome);
    const unitCandidates = pool.candidates.filter((c) => c.source === 'unit');
    const partCandidates = pool.candidates.filter((c) => c.source === 'part');
    expect(unitCandidates).toHaveLength(1);
    expect(unitCandidates[0].recoveryPercentage).toBe(0);
    // Engine and Gyro must be filtered out — only Medium Laser + Heat Sink remain.
    expect(partCandidates.map((p) => p.designation).sort()).toEqual(
      ['Heat Sink', 'Medium Laser'].sort(),
    );
  });

  it('totals recoveredValue across candidates', () => {
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta({
          unitId: 'enemy-1',
          finalStatus: UnitFinalStatus.Damaged,
        }),
      ],
    });
    const pool = aggregateSalvageCandidates(outcome, {
      lookup: () => ({ designation: 'X', tonnage: 50, battleValue: 1000 }),
    });
    expect(pool.totalEstimatedValue).toBeGreaterThan(0);
    expect(pool.totalEstimatedValue).toBe(pool.candidates[0].recoveredValue);
  });
});

// =============================================================================
// Contract split
// =============================================================================

describe('splitByContract', () => {
  function buildPool() {
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta({
          unitId: 'enemy-1',
          finalStatus: UnitFinalStatus.Damaged,
        }),
        makeDelta({
          unitId: 'enemy-2',
          finalStatus: UnitFinalStatus.Damaged,
        }),
        makeDelta({
          unitId: 'enemy-3',
          finalStatus: UnitFinalStatus.Damaged,
        }),
        makeDelta({
          unitId: 'enemy-4',
          finalStatus: UnitFinalStatus.Damaged,
        }),
      ],
    });
    return aggregateSalvageCandidates(outcome, {
      lookup: () => ({ designation: 'X', tonnage: 50, battleValue: 1000 }),
    });
  }

  it('routes 100% to employer at 0% mercenary rights', () => {
    const pool = buildPool();
    const allocation = splitByContract(pool, 0);
    expect(allocation.mercenaryAward.candidates).toHaveLength(0);
    expect(allocation.employerAward.candidates).toHaveLength(4);
  });

  it('routes 100% to mercenary at 100% rights', () => {
    const pool = buildPool();
    const allocation = splitByContract(pool, 100);
    expect(allocation.mercenaryAward.candidates).toHaveLength(4);
    expect(allocation.employerAward.candidates).toHaveLength(0);
  });

  it('approximates 60% mercenary value within 10% tolerance', () => {
    const pool = buildPool();
    const total = pool.totalEstimatedValue;
    const allocation = splitByContract(pool, 60);
    const target = total * 0.6;
    const tolerance = total * 0.1;
    expect(allocation.mercenaryAward.totalValue).toBeGreaterThanOrEqual(
      target - tolerance,
    );
    expect(allocation.mercenaryAward.totalValue).toBeLessThanOrEqual(
      target + tolerance,
    );
  });

  it('produces deep-equal allocations for repeated calls', () => {
    const pool = buildPool();
    const a = splitByContract(pool, 50);
    const b = splitByContract(pool, 50);
    expect(a).toEqual(b);
  });

  it('clamps mercenaryPercent above 100', () => {
    const pool = buildPool();
    const allocation = splitByContract(pool, 250);
    expect(allocation.mercenaryAward.candidates).toHaveLength(4);
  });
});

// =============================================================================
// Auction split
// =============================================================================

describe('splitByAuction', () => {
  it('alternates with employer first; same seed → identical result', () => {
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta({ unitId: 'e-1', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-2', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-3', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-4', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-5', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-6', finalStatus: UnitFinalStatus.Damaged }),
      ],
    });
    const pool = aggregateSalvageCandidates(outcome, {
      lookup: (id) => ({
        designation: id,
        tonnage: 50,
        battleValue: 1000 + Number(id.replace('e-', '')) * 100,
      }),
    });
    const a = splitByAuction(pool, 7);
    const b = splitByAuction(pool, 7);
    expect(a).toEqual(b);
    // 6 candidates → 3 each side.
    expect(a.employerAward.candidates).toHaveLength(3);
    expect(a.mercenaryAward.candidates).toHaveLength(3);
    expect(a.splitMethod).toBe('auction');
  });
});

// =============================================================================
// Hostile-territory modifier
// =============================================================================

describe('applyHostileTerritoryModifier', () => {
  it('halves the mercenary award when withdrawing from hostile territory', () => {
    const outcome = makeOutcome({
      endReason: CombatEndReason.Withdrawal,
      unitDeltas: [
        makeDelta({ unitId: 'e-1', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-2', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-3', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-4', finalStatus: UnitFinalStatus.Damaged }),
      ],
    });
    const pool = aggregateSalvageCandidates(outcome, {
      lookup: () => ({ designation: 'X', tonnage: 50, battleValue: 1000 }),
      hostileTerritory: true,
    });
    const baseAllocation = splitByContract(pool, 100);
    const baseTotal = baseAllocation.mercenaryAward.totalValue;
    const modified = applyHostileTerritoryModifier(baseAllocation, outcome);
    expect(modified.mercenaryAward.totalValue).toBeLessThanOrEqual(
      baseTotal * 0.5,
    );
    expect(modified.splitMethod).toBe('hostile_withdrawal');
  });

  it('is a no-op when hostileTerritory is false', () => {
    const outcome = makeOutcome({
      endReason: CombatEndReason.Withdrawal,
      unitDeltas: [
        makeDelta({ unitId: 'e-1', finalStatus: UnitFinalStatus.Damaged }),
      ],
    });
    const pool = aggregateSalvageCandidates(outcome, {
      lookup: () => ({ designation: 'X', tonnage: 50, battleValue: 1000 }),
      hostileTerritory: false,
    });
    const baseAllocation = splitByContract(pool, 50);
    const modified = applyHostileTerritoryModifier(baseAllocation, outcome);
    expect(modified.splitMethod).toBe('contract');
    expect(modified.mercenaryAward.totalValue).toBe(
      baseAllocation.mercenaryAward.totalValue,
    );
  });
});

// =============================================================================
// Top-level + contract integration
// =============================================================================

describe('resolveSalvagePercent', () => {
  const baseContract = createContract({
    id: 'c-1',
    name: 'Test',
    employerId: 'davion',
    targetId: 'liao',
  });

  it('honours explicit salvagePercent', () => {
    expect(resolveSalvagePercent({ ...baseContract, salvagePercent: 35 })).toBe(
      35,
    );
  });

  it('clamps out-of-range salvagePercent', () => {
    expect(resolveSalvagePercent({ ...baseContract, salvagePercent: -5 })).toBe(
      0,
    );
    expect(
      resolveSalvagePercent({ ...baseContract, salvagePercent: 200 }),
    ).toBe(100);
  });

  it('maps legacy salvageRights enum', () => {
    expect(
      resolveSalvagePercent({ ...baseContract, salvageRights: 'None' }),
    ).toBe(0);
    expect(
      resolveSalvagePercent({ ...baseContract, salvageRights: 'Exchange' }),
    ).toBe(50);
    expect(
      resolveSalvagePercent({ ...baseContract, salvageRights: 'Integrated' }),
    ).toBe(50);
  });

  it('returns 0 for null contract', () => {
    expect(resolveSalvagePercent(null)).toBe(0);
  });
});

describe('computeSalvage', () => {
  it('returns standalone empty allocation when no contract', () => {
    const outcome = makeOutcome({
      contractId: null,
      unitDeltas: [
        makeDelta({ unitId: 'e-1', finalStatus: UnitFinalStatus.Damaged }),
      ],
    });
    const allocation = computeSalvage(outcome, null);
    expect(allocation.splitMethod).toBe('standalone');
    expect(allocation.mercenaryAward.candidates).toHaveLength(0);
    expect(allocation.employerAward.candidates).toHaveLength(0);
  });

  it('routes Exchange-clause contracts through auction split', () => {
    const contract = createContract({
      id: 'c-exchange',
      name: 'Test',
      employerId: 'davion',
      targetId: 'liao',
      salvageRights: 'Exchange',
    });
    const outcome = makeOutcome({
      contractId: 'c-exchange',
      unitDeltas: [
        makeDelta({ unitId: 'e-1', finalStatus: UnitFinalStatus.Damaged }),
        makeDelta({ unitId: 'e-2', finalStatus: UnitFinalStatus.Damaged }),
      ],
    });
    const allocation = computeSalvage(outcome, contract);
    expect(allocation.splitMethod).toBe('auction');
  });

  it('damaged unit yields more recoveredValue than destroyed unit', () => {
    const damaged = makeDelta({
      unitId: 'damaged-1',
      finalStatus: UnitFinalStatus.Damaged,
    });
    const destroyed = makeDelta({
      unitId: 'destroyed-1',
      destroyed: true,
      finalStatus: UnitFinalStatus.Destroyed,
    });
    const outcome = makeOutcome({
      unitDeltas: [damaged, destroyed],
    });
    const pool = aggregateSalvageCandidates(outcome, {
      lookup: () => ({ designation: 'X', tonnage: 50, battleValue: 1000 }),
    });
    const damagedCandidate = pool.candidates.find(
      (c) => c.unitId === 'damaged-1' && c.source === 'unit',
    );
    const destroyedCandidate = pool.candidates.find(
      (c) => c.unitId === 'destroyed-1' && c.source === 'unit',
    );
    expect(damagedCandidate?.recoveredValue).toBeGreaterThan(
      destroyedCandidate?.recoveredValue ?? -1,
    );
  });
});
