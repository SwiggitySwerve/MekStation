import type { UnitData } from '../validate-bv-types';

import { resolveNativeAmmoBin } from '../../src/utils/construction/battleValueAmmo';
import { resolveAmmoBV } from '../../src/utils/construction/equipmentBVResolver';
import { mechBVTerms } from '../../src/utils/construction/mechBV/bvTrace';
import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';

const unit: UnitData = {
  id: 'narc-projection',
  chassis: 'Trace',
  model: 'Narc',
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
  equipment: [{ id: 'narc', location: 'LEFT_TORSO' }],
};
const source = (slots: (string | null)[]): UnitData => ({
  ...unit,
  criticalSlots: { LEFT_TORSO: slots },
});

// Pin48fcb2f64 AmmoType.java:10711-10729; BVCalculator.java:1147-1154,1189-1212.
test('projects a real zero-valued available bin without changing arithmetic pools', () => {
  expect(resolveAmmoBV('ISNarc Pods')).toMatchObject({
    resolved: true,
    battleValue: 0,
  });
  expect(resolveNativeAmmoBin('ISNarc Pods')).toEqual({
    ammoId: 'narc-pods',
    shots: 6,
  });
  const input = source(['ISNarc Pods']);
  const b = calculateUnitBV(input).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(b).toHaveProperty('ammoAvailableProjectionBins', [
    {
      id: 'ISNarc Pods',
      bv: 0,
      weaponType: 'narc-pods',
      location: 'LEFT_TORSO',
    },
  ]);
  expect(b.ammoPools?.available).toEqual({});
  expect(b.ammoBV).toBe(0);
  expect(mechBVTerms(b)).toMatchObject({ 'ammo.available.NARC:1': 0 });
});

test('preserves physical-bin multiplicity, cleaning, location and source order', () => {
  const input: UnitData = {
    ...source([
      'ISNarcBeacon',
      'ISNarc Pods (OMNIPOD)',
      'ISNarc Pods|ISNarc Pods',
    ]),
    criticalSlots: {
      LEFT_TORSO: [
        'ISNarcBeacon',
        'ISNarc Pods (OMNIPOD)',
        'ISNarc Pods|ISNarc Pods',
      ],
      RIGHT_TORSO: ['ISNarc Pods'],
    },
  };
  const before = JSON.stringify(input),
    scan = scanCrits(input);
  const fact = (location: string) => ({
    id: 'ISNarc Pods',
    bv: 0,
    weaponType: 'narc-pods',
    location,
  });
  expect(scan).toHaveProperty('ammoAvailableProjectionBins', [
    fact('LEFT_TORSO'),
    fact('LEFT_TORSO'),
    fact('LEFT_TORSO'),
    fact('RIGHT_TORSO'),
  ]);
  expect(scan.ammo).toEqual([]);
  expect(scan.explosive).toEqual([
    { location: 'LT', slots: 1, penaltyCategory: 'standard' },
    { location: 'LT', slots: 1, penaltyCategory: 'standard' },
    { location: 'LT', slots: 1, penaltyCategory: 'standard' },
    { location: 'RT', slots: 1, penaltyCategory: 'standard' },
  ]);
  calculateUnitBV(input);
  expect(JSON.stringify(input)).toBe(before);
});

test.each([
  { slots: [] },
  { slots: ['ISNarcBeacon'] },
  { slots: ['ISNarcUnknown Pods'] },
  { slots: ['ISNarc Pods:0'] },
  { slots: ['ISiNarc Pods'] },
  { slots: ['ISCoolantPod'] },
])(
  'does not invent a zero from absent, launcher, unresolved, empty or excluded facts: %j',
  ({ slots }) => {
    const input = source(slots),
      scan = scanCrits(input),
      b = calculateUnitBV(input).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(Object.hasOwn(scan, 'ammoAvailableProjectionBins')).toBe(false);
    expect(Object.hasOwn(b, 'ammoAvailableProjectionBins')).toBe(false);
    expect(Object.hasOwn(mechBVTerms(b), 'ammo.available.NARC:1')).toBe(false);
  },
);

test('does not infer intrinsic one-shot ammo without a physical source bin', () => {
  const input = {
    ...source([]),
    equipment: [{ id: 'narc-os', location: 'LEFT_TORSO' }],
  };
  const b = calculateUnitBV(input).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(Object.hasOwn(b, 'ammoAvailableProjectionBins')).toBe(false);
  expect(Object.hasOwn(mechBVTerms(b), 'ammo.available.NARC:1')).toBe(false);
});

test('distinguishes a resolved but empty physical bin from a usable zero-BV bin', () => {
  expect(resolveAmmoBV('ISNarc Pods:0')).toMatchObject({
    resolved: true,
    battleValue: 0,
  });
  expect(resolveNativeAmmoBin('ISNarc Pods:0')).toEqual({
    ammoId: 'narc-pods',
    shots: 0,
  });
  expect(
    Object.hasOwn(
      scanCrits(source(['ISNarc Pods:0'])),
      'ammoAvailableProjectionBins',
    ),
  ).toBe(false);
});

test('adds genuine bin values without overriding an existing nonzero available group', () => {
  const b = calculateUnitBV(source(['ISNarc Pods'])).breakdown;
  if (!b) throw Error('Missing breakdown');
  const pools = {
    available: { 'NARC:1': 17, 'AC:5': 9 },
    cap: { 'NARC:1': 30 },
  };
  const before = JSON.stringify(pools);
  expect(mechBVTerms({ ...b, ammoPools: pools })).toMatchObject({
    'ammo.available.NARC:1': 17,
    'ammo.available.AC:5': 9,
    'ammo.cap.NARC:1': 30,
  });
  expect(JSON.stringify(pools)).toBe(before);
});

test('retains the torpedo diagnostic snapshot alongside NARC source bins', () => {
  const b = calculateUnitBV({
    ...source(['ISNarc Pods']),
    equipment: [{ id: 'srt-6', location: 'LEFT_TORSO' }],
  }).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(b.ammoPools).toEqual({ available: {}, cap: { 'SRM:6': 59 } });
  expect(mechBVTerms(b)).toMatchObject({
    'ammo.available.NARC:1': 0,
    'ammo.cap.SRM_TORPEDO:6': 59,
  });
});
