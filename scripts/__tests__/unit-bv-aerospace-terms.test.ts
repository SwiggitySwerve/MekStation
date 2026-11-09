import type { IAerospaceBVBreakdown } from '../../src/types/unit/BVBreakdownTypes';
import type { IAerospaceBVInput } from '../../src/utils/construction/aerospace/aerospaceBV';

import {
  AerospaceArc as Arc,
  AerospaceSubType,
} from '../../src/types/unit/AerospaceInterfaces';
import { calculateAerospaceBV } from '../../src/utils/construction/aerospace/aerospaceBV';
import { calculateAerospaceAmmoBV } from '../../src/utils/construction/aerospace/aerospaceBVCalculations';
import { aerospaceBVTerms } from '../../src/utils/construction/aerospace/bvTrace';
import { calculateRow } from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

test.each([
  ['fighters/', 1.2],
  ['smallcraft/', 1],
  ['convfighter/', 1.1],
] as const)(
  '%s exposes its separate aircraft type stage',
  (prefix, typeModifier) => {
    const source = fixture.units.find((row) => row.path.startsWith(prefix));
    const row = calculateRow({ ...source, sha256: 'a'.repeat(64) });
    expect(row.reason).toBeUndefined();
    expect(row.figure?.terms).toMatchObject({
      typeModifier,
      weightBV: 0,
      offensiveTypeModifier: 1,
      summaryModifier: 1,
      adjustment: 0,
    });
  },
);

const aircraft = (overrides: Partial<IAerospaceBVInput> = {}) =>
  calculateAerospaceBV({
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    tonnage: 50,
    structuralIntegrity: 5,
    safeThrust: 5,
    maxThrust: 8,
    totalArmorPoints: 100,
    armorType: 'standard',
    equipment: [],
    ...overrides,
  });
const weapons = (value: IAerospaceBVBreakdown) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => key.startsWith('weapon.')),
  );

// MegaMek 48fcb2f64, AeroBVCalculator:147-155, HeatTrackingBVCalculator:108-126;
// accepted P1 reference 4e19c56b: Dragonstar Assault Transport (3060).
test('projects native small-craft mounts after direction and heat through the real CLI', () => {
  const source = fixture.units.find((row) =>
    row.path.startsWith('smallcraft/'),
  );
  const row = calculateRow({ ...source, sha256: 'a'.repeat(64) });
  expect(row.reason).toBeUndefined();
  expect(
    Object.entries(row.figure?.terms ?? {})
      .filter(([key]) => key.startsWith('weapon.'))
      .map(([key, value]) => [key.split('.')[2], value]),
  ).toEqual([
    ['NOS', 119],
    ['NOS', 62],
    ['LS', 48],
    ['RS', 48],
    ['AFT', 31],
    ['AFT', 15.5],
  ]);
  expect(row.figure).toMatchObject({
    total: 1175,
    offensive: 443.19500000000005,
  });
});

test.each([
  AerospaceSubType.AEROSPACE_FIGHTER,
  AerospaceSubType.CONVENTIONAL_FIGHTER,
])(
  '%s keeps physical locations for rear mounts and repeated weapons',
  (subType) => {
    const result = aircraft({
      subType,
      equipment: [
        { id: 'medium-laser', location: Arc.NOSE },
        { id: 'medium-laser', location: Arc.LEFT_WING, isRearMounted: true },
        { id: 'medium-laser', location: Arc.LEFT_WING, isRearMounted: true },
      ],
    });
    expect(
      Object.entries(weapons(result)).map(([key, value]) => [
        key.split('.')[2],
        value,
      ]),
    ).toEqual([
      ['NOS', 23],
      ['LWG', 46],
      ['LWG', 46],
    ]);
    expect(result.weaponFirePoolBV).toBe(115);
  },
);

test('retains TC and capacitor modifiers without applying speed to mounts', () => {
  const result = aircraft({
    equipment: [
      { id: 'ppc', location: Arc.NOSE },
      { id: 'ppc-capacitor', location: Arc.NOSE },
      { id: 'istargeting-computer', location: Arc.FUSELAGE },
    ],
  });
  expect(Object.values(weapons(result))).toEqual([330]);
  expect(result.weaponFirePoolBV).toBe(330);
});

test.each([
  [AerospaceSubType.AEROSPACE_FIGHTER, 'FSLG'],
  [AerospaceSubType.SMALL_CRAFT, 'HULL'],
] as const)(
  '%s preserves its native internal-location abbreviation',
  (subType, abbreviation) => {
    const result = aircraft({
      subType,
      equipment: [{ id: 'medium-laser', location: Arc.FUSELAGE }],
    });
    expect(
      Object.entries(weapons(result)).map(([key, value]) => [
        key.split('.')[2],
        value,
      ]),
    ).toEqual([[abbreviation, 46]]);
  },
);

test.each([
  [false, AerospaceSubType.AEROSPACE_FIGHTER, [46, 46, 23]],
  [false, AerospaceSubType.CONVENTIONAL_FIGHTER, [46, 46, 46]],
  [
    true,
    AerospaceSubType.AEROSPACE_FIGHTER,
    Array(3).fill(expect.closeTo(36.8, 12)),
  ],
] as const)(
  'support=%s %s preserves the heat cutoff and FCS guards',
  (isSupportVehicle, subType, expected) => {
    const result = aircraft({
      isSupportVehicle,
      subType,
      heatCapacity: 0,
      equipment: [
        { id: 'medium-laser', location: Arc.NOSE },
        { id: 'medium-laser', location: Arc.NOSE },
        { id: 'medium-laser', location: Arc.NOSE },
      ],
    });
    expect(Object.values(weapons(result))).toEqual(expected);
  },
);

