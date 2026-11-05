import type { UnitData } from '../validate-bv-types';

import { resolveEquipmentBV } from '../../src/utils/construction/equipmentBVResolver';
import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'harjel-negative',
  chassis: 'Test',
  model: 'HarJel',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'CLAN',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'DOUBLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// MegaMek 48fcb2f64: MiscType.java:8981-8992,9014-9025;
// BVCalculator.java:596-603 adds the signed mounted BV directly to defense.
it.each([
  ['HarJel Repair Systems (HarJel II)', -1, 1],
  ['HarJel Repair Systems (HarJel III)', -2, 2],
] as const)('%s reaches the mech total without clamping', (name, bv, slots) => {
  const before = calculateUnitBV(unit).breakdown!;
  const after = calculateUnitBV({
    ...unit,
    criticalSlots: { LEFT_TORSO: Array(slots).fill(name) },
  });
  const result = after.breakdown!;
  expect(resolveEquipmentBV(name).battleValue).toBe(bv);
  expect(result.defEquipBV).toBe(bv);
  // This torso has no armor: isolate negative equipment BV from the armor bonus.
  expect(result.harjelBonus).toBe(0);
  expect(result.defensiveBV).toBeCloseTo(
    before.defensiveBV + bv * result.defensiveFactor,
    10,
  );
  expect(result.offensiveBV).toBe(before.offensiveBV);
  expect(after.bv).toBe(Math.round(result.defensiveBV + result.offensiveBV));
  expect(after.bv).toBeLessThan(
    Math.round(before.defensiveBV + before.offensiveBV),
  );
});

it('counts one HarJel III mount per location, despite its two critical slots', () => {
  const name = 'HarJel Repair Systems (HarJel III)';
  const result = calculateUnitBV({
    ...unit,
    criticalSlots: {
      LEFT_TORSO: [name, name],
      RIGHT_TORSO: [name, name],
      CENTER_TORSO: [name, name],
    },
  }).breakdown!;
  expect(result.defEquipBV).toBe(-6);
});
