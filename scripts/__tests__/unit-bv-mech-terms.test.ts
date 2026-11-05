import type { UnitData } from '../validate-bv-types';

import { mechBVTerms } from '../../src/utils/construction/mechBV/bvTrace';
import { calculateUnitBV } from '../validate-bv-calculator';
import { calculatePhysicalBVTotal } from '../validate-bv-physical-weapons';

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

test('mech adapter emits each heat-tracked weapon mount under its Java location', () => {
  const breakdown = calculateUnitBV({
    ...unit,
    equipment: [
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'RIGHT_ARM' },
      { id: 'medium-laser', location: 'RIGHT_ARM' },
      { id: 'ppc', location: 'RIGHT_TORSO' },
    ],
  }).breakdown;
  if (!breakdown) throw new Error('Missing Mech breakdown');
  const weapons = Object.entries(mechBVTerms(breakdown)).filter(([key]) =>
    key.startsWith('weapon.'),
  );
  // Heat efficiency 14 (10 sinks + 6 - 2 running): PPC 10, ML 13, ML 16, so the
  // last two lasers in mount order are halved (HeatTrackingBVCalculator:108-147).
  expect(weapons.map(([key, value]) => [key.split('.')[2], value])).toEqual([
    ['RT', 176],
    ['LA', 46],
    ['LA', 46],
    ['RA', 23],
    ['RA', 23],
  ]);
  expect(weapons.reduce((sum, [, value]) => sum + Number(value), 0)).toBe(
    breakdown.weaponBV,
  );
});

test('mech adapter names the calculator ammo pools like the Java trace', () => {
  const breakdown = calculateUnitBV(unit).breakdown;
  if (!breakdown) throw new Error('Missing Mech breakdown');
  expect(
    mechBVTerms({
      ...breakdown,
      ammoPools: { available: { 'AC:5': 9 }, cap: { 'AC:5': 70, 'MG:2': 5 } },
    }),
  ).toMatchObject({
    'ammo.available.AC:5': 9,
    'ammo.cap.AC:5': 70,
    'ammo.cap.MG:2': 5,
  });
});

test('mech summary retains the existing RISC modifier before final rounding', () => {
  expect(calculateUnitBV(unit, 'battleaxe-bkx-risc').breakdown).toMatchObject({
    summaryModifier: 1.01,
  });
});

test('physical aggregation preserves per-mount rounding, TSM and case-insensitive AES', () => {
  expect(
    calculatePhysicalBVTotal(
      {
        physicalWeapons: [
          { type: 'hatchet', location: 'la' },
          { type: 'sword', location: 'ra' },
        ],
        hasTSM: true,
        aesLocs: ['LA'],
      },
      55,
    ),
  ).toBe(65.4);
});
