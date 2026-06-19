import {
  REPAIR_COSTS,
  UnitLocation,
  calculateArmorRepairCost,
  calculateArmorRepairTime,
  calculateFieldRepair,
  calculateStructureRepairCost,
  calculateStructureRepairTime,
  calculateTotalRepairCost,
  calculateTotalRepairTime,
} from '../RepairInterfaces';
import {
  createTestAssessment,
  createTestLocationDamage,
  createTestRepairItem,
} from './repairTestFactories';

describe('calculateArmorRepairCost', () => {
  it('calculates standard armor cost', () => {
    expect(calculateArmorRepairCost(10, 'standard')).toBe(
      10 * REPAIR_COSTS.ARMOR_PER_POINT,
    );
  });

  it('applies armor type modifiers', () => {
    const standardCost = calculateArmorRepairCost(10, 'standard');
    const ferroCost = calculateArmorRepairCost(10, 'ferro-fibrous');

    expect(ferroCost).toBeGreaterThan(standardCost);
  });

  it('uses standard modifier for unknown armor types and rounds up', () => {
    const cost = calculateArmorRepairCost(1, 'unknown');

    expect(cost).toBe(REPAIR_COSTS.ARMOR_PER_POINT);
    expect(Number.isInteger(cost)).toBe(true);
  });
});

describe('calculateStructureRepairCost', () => {
  it('calculates standard structure cost', () => {
    expect(calculateStructureRepairCost(5, 'standard', false)).toBe(
      5 * REPAIR_COSTS.STRUCTURE_PER_POINT,
    );
  });

  it('applies critical damage and structure type modifiers', () => {
    const normalCost = calculateStructureRepairCost(5, 'standard', false);
    const criticalCost = calculateStructureRepairCost(5, 'standard', true);
    const endoCost = calculateStructureRepairCost(5, 'endo-steel', false);

    expect(criticalCost).toBeGreaterThan(normalCost);
    expect(endoCost).toBeGreaterThan(normalCost);
  });
});

describe('repair time and totals', () => {
  it('calculates armor and structure repair time from points', () => {
    expect(calculateArmorRepairTime(10)).toBeGreaterThan(0);
    expect(calculateArmorRepairTime(20)).toBeGreaterThan(
      calculateArmorRepairTime(5),
    );
    expect(calculateStructureRepairTime(5)).toBe(
      5 * REPAIR_COSTS.STRUCTURE_TIME_PER_POINT,
    );
  });

  it('sums only selected repair item costs and time', () => {
    const items = [
      createTestRepairItem({ id: '1', cost: 100, timeHours: 2 }),
      createTestRepairItem({ id: '2', cost: 200, timeHours: 3 }),
      createTestRepairItem({
        id: '3',
        cost: 300,
        timeHours: 5,
        selected: false,
      }),
    ];

    expect(calculateTotalRepairCost(items)).toBe(300);
    expect(calculateTotalRepairTime(items)).toBe(5);
  });

  it('returns zero cost when no repair items are selected', () => {
    const items = [createTestRepairItem({ selected: false })];

    expect(calculateTotalRepairCost(items)).toBe(0);
  });
});

describe('calculateFieldRepair', () => {
  it('restores limited armor and consumes supplies', () => {
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
    expect(result.suppliesUsed).toBeGreaterThan(0);
  });

  it('is limited by available supplies', () => {
    const assessment = createTestAssessment({
      locationDamage: [
        createTestLocationDamage({
          armorDamage: 100,
          armorMax: 200,
        }),
      ],
    });

    const result = calculateFieldRepair(assessment, 1);

    expect(result.wasLimited).toBe(true);
    expect(result.totalArmorRestored).toBeLessThan(100);
  });

  it('does not restore more armor than was damaged', () => {
    const assessment = createTestAssessment({
      locationDamage: [createTestLocationDamage({ armorDamage: 5 })],
    });

    expect(
      calculateFieldRepair(assessment, 1000).totalArmorRestored,
    ).toBeLessThanOrEqual(5);
  });
});
