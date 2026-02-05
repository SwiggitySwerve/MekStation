/**
 * Repair Interfaces Tests
 */

import {
  RepairType,
  RepairJobStatus,
  UnitLocation,
  REPAIR_COSTS,
  ARMOR_COST_MODIFIERS,
  STRUCTURE_COST_MODIFIERS,
  ILocationDamage,
  IDamageAssessment,
  IRepairItem,
  IRepairJob,
  ISalvageInventory,
  DEFAULT_REPAIR_BAY,
  calculateArmorRepairCost,
  calculateStructureRepairCost,
  calculateArmorRepairTime,
  calculateStructureRepairTime,
  calculateTotalRepairCost,
  calculateTotalRepairTime,
  calculateFieldRepair,
  createDamageAssessment,
  generateRepairItems,
  validateRepairJob,
  isRepairJob,
  isDamageAssessment,
  findMatchingSalvage,
  sortJobsByPriority,
} from '../RepairInterfaces';

// =============================================================================
// Test Data Factories
// =============================================================================

function createTestLocationDamage(
  overrides: Partial<ILocationDamage> = {},
): ILocationDamage {
  return {
    location: UnitLocation.CenterTorso,
    armorDamage: 10,
    armorMax: 40,
    structureDamage: 0,
    structureMax: 20,
    destroyedComponents: [],
    damagedComponents: [],
    ...overrides,
  };
}

function createTestAssessment(
  overrides: Partial<IDamageAssessment> = {},
): IDamageAssessment {
  return {
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    locationDamage: [createTestLocationDamage()],
    totalArmorDamage: 10,
    totalArmorMax: 40,
    totalStructureDamage: 0,
    totalStructureMax: 20,
    allDestroyedComponents: [],
    allDamagedComponents: [],
    operationalPercent: 85,
    isDestroyed: false,
    ...overrides,
  };
}

function createTestRepairItem(
  overrides: Partial<IRepairItem> = {},
): IRepairItem {
  return {
    id: 'item-1',
    type: RepairType.Armor,
    location: UnitLocation.CenterTorso,
    pointsToRestore: 10,
    cost: 1000,
    timeHours: 1,
    selected: true,
    ...overrides,
  };
}

function createTestRepairJob(overrides: Partial<IRepairJob> = {}): IRepairJob {
  return {
    id: 'job-1',
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    campaignId: 'campaign-1',
    status: RepairJobStatus.Pending,
    items: [createTestRepairItem()],
    totalCost: 1000,
    totalTimeHours: 1,
    timeRemainingHours: 1,
    priority: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// Enum Tests
// =============================================================================

describe('Repair Enums', () => {
  describe('RepairType', () => {
    it('should have all expected values', () => {
      expect(RepairType.Armor).toBe('armor');
      expect(RepairType.Structure).toBe('structure');
      expect(RepairType.ComponentRepair).toBe('component_repair');
      expect(RepairType.ComponentReplace).toBe('component_replace');
    });
  });

  describe('RepairJobStatus', () => {
    it('should have all expected values', () => {
      expect(RepairJobStatus.Pending).toBe('pending');
      expect(RepairJobStatus.InProgress).toBe('in_progress');
      expect(RepairJobStatus.Completed).toBe('completed');
      expect(RepairJobStatus.Cancelled).toBe('cancelled');
      expect(RepairJobStatus.Blocked).toBe('blocked');
    });
  });

  describe('UnitLocation', () => {
    it('should have all mech locations', () => {
      expect(UnitLocation.Head).toBe('head');
      expect(UnitLocation.CenterTorso).toBe('center_torso');
      expect(UnitLocation.LeftArm).toBe('left_arm');
      expect(UnitLocation.RightArm).toBe('right_arm');
      expect(UnitLocation.LeftLeg).toBe('left_leg');
      expect(UnitLocation.RightLeg).toBe('right_leg');
    });
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Repair Constants', () => {
  describe('REPAIR_COSTS', () => {
    it('should have positive cost values', () => {
      expect(REPAIR_COSTS.ARMOR_PER_POINT).toBeGreaterThan(0);
      expect(REPAIR_COSTS.STRUCTURE_PER_POINT).toBeGreaterThan(0);
    });

    it('structure should cost more than armor per point', () => {
      expect(REPAIR_COSTS.STRUCTURE_PER_POINT).toBeGreaterThan(
        REPAIR_COSTS.ARMOR_PER_POINT,
      );
    });

    it('critical damage multiplier should be > 1', () => {
      expect(REPAIR_COSTS.CRITICAL_DAMAGE_MULTIPLIER).toBeGreaterThan(1);
    });

    it('field repair should restore limited armor', () => {
      expect(REPAIR_COSTS.FIELD_REPAIR_ARMOR_PERCENT).toBeGreaterThan(0);
      expect(REPAIR_COSTS.FIELD_REPAIR_ARMOR_PERCENT).toBeLessThanOrEqual(0.5);
    });
  });

  describe('ARMOR_COST_MODIFIERS', () => {
    it('should have standard armor as baseline (1.0)', () => {
      expect(ARMOR_COST_MODIFIERS['standard']).toBe(1.0);
    });

    it('should have higher modifiers for advanced armor', () => {
      expect(ARMOR_COST_MODIFIERS['ferro-fibrous']).toBeGreaterThan(1.0);
      expect(ARMOR_COST_MODIFIERS['stealth']).toBeGreaterThan(1.0);
    });
  });

  describe('STRUCTURE_COST_MODIFIERS', () => {
    it('should have standard structure as baseline (1.0)', () => {
      expect(STRUCTURE_COST_MODIFIERS['standard']).toBe(1.0);
    });

    it('should have higher modifiers for advanced structure', () => {
      expect(STRUCTURE_COST_MODIFIERS['endo-steel']).toBeGreaterThan(1.0);
    });
  });

  describe('DEFAULT_REPAIR_BAY', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_REPAIR_BAY.capacity).toBeGreaterThan(0);
      expect(DEFAULT_REPAIR_BAY.efficiency).toBe(1.0);
      expect(DEFAULT_REPAIR_BAY.activeJobs).toHaveLength(0);
      expect(DEFAULT_REPAIR_BAY.queuedJobs).toHaveLength(0);
    });
  });
});

