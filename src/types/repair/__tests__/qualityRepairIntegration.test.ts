import {
  PartQuality,
  QUALITY_TN_MODIFIER,
  getQualityRepairCostMultiplier,
  QUALITY_REPAIR_COST_MULTIPLIER,
  DEFAULT_UNIT_QUALITY,
  SALVAGE_STARTING_QUALITY,
} from '@/types/campaign/quality';
import {
  calculateQualityAdjustedRepairCost,
  calculateRepairTargetNumber,
  calculateArmorRepairCost,
  RepairJobStatus,
  RepairType,
  UnitLocation,
  type IRepairJob,
  type ISalvagedPart,
} from '../RepairInterfaces';

// =============================================================================
// Quality Constants
// =============================================================================

describe('Quality Defaults', () => {
  it('RED: new units default to quality D (standard)', () => {
    expect(DEFAULT_UNIT_QUALITY).toBe(PartQuality.D);
  });

  it('RED: salvaged equipment starts at quality C (below average)', () => {
    expect(SALVAGE_STARTING_QUALITY).toBe(PartQuality.C);
  });

  it('RED: salvage quality C is worse than default D', () => {
    const salvageTNMod = QUALITY_TN_MODIFIER[SALVAGE_STARTING_QUALITY];
    const defaultTNMod = QUALITY_TN_MODIFIER[DEFAULT_UNIT_QUALITY];
    expect(salvageTNMod).toBeGreaterThan(defaultTNMod);
  });
});

// =============================================================================
// Quality Repair Cost Multiplier
// =============================================================================

