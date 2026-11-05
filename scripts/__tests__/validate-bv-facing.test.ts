import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../validate-bv-calculator';
import {
  applyWeaponPostScanModifiers,
  type WeaponEntry,
} from '../validate-bv-calculator-weapons';
import { createEmptyCritScan } from '../validate-bv-crit-scan-types';

const unit: UnitData = {
  id: 'facing',
  chassis: 'Test',
  model: 'Facing',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'DOUBLE', count: 20 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};
const mount = (
  bv: number,
  rear = false,
  extra: Partial<WeaponEntry> = {},
): WeaponEntry => ({
  id: 'test-weapon',
  name: 'test-weapon',
  heat: 1,
  bv,
  rear,
  location: 'LEFT_TORSO',
  ...extra,
});
const orient = (weapons: WeaponEntry[], tc = false) => {
  applyWeaponPostScanModifiers(unit, createEmptyCritScan(), weapons, tc);
  return weapons.map((w) => w.rear);
};

// MegaMek 48fcb2f64 BVCalculator.java:690-699,764-765 compares before rear weighting.
it('compares both sides at full BV before choosing which side to halve', () => {
  expect(orient([mount(90), mount(46, true), mount(46, true)])).toEqual([
    true,
    false,
    false,
  ]);
});

it('includes Artemis in the side comparison', () => {
  expect(
    orient([
      mount(90, false, { artemisType: 'iv' }),
      mount(46, true),
      mount(46, true),
    ]),
  ).toEqual([false, true, true]);
});

it('uses mounted direct-fire eligibility for TC in the comparison', () => {
  expect(
    orient([mount(46, false, { isDirectFire: true }), mount(90, true)], true),
  ).toEqual([true, false]);
});

it('keeps the original direction when both sides tie', () => {
  expect(orient([mount(46), mount(46, true)])).toEqual([false, true]);
});

it('excludes arms and Mek turrets from comparison and reversal', () => {
  expect(
    orient([
      mount(90),
      mount(46, true),
      mount(46, true),
      mount(1000, false, { location: 'LEFT_ARM' }),
      mount(1000, false, { isTurret: true }),
    ]),
  ).toEqual([true, false, false, false, false]);
});

it('matches Grand Dragon DRG-5K weapon staging through the shared owner', () => {
  const b = calculateUnitBV({
    ...unit,
    equipment: [
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'er-ppc', location: 'RIGHT_ARM' },
      { id: 'medium-laser', location: 'LEFT_TORSO_(R)' },
      { id: 'medium-laser', location: 'RIGHT_TORSO_(R)' },
      { id: 'lrm-10', location: 'CENTER_TORSO' },
    ],
  }).breakdown;
  // Full rear lasers92, halved front LRM45, arm laser46 and ER PPC229.
  expect(b?.weaponBV).toBe(412);
});