// =============================================================================
// Cost Calculation Tests
// =============================================================================

describe('Cost Calculations', () => {
  describe('calculateArmorRepairCost', () => {
    it('should calculate standard armor cost', () => {
      const cost = calculateArmorRepairCost(10, 'standard');
      expect(cost).toBe(10 * REPAIR_COSTS.ARMOR_PER_POINT);
    });

    it('should apply armor type modifier', () => {
      const standardCost = calculateArmorRepairCost(10, 'standard');
      const ferroCost = calculateArmorRepairCost(10, 'ferro-fibrous');
      expect(ferroCost).toBeGreaterThan(standardCost);
    });

    it('should use default modifier for unknown armor type', () => {
      const cost = calculateArmorRepairCost(10, 'unknown');
      expect(cost).toBe(10 * REPAIR_COSTS.ARMOR_PER_POINT);
    });

    it('should round up to nearest integer', () => {
      const cost = calculateArmorRepairCost(1, 'standard');
      expect(Number.isInteger(cost)).toBe(true);
    });
  });

  describe('calculateStructureRepairCost', () => {
    it('should calculate standard structure cost', () => {
      const cost = calculateStructureRepairCost(5, 'standard', false);
      expect(cost).toBe(5 * REPAIR_COSTS.STRUCTURE_PER_POINT);
    });

    it('should apply critical damage multiplier', () => {
      const normalCost = calculateStructureRepairCost(5, 'standard', false);
      const criticalCost = calculateStructureRepairCost(5, 'standard', true);
      expect(criticalCost).toBeGreaterThan(normalCost);
    });

    it('should apply structure type modifier', () => {
      const standardCost = calculateStructureRepairCost(5, 'standard', false);
      const endoCost = calculateStructureRepairCost(5, 'endo-steel', false);
      expect(endoCost).toBeGreaterThan(standardCost);
    });
  });

  describe('calculateArmorRepairTime', () => {
    it('should calculate repair time based on points', () => {
      const time = calculateArmorRepairTime(10);
      expect(time).toBeGreaterThan(0);
    });

    it('should scale with damage amount', () => {
      const smallTime = calculateArmorRepairTime(5);
      const largeTime = calculateArmorRepairTime(20);
      expect(largeTime).toBeGreaterThan(smallTime);
    });
  });

  describe('calculateStructureRepairTime', () => {
    it('should calculate repair time based on points', () => {
      const time = calculateStructureRepairTime(5);
      expect(time).toBe(5 * REPAIR_COSTS.STRUCTURE_TIME_PER_POINT);
    });
  });

  describe('calculateTotalRepairCost', () => {
    it('should sum selected item costs', () => {
      const items = [
        createTestRepairItem({ id: '1', cost: 100, selected: true }),
        createTestRepairItem({ id: '2', cost: 200, selected: true }),
        createTestRepairItem({ id: '3', cost: 300, selected: false }),
      ];
      const total = calculateTotalRepairCost(items);
      expect(total).toBe(300); // Only selected items
    });

    it('should return 0 for no selected items', () => {
      const items = [
        createTestRepairItem({ id: '1', cost: 100, selected: false }),
      ];
      const total = calculateTotalRepairCost(items);
      expect(total).toBe(0);
    });
  });

  describe('calculateTotalRepairTime', () => {
    it('should sum selected item times', () => {
      const items = [
        createTestRepairItem({ id: '1', timeHours: 2, selected: true }),
        createTestRepairItem({ id: '2', timeHours: 3, selected: true }),
        createTestRepairItem({ id: '3', timeHours: 5, selected: false }),
      ];
      const total = calculateTotalRepairTime(items);
      expect(total).toBe(5);
    });
  });
});

