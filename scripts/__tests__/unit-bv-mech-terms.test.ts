import type { UnitData } from '../validate-bv-types';

import { projectMechAmmoBVPools } from '../../src/utils/construction/battleValueAmmo';
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

test('omits the inherently one-shot VGL cap', () => {
  const b = calculateUnitBV({
    ...unit,
    equipment: [{ id: 'vehicular-grenade-launcher', location: 'LEFT_TORSO' }],
  }).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(b.ammoPools?.cap).toEqual({});
  expect(mechBVTerms(b)).not.toHaveProperty(['ammo.cap.VGL:1']);
  expect(b.ammoBV).toBe(0);
});

test('primitive AC ammunition emits only its native cap identity', () => {
  const b = calculateUnitBV({
    ...unit,
    equipment: [{ id: 'ac-10p', location: 'LEFT_TORSO' }],
    criticalSlots: { LEFT_TORSO: ['IS Ammo AC/10 Primitive'] },
  }).breakdown;
  if (!b) throw Error('Missing breakdown');
  const terms = mechBVTerms(b);
  expect(terms).toHaveProperty(['ammo.available.AC_PRIMITIVE:10'], 12);
  expect(terms).toHaveProperty(['ammo.cap.AC_PRIMITIVE:10'], 123);
  expect(terms).not.toHaveProperty(['ammo.cap.AC:10']);
  expect(b.ammoBV).toBe(12);
});

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

// Pinned 48fcb2f64 BVCalculator.java:1189-1242: assembleAmmo also retains
// defensive launcher caps and genuine zero-valued usable coolant-pod bins.
test.each([
  ['anti-missile-system', ['ISAntiMissileSystem'], 'AMS:2', 32],
  ['risc-advanced-point-defense-system', ['ISAPDS', 'ISAPDS'], 'APDS:2', 64],
  ['fluid-gun', ['ISFluidGun'], 'FLUID_GUN:1', 6],
  ['improved-gauss-rifle', [], 'GAUSS_IMP:0', 320],
  ['improved-autocannon-5', [], 'AC_IMP:5', 70],
  ['ac-10p', [], 'AC_PRIMITIVE:10', 123],
] as const)(
  'projects listed raw %s cap without an ammo bin',
  (id, slots, group, bv) => {
    const input: UnitData = {
      ...unit,
      equipment: [{ id, location: 'LEFT_TORSO' }],
      criticalSlots: { LEFT_TORSO: [...slots] },
    };
    const source = JSON.stringify(input);
    const b = calculateUnitBV(input).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(mechBVTerms(b)).toHaveProperty([`ammo.cap.${group}`], bv);
    expect(JSON.stringify(input)).toBe(source);
    expect(b.ammoBV).toBe(0);
  },
);

test.each([
  ['Coolant Pod', 'COOLANT_POD:1', 0],
  ['Coolant Pod (ARMORED)', 'COOLANT_POD:1', 0],
  ['ISFluidGun Ammo', 'FLUID_GUN:1', 1],
  ['CLImpGaussAmmo', 'GAUSS_IMP:0', 40],
  ['CLIMPAmmoAC5', 'AC_IMP:5', 9],
] as const)(
  'projects actual physical %s availability without a launcher',
  (id, group, bv) => {
    const b = calculateUnitBV({
      ...unit,
      criticalSlots: { LEFT_TORSO: [id, `${id} (OMNIPOD)`] },
    }).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(mechBVTerms(b)).toHaveProperty([`ammo.available.${group}`], bv * 2);
    expect(mechBVTerms(b)).not.toHaveProperty([`ammo.cap.${group}`]);
  },
);

test.each([
  [
    'anti-missile-system',
    ['ISAntiMissileSystem', 'ISAMS Ammo'],
    'AMS:2',
    32,
    11,
  ],
  [
    'risc-advanced-point-defense-system',
    ['ISAPDS', 'ISAPDS', 'ISAPDS Ammo'],
    'APDS:2',
    64,
    22,
  ],
] as const)(
  'keeps %s defensive arithmetic separate from raw caps',
  (id, slots, group, cap, ammo) => {
    const b = calculateUnitBV({
      ...unit,
      equipment: [{ id, location: 'LEFT_TORSO' }],
      criticalSlots: { LEFT_TORSO: [...slots] },
    }).breakdown;
    if (!b) throw Error('Missing breakdown');
    expect(b).toMatchObject({
      defEquipBV: cap + ammo,
      amsAmmoBV: ammo,
      ammoBV: 0,
    });
    expect(b.ammoPools?.cap).toEqual({});
    expect(mechBVTerms(b)).toHaveProperty([`ammo.cap.${group}`], cap);
  },
);

test('retains raw quantity expansion and distinct improved and ordinary groups', () => {
  const b = calculateUnitBV({
    ...unit,
    equipment: [
      { id: '2-improved-autocannon-5', location: 'LEFT_TORSO' },
      { id: 'ac-5', location: 'RIGHT_TORSO' },
    ],
  }).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(mechBVTerms(b)).toMatchObject({
    'ammo.cap.AC_IMP:5': 140,
    'ammo.cap.AC:5': 70,
  });
  expect(b.ammoPools?.cap).toEqual({ 'AC:5': 70 });
});

test('does not invent supplemental facts for absent, empty or unresolved bins', () => {
  const b = calculateUnitBV({
    ...unit,
    criticalSlots: { LEFT_TORSO: [null, 'Unknown Ammo', 'Coolant Pod:0'] },
  }).breakdown;
  if (!b) throw Error('Missing breakdown');
  expect(b.ammoDiagnosticPools).toBeUndefined();
  expect(
    Object.keys(mechBVTerms(b)).filter((key) => key.startsWith('ammo.')),
  ).toEqual([]);
});

test('supplemental grouping preserves existing pool values and caller objects', () => {
  const pools = { available: { 'FLUID_GUN:1': 7 }, cap: { 'AMS:2': 9 } };
  const before = JSON.stringify(pools);
  const projected = projectMechAmmoBVPools(pools, undefined, undefined, {
    weapons: [{ id: 'ams', bv: 32 }],
    bins: [{ id: 'ISFluidGun Ammo', bv: 1 }],
  });
  expect(projected).toEqual(pools);
  expect(JSON.stringify(pools)).toBe(before);
});