test('does not invent weapons from ammo, unresolved, defensive or invalid-location mounts', () => {
  const result = aircraft({
    ammo: [],
    equipment: [
      { id: 'is-ammo-lrm-10', location: Arc.NOSE },
      { id: 'missing-a1-weapon', location: Arc.NOSE },
      { id: 'anti-missile-system', location: Arc.NOSE },
      { id: 'medium-laser', location: 'unknown-a1-location' },
    ],
  });
  expect(weapons(result)).toEqual({});
  expect(weapons(aircraft())).toEqual({});
});

test('legacy breakdowns without owner facts retain their exact trace', () => {
  const result = aircraft();
  expect(aerospaceBVTerms(result)).toEqual(result);
});

// BVCalculator.java:1189-1242 (48fcb2f64): uncapped bins and raw weapon caps
// are independent diagnostics, before direction, heat, FCS and speed.
const ammoTerms = (value: IAerospaceBVBreakdown) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => key.startsWith('ammo.')),
  );
const srm = { id: 'srm-2', location: Arc.AFT };
const bin = (bv: number) => ({ id: 'is-ammo-srm-2', weaponType: 'srm-2', bv });

test('retains repeated native bins and raw caps independently of heat and direction', () => {
  const result = aircraft({
    equipment: [srm, srm],
    ammo: [bin(3), bin(7)],
    heatCapacity: 0,
  });
  expect(ammoTerms(result)).toEqual({
    'ammo.available.SRM:2': 10,
    'ammo.cap.SRM:2': 42,
  });
  expect(result.ammoBV).toBe(10);
});

test('availability stays uncapped when actual bins exceed the raw weapon cap', () => {
  const result = aircraft({ equipment: [srm], ammo: [bin(100)] });
  expect(ammoTerms(result)).toEqual({
    'ammo.available.SRM:2': 100,
    'ammo.cap.SRM:2': 21,
  });
  expect(result.ammoBV).toBe(21);
});

test('unmatched bins retain availability without inventing a zero cap', () => {
  const result = aircraft({ ammo: [bin(7)] });
  expect(ammoTerms(result)).toEqual({ 'ammo.available.SRM:2': 7 });
  expect(result.ammoBV).toBe(0);
});

test('an explicit empty ammo list retains real weapon caps without inventing bins', () => {
  const result = aircraft({ equipment: [srm], ammo: [] });
  expect(ammoTerms(result)).toEqual({ 'ammo.cap.SRM:2': 21 });
  expect(result.ammoBV).toBe(0);
});

test('support FCS scales the ammo total while raw diagnostic pools stay unscaled', () => {
  const result = aircraft({
    equipment: [srm],
    ammo: [bin(10)],
    isSupportVehicle: true,
  });
  expect(ammoTerms(result)).toEqual({
    'ammo.available.SRM:2': 10,
    'ammo.cap.SRM:2': 21,
  });
  expect(result.ammoBV).toBe(8);
});

test('legacy omission and unresolved identities do not invent native ammo terms', () => {
  expect(ammoTerms(aircraft({ equipment: [srm] }))).toEqual({});
  expect(
    ammoTerms(
      aircraft({
        ammo: [
          { id: 'unknown-a2-ammo', weaponType: 'unknown-a2-weapon', bv: 7 },
        ],
      }),
    ),
  ).toEqual({});
  expect(calculateAerospaceAmmoBV([srm], [])).toBe(0);
  expect(calculateAerospaceAmmoBV([srm], [bin(100)], true)).toBe(21);
});

test('defensive launcher caps remain raw facts outside offensive ammo arithmetic', () => {
  const result = aircraft({
    equipment: [
      { id: 'anti-missile-system', location: Arc.NOSE },
      { id: 'anti-missile-system', location: Arc.AFT },
    ],
    ammo: [{ id: 'ams-ammo', weaponType: 'ams', bv: 11 }],
  });
  expect(ammoTerms(result)).toEqual({ 'ammo.cap.AMS:2': 64 });
  expect(result.ammoBV).toBe(0);
});

test('known supplemental identities retain actual zero bins and primitive raw caps', () => {
  const result = aircraft({
    equipment: [{ id: 'ac-10p', location: Arc.NOSE }],
    ammo: [
      { id: 'coolant-pod-registry', weaponType: 'Coolant Pod', bv: 0 },
      {
        id: 'ac-10-primitive-ammo',
        weaponType: 'AC/10 Primitive Ammo',
        bv: 15,
      },
    ],
  });
  expect(ammoTerms(result)).toEqual({
    'ammo.available.COOLANT_POD:1': 0,
    'ammo.available.AC_PRIMITIVE:10': 15,
    'ammo.cap.AC_PRIMITIVE:10': 123,
  });
});

test('intrinsic one-shot launchers do not invent an excessive-ammo cap', () => {
  expect(
    ammoTerms(
      aircraft({
        equipment: [
          { id: 'srm-2-os', location: Arc.NOSE },
          { id: 'issrm4ios', location: Arc.NOSE },
          { id: 'issrm6os', location: Arc.NOSE },
        ],
        ammo: [],
      }),
    ),
  ).toEqual({});
});

test('catalog-backed usable zero bins survive native miscellaneous classification', () => {
  const equipment = [
    { id: 'coolant-pod:omni', location: Arc.FUSELAGE },
    { id: 'coolant-pod', location: Arc.FUSELAGE },
    { id: 'coolant-pod:0', location: Arc.FUSELAGE },
  ];
  expect(ammoTerms(aircraft({ equipment, ammo: [] }))).toEqual({
    'ammo.available.COOLANT_POD:1': 0,
  });
  expect(
    ammoTerms(aircraft({ equipment: equipment.slice(2), ammo: [] })),
  ).toEqual({});
  expect(ammoTerms(aircraft({ equipment }))).toEqual({});
});