// =============================================================================
// Field Repair Tests
// =============================================================================

describe('calculateFieldRepair', () => {
  it('should restore limited armor', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          location: UnitLocation.CenterTorso,
          armorDamage: 20,
          armorMax: 40,
        }),
      ],
    });

    const result = calculateFieldRepair(assessment, 100);

    expect(result.totalArmorRestored).toBeGreaterThan(0);
    expect(result.totalArmorRestored).toBeLessThanOrEqual(20);
  });

  it('should consume supplies', () => {
    const assessment = createTestAssessment();
    const result = calculateFieldRepair(assessment, 100);

    expect(result.suppliesUsed).toBeGreaterThan(0);
  });

  it('should be limited by available supplies', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 100,
          armorMax: 200,
        }),
      ],
    });

    const result = calculateFieldRepair(assessment, 1); // Very limited supplies

    expect(result.wasLimited).toBe(true);
    expect(result.totalArmorRestored).toBeLessThan(100);
  });

  it('should not restore more than damaged', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 5,
          armorMax: 40,
        }),
      ],
    });

    const result = calculateFieldRepair(assessment, 1000);

    expect(result.totalArmorRestored).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// Damage Assessment Tests
// =============================================================================

describe('createDamageAssessment', () => {
  it('should create assessment from damage data', () => {
    const assessment = createDamageAssessment(
      'unit-1',
      'Atlas',
      { center_torso: 10 },
      { center_torso: 0 },
      [],
      { center_torso: 40 },
      { center_torso: 20 },
    );

    expect(assessment.unitId).toBe('unit-1');
    expect(assessment.unitName).toBe('Atlas');
    expect(assessment.totalArmorDamage).toBe(10);
    expect(assessment.isDestroyed).toBe(false);
  });

  it('should mark unit as destroyed if CT structure gone', () => {
    const assessment = createDamageAssessment(
      'unit-1',
      'Atlas',
      { center_torso: 40 },
      { center_torso: 20 },
      [],
      { center_torso: 40 },
      { center_torso: 20 },
    );

    expect(assessment.isDestroyed).toBe(true);
    expect(assessment.operationalPercent).toBe(0);
  });

  it('should calculate operational percentage', () => {
    const assessment = createDamageAssessment(
      'unit-1',
      'Atlas',
      { center_torso: 20 }, // 50% armor damage
      { center_torso: 0 },
      [],
      { center_torso: 40 },
      { center_torso: 20 },
    );

    expect(assessment.operationalPercent).toBeGreaterThan(0);
    expect(assessment.operationalPercent).toBeLessThan(100);
  });
});

