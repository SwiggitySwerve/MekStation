import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'bridge-defense',
  chassis: 'Test',
  model: 'Bridge',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// BVCalculator.java:534-536,1004-1006 (48fcb2f64) includes bridge layers
// in defense and excludes them from offensive miscellaneous equipment.
it.each([
  ['LightBridgeLayer', 5],
  ['MediumBridgeLayer', 10],
  ['HeavyBridgeLayer', 20],
])('counts %s once in defense', (name, bv) => {
  const before = calculateUnitBV(unit).breakdown!;
  const after = calculateUnitBV({
    ...unit,
    criticalSlots: { LEFT_TORSO: Array<string>(4).fill(name) },
  }).breakdown!;
  expect(after.defEquipBV).toBe(bv);
  expect(after.defensiveBV).toBeCloseTo(before.defensiveBV + bv * 1.2, 10);
  expect(after.offEquipBV).toBe(0);
  expect(after.offensiveBV).toBe(before.offensiveBV);
});

it('counts a distinct bridge mount at each location', () => {
  expect(
    calculateUnitBV({
      ...unit,
      criticalSlots: {
        LEFT_TORSO: ['MediumBridgeLayer'],
        RIGHT_TORSO: ['MediumBridgeLayer'],
      },
    }).breakdown?.defEquipBV,
  ).toBe(20);
});
