import type { UnitData } from '../validate-bv-types';

import {
  getNativeAmmoBVGroup,
  resolveNativeAmmoBin,
} from '../../src/utils/construction/battleValueAmmo';
import { resolveAmmoBV } from '../../src/utils/construction/equipmentBVResolver';
import { mechBVTerms } from '../../src/utils/construction/mechBV/bvTrace';
import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';

const unit: UnitData = {
  id: 'inarc-projection',
  chassis: 'Trace',
  model: 'iNarc',
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
  equipment: [{ id: 'inarc', location: 'LEFT_TORSO' }],
};
const source = (slots: (string | null)[]): UnitData => ({
  ...unit,
  criticalSlots: { LEFT_TORSO: slots },
});

// Pin48fcb2f64 AmmoType.java:10803-10818,10862-10876;
// BVCalculator.java:1147-1154,1189-1212.
test.each(['ISiNarc Pods', 'ISiNarc Explosive Pods'])(
  'projects actual zero from a usable %s bin without inventing an ordinary NARC key',
  (id) => {
    expect(resolveAmmoBV(id)).toMatchObject({ resolved: true, battleValue: 0 });
    expect(resolveNativeAmmoBin(id)).toMatchObject({ shots: 4 });
    expect(getNativeAmmoBVGroup(id)).toBe('INARC:1');
    const b = calculateUnitBV(source([id])).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(b.ammoAvailableProjectionBins).toHaveLength(1);
    expect(b.ammoAvailableProjectionBins?.[0]).toMatchObject({
      id,
      bv: 0,
      location: 'LEFT_TORSO',
    });
    expect(b.ammoPools?.available).toEqual({});
    expect(b.ammoBV).toBe(0);
    expect(mechBVTerms(b)).toMatchObject({ 'ammo.available.INARC:1': 0 });
    expect(Object.hasOwn(mechBVTerms(b), 'ammo.available.NARC:1')).toBe(false);
  },
);

test('preserves ordinary NARC facts and all physical mount order among mixed bins', () => {
  const input: UnitData = {
    ...unit,
    criticalSlots: {
      LEFT_TORSO: [
        'ISiNarc Pods',
        'ISNarc Pods',
        'ISiNarc Explosive Pods (OMNIPOD)|ISiNarc Pods',
      ],
      RIGHT_TORSO: ['ISNarc Pods', 'ISiNarc Pods'],
    },
  };
  const before = JSON.stringify(input),
    scan = scanCrits(input);
  const fact = (id: string, location: string) => ({
    id,
    bv: resolveAmmoBV(id).battleValue,
    weaponType: resolveAmmoBV(id).weaponType,
    location,
  });
  expect(scan.ammoAvailableProjectionBins).toEqual([
    fact('ISiNarc Pods', 'LEFT_TORSO'),
    fact('ISNarc Pods', 'LEFT_TORSO'),
    fact('ISiNarc Explosive Pods', 'LEFT_TORSO'),
    fact('ISiNarc Pods', 'LEFT_TORSO'),
    fact('ISNarc Pods', 'RIGHT_TORSO'),
    fact('ISiNarc Pods', 'RIGHT_TORSO'),
  ]);
  expect(
    scan.ammoAvailableProjectionBins?.filter(
      (f) => getNativeAmmoBVGroup(f.id) === 'NARC:1',
    ),
  ).toEqual([
    fact('ISNarc Pods', 'LEFT_TORSO'),
    fact('ISNarc Pods', 'RIGHT_TORSO'),
  ]);
  expect(scan.ammo).toEqual([]);
  expect(scan.explosive.map((e) => e.location)).toEqual([
    'LT',
    'LT',
    'LT',
    'LT',
    'RT',
    'RT',
  ]);
  const b = calculateUnitBV(input).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(mechBVTerms(b)).toMatchObject({
    'ammo.available.NARC:1': 0,
    'ammo.available.INARC:1': 0,
  });
  expect(JSON.stringify(input)).toBe(before);
});

test.each([
  { slots: [] },
  { slots: ['ISiNarc'] },
  { slots: ['ISiNarcUnknown Pods'] },
  { slots: ['ISiNarc Pods:0'] },
  { slots: ['ISCoolantPod'] },
])(
  'keeps absent, launcher, unresolved, empty and other groups absent: %j',
  ({ slots }) => {
    const b = calculateUnitBV(source(slots)).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(Object.hasOwn(b, 'ammoAvailableProjectionBins')).toBe(false);
    expect(Object.hasOwn(mechBVTerms(b), 'ammo.available.INARC:1')).toBe(false);
  },
);

test('does not infer an intrinsic one-shot bin and rejects a resolved empty bin', () => {
  expect(resolveAmmoBV('ISiNarc Pods:0')).toMatchObject({
    resolved: true,
    battleValue: 0,
  });
  expect(resolveNativeAmmoBin('ISiNarc Pods:0')).toMatchObject({ shots: 0 });
  const b = calculateUnitBV({
    ...source([]),
    equipment: [{ id: 'inarc-os', location: 'LEFT_TORSO' }],
  }).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(Object.hasOwn(b, 'ammoAvailableProjectionBins')).toBe(false);
  expect(Object.hasOwn(mechBVTerms(b), 'ammo.available.INARC:1')).toBe(false);
});

test('preserves existing nonzero availability and cap diagnostics', () => {
  const b = calculateUnitBV({
    ...source(['ISiNarc Pods']),
    equipment: [{ id: 'srt-6', location: 'LEFT_TORSO' }],
  }).breakdown;
  if (!b) throw Error('Missing breakdown');
  const pools = {
    available: { 'INARC:1': 17, 'NARC:1': 9 },
    cap: b.ammoPools?.cap ?? {},
  };
  const before = JSON.stringify(pools);
  expect(mechBVTerms({ ...b, ammoPools: pools })).toMatchObject({
    'ammo.available.INARC:1': 17,
    'ammo.available.NARC:1': 9,
    'ammo.cap.SRM_TORPEDO:6': 59,
  });
  expect(JSON.stringify(pools)).toBe(before);
});