describe('generateRepairItems', () => {
  it('should generate armor repair items for damage', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 10,
          structureDamage: 0,
        }),
      ],
    });

    const items = generateRepairItems(assessment);

    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.type === RepairType.Armor)).toBe(true);
  });

  it('should generate structure repair items', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 0,
          structureDamage: 5,
        }),
      ],
    });

    const items = generateRepairItems(assessment);

    expect(items.some((i) => i.type === RepairType.Structure)).toBe(true);
  });

  it('should generate component replacement items', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 0,
          structureDamage: 0,
          destroyedComponents: ['Medium Laser'],
        }),
      ],
    });

    const items = generateRepairItems(assessment);

    expect(items.some((i) => i.type === RepairType.ComponentReplace)).toBe(
      true,
    );
  });

  it('should mark all items as selected by default', () => {
    const assessment = createTestAssessment();
    const items = generateRepairItems(assessment);

    expect(items.every((i) => i.selected)).toBe(true);
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('validateRepairJob', () => {
  it('should pass for valid job with sufficient resources', () => {
    const job = createTestRepairJob({ totalCost: 1000 });
    const result = validateRepairJob(job, 5000, 100);

    expect(result.valid).toBe(true);
    expect(result.canAfford).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('should fail for insufficient C-Bills', () => {
    const job = createTestRepairJob({ totalCost: 5000 });
    const result = validateRepairJob(job, 1000, 100);

    expect(result.valid).toBe(false);
    expect(result.canAfford).toBe(false);
    expect(result.shortfall).toBe(4000);
  });

  it('should fail for job with no items', () => {
    const job = createTestRepairJob({ items: [] });
    const result = validateRepairJob(job, 5000, 100);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('no items'))).toBe(true);
  });

  it('should fail for job with no selected items', () => {
    const job = createTestRepairJob({
      items: [createTestRepairItem({ selected: false })],
    });
    const result = validateRepairJob(job, 5000, 100);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('No repair items are selected')),
    ).toBe(true);
  });

  it('should warn about high cost', () => {
    const job = createTestRepairJob({ totalCost: 3000 });
    const result = validateRepairJob(job, 5000, 100);

    expect(result.warnings.some((w) => w.includes('50%'))).toBe(true);
  });

  it('should warn about long repair time', () => {
    const job = createTestRepairJob({ totalTimeHours: 72 });
    const result = validateRepairJob(job, 50000, 100);

    expect(result.warnings.some((w) => w.includes('48 hours'))).toBe(true);
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('Type Guards', () => {
  describe('isRepairJob', () => {
    it('should return true for valid repair job', () => {
      const job = createTestRepairJob();
      expect(isRepairJob(job)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRepairJob(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isRepairJob('string')).toBe(false);
      expect(isRepairJob(123)).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      expect(isRepairJob({ id: 'test' })).toBe(false);
    });
  });

  describe('isDamageAssessment', () => {
    it('should return true for valid assessment', () => {
      const assessment = createTestAssessment();
      expect(isDamageAssessment(assessment)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isDamageAssessment(null)).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      expect(isDamageAssessment({ unitId: 'test' })).toBe(false);
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('findMatchingSalvage', () => {
    it('should find matching salvage part', () => {
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

      const match = findMatchingSalvage(item, inventory);
      expect(match).toBeDefined();
      expect(match?.componentName).toBe('Medium Laser');
    });

    it('should not find match for non-component repair', () => {
      const item = createTestRepairItem({ type: RepairType.Armor });
      const inventory: ISalvageInventory = {
        parts: [],
        totalValue: 0,
      };

      const match = findMatchingSalvage(item, inventory);
      expect(match).toBeUndefined();
    });

    it('should not match parts in poor condition', () => {
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
            condition: 0.3, // Too damaged
            estimatedValue: 2000,
          },
        ],
        totalValue: 2000,
      };

      const match = findMatchingSalvage(item, inventory);
      expect(match).toBeUndefined();
    });
  });

  describe('sortJobsByPriority', () => {
    it('should sort by priority (lower first)', () => {
      const jobs = [
        createTestRepairJob({ id: 'job-3', priority: 3 }),
        createTestRepairJob({ id: 'job-1', priority: 1 }),
        createTestRepairJob({ id: 'job-2', priority: 2 }),
      ];

      const sorted = sortJobsByPriority(jobs);

      expect(sorted[0].id).toBe('job-1');
      expect(sorted[1].id).toBe('job-2');
      expect(sorted[2].id).toBe('job-3');
    });

    it('should sort by created date for same priority', () => {
      const oldDate = new Date('2026-01-01').toISOString();
      const newDate = new Date('2026-01-02').toISOString();

      const jobs = [
        createTestRepairJob({ id: 'job-new', priority: 1, createdAt: newDate }),
        createTestRepairJob({ id: 'job-old', priority: 1, createdAt: oldDate }),
      ];

      const sorted = sortJobsByPriority(jobs);

      expect(sorted[0].id).toBe('job-old');
      expect(sorted[1].id).toBe('job-new');
    });
  });
});
