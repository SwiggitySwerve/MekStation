import type { UnitData } from '../validate-bv-types';

import { getCockpitModifier } from '../../src/utils/construction/battleValueTotals';
import { calculateUnitBV } from '../validate-bv-calculator';
import { mapCockpitType } from '../validate-bv-unit-derived';

// MekBVCalculator.java:469-473 (48fcb2f64): VRRP summary multiplier is 1.4.
it.each(['VRRP', 'Virtual Reality Piloting Pod'])(
  'preserves the native summary modifier for %s',
  (cockpit) => {
    expect(getCockpitModifier(mapCockpitType(cockpit))).toBe(1.4);
    const unit: UnitData = {
      id: 'vrrp',
      chassis: 'Test',
      model: 'VRRP',
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
    const before = calculateUnitBV(unit).breakdown!;
    const after = calculateUnitBV({ ...unit, cockpit });
    expect(after.breakdown?.defensiveBV).toBe(before.defensiveBV);
    expect(after.breakdown?.offensiveBV).toBe(before.offensiveBV);
    expect(after.bv).toBe(
      Math.round((before.defensiveBV + before.offensiveBV) * 1.4),
    );
  },
);

it.each([
  ['STANDARD', 1],
  ['INTERFACE', 1.3],
  ['SMALL', 0.95],
] as const)('retains %s cockpit BV', (name, expected) =>
  expect(getCockpitModifier(mapCockpitType(name))).toBe(expected),
);
