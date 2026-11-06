import type { UnitData } from '../validate-bv-types';

import { mechBVTerms } from '../../src/utils/construction/mechBV/bvTrace';
import { buildMechBVWeapons } from '../../src/utils/construction/mechBV/weaponInputs';
import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';

const unit: UnitData = {
  id: 'torpedo-projection',
  chassis: 'Trace',
  model: 'Torpedo',
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

const source = (ids: string[]): UnitData => ({
  ...unit,
  equipment: ids.map((id) => ({ id, location: 'LEFT_TORSO' })),
});

// Pin48fcb2f64, ISSRT6.java:60-68 (59BV) and BVCalculator.java:1225-1238.
test('projects Javelin two-launcher cap without changing its compatibility pool', () => {
  const input = {
    ...source(['srt-6', 'srt-6']),
    criticalSlots: {
      LEFT_TORSO: ['IS Ammo SRTorpedo-6', 'IS Ammo SRTorpedo-6'],
    },
  };
  const before = JSON.stringify(input);
  const result = calculateUnitBV(input),
    b = result.breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(b.ammoPools).toEqual({
    available: { 'SRM_TORPEDO:6': 14 },
    cap: { 'SRM:6': 118 },
  });
  expect(b.ammoBV).toBe(14);
  expect(b).toHaveProperty('ammoCapProjectionWeapons', [
    { id: 'srt-6', bv: 59 },
    { id: 'srt-6', bv: 59 },
  ]);
  expect(mechBVTerms(b)).toMatchObject({
    'ammo.cap.SRM_TORPEDO:6': 118,
    'ammo.available.SRM_TORPEDO:6': 14,
  });
  expect(Object.hasOwn(mechBVTerms(b), 'ammo.cap.SRM:6')).toBe(false);
  expect(JSON.stringify(input)).toBe(before);
});

test('keeps mixed missile and torpedo diagnostics separate without altering cap arithmetic', () => {
  const input = source(['srm-6', 'srt-6']);
  const b = calculateUnitBV(input).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(b.ammoPools?.cap).toEqual({ 'SRM:6': 118 });
  expect(mechBVTerms(b)).toMatchObject({
    'ammo.cap.SRM:6': 59,
    'ammo.cap.SRM_TORPEDO:6': 59,
  });
  const ordinary = calculateUnitBV(source(['srm-6', 'srm-6']));
  expect(calculateUnitBV(input).calculatedBV).toBe(ordinary.calculatedBV);
});

test('retains quantity expansion and mount order in the pre-modifier snapshot', () => {
  const input = source(['2-srt-6', 'lrm-5', 'lrt-5']);
  const built = buildMechBVWeapons(input, scanCrits(input), []);
  expect(built.ammoCapWeapons).toEqual([
    { id: 'srm-6', bv: 59 },
    { id: 'srm-6', bv: 59 },
    { id: 'lrm-5', bv: 45 },
    { id: 'lrm-5', bv: 45 },
  ]);
  expect(built).toHaveProperty('ammoCapProjectionWeapons', [
    { id: 'srt-6', bv: 59 },
    { id: 'srt-6', bv: 59 },
    { id: 'lrm-5', bv: 45 },
    { id: 'lrt-5', bv: 45 },
  ]);
});

test('captures listed values before existing drone modifiers without mutating the source', () => {
  const input = source(['srt-6']);
  const built = buildMechBVWeapons(
    input,
    { ...scanCrits(input), detectedDroneOS: true },
    [],
  );
  expect(built.weapons[0].bv).toBe(47.2);
  expect(built.ammoCapWeapons).toEqual([{ id: 'srm-6', bv: 59 }]);
  expect(built).toHaveProperty('ammoCapProjectionWeapons', [
    { id: 'srt-6', bv: 59 },
  ]);
});

test.each(['srt-6-os', 'srt-6-ios'])(
  'retains the existing one-shot cap exclusion for %s',
  (oneShot) => {
    const b = calculateUnitBV(source([oneShot, 'srt-6'])).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(b).toHaveProperty('ammoCapProjectionWeapons', [
      { id: 'srt-6', bv: 59 },
    ]);
    expect(mechBVTerms(b)).toMatchObject({ 'ammo.cap.SRM_TORPEDO:6': 59 });
  },
);

test('preserves absence and unsupported identities without synthesizing zero caps', () => {
  for (const ids of [
    [],
    ['srm-6'],
    ['srt-6-os'],
    ['srt-999'],
    ['unresolved-torpedo'],
  ]) {
    const b = calculateUnitBV(source(ids)).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(Object.hasOwn(b, 'ammoCapProjectionWeapons')).toBe(false);
    expect(
      Object.keys(mechBVTerms(b)).some((k) => k.includes('_TORPEDO:')),
    ).toBe(false);
  }
});
