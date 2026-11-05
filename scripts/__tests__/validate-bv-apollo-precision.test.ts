import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'apollo-precision',
  chassis: 'Test',
  model: 'Apollo',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9, CENTER_TORSO: 20 } },
  heatSinks: { type: 'DOUBLE', count: 20 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// Pinned MegaMek 48fcb2f64 BVCalculator.java:860-876 retains the double product.
it.each([
  ['mrm-10', 56, 64.4],
  ['mrm-20', 112, 128.8],
  ['mrm-30', 168, 193.2],
  ['mrm-40', 224, 257.6],
] as const)(
  'retains fractional Apollo BV for %s through the shared Mech owner',
  (id, base, linked) => {
    const source = { ...unit, equipment: [{ id, location: 'RIGHT_TORSO' }] };
    expect(calculateUnitBV(source).breakdown?.weaponBV).toBe(base);
    const b = calculateUnitBV({
      ...source,
      criticalSlots: { RIGHT_TORSO: ['ISMRM' + id.slice(4), 'ISApollo'] },
    }).breakdown;
    expect(b?.weaponBV).toBeCloseTo(linked, 10);
    expect(b?.offensiveBV).toBeCloseTo((linked + 50) * 1.12, 10);
  },
);

it('does not round separate linked mounts before adding them', () => {
  const b = calculateUnitBV({
    ...unit,
    equipment: [
      { id: 'mrm-10', location: 'RIGHT_TORSO' },
      { id: 'mrm-20', location: 'LEFT_TORSO' },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['ISMRM10', 'ISApollo'],
      LEFT_TORSO: ['ISMRM20', 'ISApollo'],
    },
  }).breakdown;
  expect(b?.weaponBV).toBeCloseTo(193.2, 10);
});