describe('Quality Repair Cost Multiplier', () => {
  it('RED: worst quality A has highest cost multiplier (1.5x)', () => {
    expect(getQualityRepairCostMultiplier(PartQuality.A)).toBe(1.5);
  });

  it('RED: best quality F has lowest cost multiplier (0.8x)', () => {
    expect(getQualityRepairCostMultiplier(PartQuality.F)).toBe(0.8);
  });

  it('RED: standard quality D has neutral multiplier (1.0x)', () => {
    expect(getQualityRepairCostMultiplier(PartQuality.D)).toBe(1.0);
  });

  it('GREEN: multipliers decrease monotonically from A to F', () => {
    const qualities = [
      PartQuality.A,
      PartQuality.B,
      PartQuality.C,
      PartQuality.D,
      PartQuality.E,
      PartQuality.F,
    ];
    for (let i = 0; i < qualities.length - 1; i++) {
      const current = QUALITY_REPAIR_COST_MULTIPLIER[qualities[i]];
      const next = QUALITY_REPAIR_COST_MULTIPLIER[qualities[i + 1]];
      expect(current).toBeGreaterThan(next);
    }
  });

  it('GREEN: all quality grades have a defined multiplier', () => {
    for (const quality of Object.values(PartQuality)) {
      expect(QUALITY_REPAIR_COST_MULTIPLIER[quality]).toBeDefined();
      expect(QUALITY_REPAIR_COST_MULTIPLIER[quality]).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Quality-Adjusted Repair Cost
// =============================================================================

describe('calculateQualityAdjustedRepairCost', () => {
  it('RED: quality D returns base cost unchanged', () => {
    const baseCost = 1000;
    const adjusted = calculateQualityAdjustedRepairCost(baseCost, PartQuality.D);
    expect(adjusted).toBe(1000);
  });

  it('RED: quality A increases cost by 1.5x', () => {
    const baseCost = 1000;
    const adjusted = calculateQualityAdjustedRepairCost(baseCost, PartQuality.A);
    expect(adjusted).toBe(1500);
  });

  it('RED: quality F decreases cost to 0.8x', () => {
    const baseCost = 1000;
    const adjusted = calculateQualityAdjustedRepairCost(baseCost, PartQuality.F);
    expect(adjusted).toBe(800);
  });

  it('RED: undefined quality defaults to D (no change)', () => {
    const baseCost = 1000;
    const adjusted = calculateQualityAdjustedRepairCost(baseCost, undefined);
    expect(adjusted).toBe(1000);
  });

  it('GREEN: result is always rounded up to integer', () => {
    const baseCost = 333;
    const adjusted = calculateQualityAdjustedRepairCost(baseCost, PartQuality.C);
    expect(Number.isInteger(adjusted)).toBe(true);
    expect(adjusted).toBe(Math.ceil(333 * 1.1));
  });

  it('GREEN: works with real armor repair cost', () => {
    const armorCost = calculateArmorRepairCost(10, 'standard');
    const adjustedA = calculateQualityAdjustedRepairCost(armorCost, PartQuality.A);
    const adjustedF = calculateQualityAdjustedRepairCost(armorCost, PartQuality.F);
    expect(adjustedA).toBeGreaterThan(armorCost);
    expect(adjustedF).toBeLessThan(armorCost);
  });
});

// =============================================================================
// Repair Target Number
// =============================================================================

describe('calculateRepairTargetNumber', () => {
  it('RED: tech skill 5 + quality D = TN 5 (no modifier)', () => {
    const tn = calculateRepairTargetNumber(5, PartQuality.D);
    expect(tn).toBe(5);
  });

  it('RED: tech skill 5 + quality A = TN 8 (+3 modifier)', () => {
    const tn = calculateRepairTargetNumber(5, PartQuality.A);
    expect(tn).toBe(8);
  });

  it('RED: tech skill 5 + quality F = TN 3 (-2 modifier)', () => {
    const tn = calculateRepairTargetNumber(5, PartQuality.F);
    expect(tn).toBe(3);
  });

  it('RED: undefined quality defaults to D (TN = skill value)', () => {
    const tn = calculateRepairTargetNumber(7, undefined);
    expect(tn).toBe(7);
  });

  it('RED: additional modifiers are added', () => {
    const tn = calculateRepairTargetNumber(5, PartQuality.D, 2);
    expect(tn).toBe(7);
  });

  it('GREEN: higher quality makes repair easier (lower TN)', () => {
    const tnA = calculateRepairTargetNumber(5, PartQuality.A);
    const tnF = calculateRepairTargetNumber(5, PartQuality.F);
    expect(tnA).toBeGreaterThan(tnF);
  });

  it('GREEN: unskilled tech (value 10) + worst quality A = very hard TN', () => {
    const tn = calculateRepairTargetNumber(10, PartQuality.A);
    expect(tn).toBe(13);
  });
});

// =============================================================================
// Backward Compatibility
// =============================================================================

describe('Backward Compatibility', () => {
  it('RED: existing repair jobs work without quality fields', () => {
    const job: IRepairJob = {
      id: 'job-1',
      unitId: 'unit-1',
      unitName: 'Atlas AS7-D',
      campaignId: 'campaign-1',
      status: RepairJobStatus.Pending,
      items: [
        {
          id: 'item-1',
          type: RepairType.Armor,
          location: UnitLocation.CenterTorso,
          pointsToRestore: 10,
          cost: 1000,
          timeHours: 1,
          selected: true,
        },
      ],
      totalCost: 1000,
      totalTimeHours: 1,
      timeRemainingHours: 1,
      priority: 1,
      createdAt: new Date().toISOString(),
    };

    expect(job.assignedTechId).toBeUndefined();
    expect(job.unitQuality).toBeUndefined();
    expect(job.totalCost).toBe(1000);
  });

  it('RED: repair job with quality fields works correctly', () => {
    const job: IRepairJob = {
      id: 'job-2',
      unitId: 'unit-2',
      unitName: 'Hunchback HBK-4G',
      campaignId: 'campaign-1',
      status: RepairJobStatus.InProgress,
      items: [],
      totalCost: 500,
      totalTimeHours: 2,
      timeRemainingHours: 1,
      priority: 2,
      createdAt: new Date().toISOString(),
      assignedTechId: 'tech-001',
      unitQuality: PartQuality.C,
    };

    expect(job.assignedTechId).toBe('tech-001');
    expect(job.unitQuality).toBe(PartQuality.C);
  });

  it('RED: salvaged part without quality field works', () => {
    const part: ISalvagedPart = {
      id: 'part-1',
      componentName: 'Medium Laser',
      sourceUnitName: 'Enemy Mech',
      missionId: 'mission-1',
      condition: 0.8,
      estimatedValue: 5000,
    };

    expect(part.quality).toBeUndefined();
  });

  it('RED: salvaged part with quality field works', () => {
    const part: ISalvagedPart = {
      id: 'part-2',
      componentName: 'PPC',
      sourceUnitName: 'Salvaged Warhammer',
      missionId: 'mission-2',
      condition: 0.6,
      estimatedValue: 12000,
      quality: PartQuality.C,
    };

    expect(part.quality).toBe(PartQuality.C);
  });
});
