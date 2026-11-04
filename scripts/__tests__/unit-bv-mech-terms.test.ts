import type { UnitData } from '../validate-bv-types';

import { mechBVTerms } from '../../src/utils/construction/mechBV/bvTrace';
import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'trace-probe',
  chassis: 'Trace',
  model: 'Probe',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9, CENTER_TORSO: 20 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

test.each([
  ['STANDARD', 1, 1],
  ['INDUSTRIAL', 0.9, 1],
  ['SMALL', 1, 0.95],
] as const)(
  'mech breakdown exposes its actual %s type and summary stages',
  (cockpit, offensiveTypeModifier, summaryModifier) => {
    const b = calculateUnitBV({ ...unit, cockpit }).breakdown;
    expect(b).toMatchObject({ offensiveTypeModifier, summaryModifier });
  },
);

test('mech adapter partitions existing components into their native stages', () => {
  const breakdown = calculateUnitBV(unit).breakdown;
  if (!breakdown) throw new Error('Missing Mech breakdown');
  expect(
    mechBVTerms({
      ...breakdown,
      armorBV: 100,
      harjelBonus: 3,
      structureBV: 50,
      gyroBV: 25,
      defEquipBV: 7,
      armoredComponentBV: 2,
      offEquipBV: 6,
      physicalWeaponBV: 11,
      explosivePenalty: 1,
      totalExplosivePenalty: 4,
    }),
  ).toMatchObject({
    armorBV: 103,
    structureBV: 75,
    defensiveEquipmentBV: 9,
    offensiveEquipmentBV: 17,
    explosivePenalty: 4,
  });
});

test('mech summary retains the existing RISC modifier before final rounding', () => {
  expect(calculateUnitBV(unit, 'battleaxe-bkx-risc').breakdown).toMatchObject({
    summaryModifier: 1.01,
  });
});
