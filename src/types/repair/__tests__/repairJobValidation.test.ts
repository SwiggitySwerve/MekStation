import {
  RepairJobStatus,
  RepairType,
  findMatchingSalvage,
  isDamageAssessment,
  isRepairJob,
  sortJobsByPriority,
  validateRepairJob,
  type ISalvageInventory,
} from '../RepairInterfaces';
import {
  createTestAssessment,
  createTestRepairItem,
  createTestRepairJob,
} from './repairTestFactories';

describe('validateRepairJob', () => {
  it('passes for a valid job with sufficient resources', () => {
    const result = validateRepairJob(
      createTestRepairJob({ totalCost: 1000 }),
      5000,
      100,
    );

    expect(result.valid).toBe(true);
    expect(result.canAfford).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('fails when C-Bills are insufficient', () => {
    const result = validateRepairJob(
      createTestRepairJob({ totalCost: 5000 }),
      1000,
      100,
    );

    expect(result.valid).toBe(false);
    expect(result.canAfford).toBe(false);
    expect(result.shortfall).toBe(4000);
  });

  it('fails when the job has no items or no selected items', () => {
    const noItems = validateRepairJob(
      createTestRepairJob({ items: [] }),
      5000,
      100,
    );
    const noSelectedItems = validateRepairJob(
      createTestRepairJob({
        items: [createTestRepairItem({ selected: false })],
      }),
      5000,
      100,
    );

    expect(noItems.valid).toBe(false);
    expect(noItems.errors.some((error) => error.includes('no items'))).toBe(
      true,
    );
    expect(noSelectedItems.valid).toBe(false);
    expect(
      noSelectedItems.errors.some((error) =>
        error.includes('No repair items are selected'),
      ),
    ).toBe(true);
  });

  it('warns about high cost and long repair time', () => {
    const expensiveRepair = validateRepairJob(
      createTestRepairJob({ totalCost: 3000 }),
      5000,
      100,
    );
    const longRepair = validateRepairJob(
      createTestRepairJob({ totalTimeHours: 72 }),
      50000,
      100,
    );

    expect(
      expensiveRepair.warnings.some((warning) => warning.includes('50%')),
    ).toBe(true);
    expect(
      longRepair.warnings.some((warning) => warning.includes('48 hours')),
    ).toBe(true);
  });
});

describe('repair type guards', () => {
  it('identifies valid repair jobs and damage assessments', () => {
    expect(isRepairJob(createTestRepairJob())).toBe(true);
    expect(isDamageAssessment(createTestAssessment())).toBe(true);
  });

  it('rejects null, primitive, and incomplete values', () => {
    expect(isRepairJob(null)).toBe(false);
    expect(isRepairJob('string')).toBe(false);
    expect(isRepairJob(123)).toBe(false);
    expect(isRepairJob({ id: 'test' })).toBe(false);
    expect(isDamageAssessment(null)).toBe(false);
    expect(isDamageAssessment({ unitId: 'test' })).toBe(false);
  });
});

describe('repair utilities', () => {
  it('finds matching salvage parts in usable condition', () => {
    const item = createTestRepairItem({
      type: RepairType.ComponentReplace,
      componentName: 'Medium Laser',
    });
    const inventory: ISalvageInventory = {
      parts: [
        {
          id: 'part-1',
          componentName: 'Medium Laser',
          sourceUnitName: 'Enemy Mech',
          missionId: 'mission-1',
          condition: 0.8,
          estimatedValue: 5000,
        },
      ],
      totalValue: 5000,
    };

    expect(findMatchingSalvage(item, inventory)?.componentName).toBe(
      'Medium Laser',
    );
  });

  it('does not match non-component repairs or poor-condition parts', () => {
    const poorConditionInventory: ISalvageInventory = {
      parts: [
        {
          id: 'part-1',
          componentName: 'Medium Laser',
          sourceUnitName: 'Enemy Mech',
          missionId: 'mission-1',
          condition: 0.3,
          estimatedValue: 2000,
        },
      ],
      totalValue: 2000,
    };

    expect(
      findMatchingSalvage(createTestRepairItem({ type: RepairType.Armor }), {
        parts: [],
        totalValue: 0,
      }),
    ).toBeUndefined();
    expect(
      findMatchingSalvage(
        createTestRepairItem({
          type: RepairType.ComponentReplace,
          componentName: 'Medium Laser',
        }),
        poorConditionInventory,
      ),
    ).toBeUndefined();
  });

  it('sorts jobs by priority and creation date', () => {
    const oldDate = new Date('2026-01-01').toISOString();
    const newDate = new Date('2026-01-02').toISOString();
    const jobs = [
      createTestRepairJob({ id: 'job-3', priority: 3 }),
      createTestRepairJob({ id: 'job-new', priority: 1, createdAt: newDate }),
      createTestRepairJob({ id: 'job-old', priority: 1, createdAt: oldDate }),
      createTestRepairJob({
        id: 'job-blocked',
        status: RepairJobStatus.Blocked,
        priority: 2,
      }),
    ];

    const sorted = sortJobsByPriority(jobs);

    expect(sorted.map((job) => job.id)).toEqual([
      'job-old',
      'job-new',
      'job-blocked',
      'job-3',
    ]);
  });
});
