import { gameUnitSchema } from '../../src/lib/events/replay/CombatLifecycleSharedSchemas';
import personnel from '../../src/services/units/handlers/__tests__/fixtures/personnel-validity.json';
import { INFANTRY_BV_TRACE_FIELDS } from '../../src/types/unit/BVBreakdownTypes';
import { baseInput } from '../../src/utils/construction/infantry/__tests__/infantryBV.test.helpers';
import { calculateInfantryBV } from '../../src/utils/construction/infantry/infantryBV';
import { aggregateDelta } from '../unit-bv-parity';
import { calculateRow } from '../vehicle-aero-bv-delta';

test('infantry exposes pre-movement structure and specialization stages', () => {
  const breakdown = calculateInfantryBV(baseInput());
  expect(breakdown).toMatchObject({
    structureBV: 42,
    defensiveFactor: 1,
    summaryModifier: 1,
  });
  expect(breakdown).not.toHaveProperty('weaponBV');
  expect(
    Object.keys(breakdown).filter((key) => key.startsWith('infantry.')),
  ).toEqual([]);
});

// MegaMek 48fcb2f64 InfantryBVCalculator.java:128-157, 233-237;
// java_bv_terms.py finishInfantryWeapons retains the native subtraction order.
test.each([
  [
    'Clan Anti-Infantry Clan Jade Falcon Police.blk',
    3.5999999999999996,
    1.04,
    0,
    0,
  ],
  ['Clan Foot Point (Laser Marine).blk', 35.75, undefined, 35.75, 0],
  [
    'Mob (Huge).blk',
    2.16,
    0.6000000000000001,
    2.7600000000000002,
    -8.881784197001252e-16,
  ],
  [
    'Field Gun Platoon (AFFS) (Motorized AC10 3067+).blk',
    29.96,
    undefined,
    0,
    2.842170943040401e-14,
  ],
  ['Beast Infantry (Hipposaur)(Auto-Rifle_Auto-Cannon).blk', 0, 18.8, 0, 0],
] as const)(
  'projects exact native infantry stages: %s',
  (file, primary, secondary, antiMek, remainder) => {
    const source = personnel.rows.find(
      (row) =>
        row.path.startsWith('infantry/') && row.path.endsWith('/' + file),
    );
    if (!source) throw new Error('Missing pinned infantry source: ' + file);
    const row = calculateRow({
      ...source,
      unit: null,
      sourceText: source.content,
    });
    expect(row.reason).toBeUndefined();
    const terms = row.figure?.terms;
    expect(terms).toMatchObject({
      'infantry.primaryWeaponBV': primary,
      'infantry.antiMekWeaponBV': antiMek,
      'infantry.weaponRemainderBV': remainder,
    });
    if (secondary === undefined)
      expect(terms).not.toHaveProperty(['infantry.secondaryWeaponBV']);
    else expect(terms?.['infantry.secondaryWeaponBV']).toBe(secondary);
  },
);

test('native anti-Mek excludes archaic weapons and keeps prosthetic bonuses in the remainder', () => {
  const input = baseInput({
    totalTroopers: 10,
    primaryWeapon: { id: 'Blade (Dagger/Knife/Bayonet)', damageDivisor: 1 },
    secondaryWeapon: { id: 'Auto-Pistol', damageDivisor: 1 },
    sourceOffense: {
      secondaryShooters: 5,
      mp: 1,
      antiMek: true,
      augmentations: [],
      prostheticAntiMek: true,
    },
  });
  const before = JSON.stringify(input);
  const b = calculateInfantryBV(input);
  expect(b).toMatchObject({
    'infantry.primaryWeaponBV': 0.1,
    'infantry.secondaryWeaponBV': 0.95,
    'infantry.antiMekWeaponBV': 0.95,
    'infantry.weaponRemainderBV': 0.18999999999999995,
  });
  expect(JSON.stringify(input)).toBe(before);
});

test('a represented zero secondary remains distinct from an absent secondary', () => {
  const b = calculateInfantryBV(
    baseInput({
      primaryWeapon: { id: 'Auto-Pistol', damageDivisor: 1 },
      secondaryWeapon: { id: 'Auto-Pistol', damageDivisor: 1 },
      sourceOffense: {
        secondaryShooters: 0,
        mp: 1,
        antiMek: false,
        augmentations: [],
        prostheticAntiMek: false,
      },
    }),
  );
  expect(b).toHaveProperty(['infantry.secondaryWeaponBV'], 0);
});

test.each([
  'infantry.primaryWeaponBV',
  'infantry.secondaryWeaponBV',
  'infantry.antiMekWeaponBV',
  'infantry.weaponRemainderBV',
])('strict replay validates optional finite diagnostic %s', (key) => {
  const schema = gameUnitSchema.shape.infantryInit
    .unwrap()
    .shape.bvBreakdown.unwrap();
  const legacy = calculateInfantryBV(baseInput());
  expect(schema.safeParse({ ...legacy, [key]: 0 }).success).toBe(true);
  expect(schema.safeParse({ ...legacy, [key]: NaN }).success).toBe(false);
  expect(schema.safeParse({ ...legacy, [key]: Infinity }).success).toBe(false);
});

test('strict replay accepts optional trace fields and old payloads but rejects invalid diagnostics', () => {
  const schema = gameUnitSchema.shape.infantryInit
    .unwrap()
    .shape.bvBreakdown.unwrap();
  const breakdown = calculateInfantryBV(baseInput());
  expect(schema.safeParse(breakdown).success).toBe(true);
  expect(schema.safeParse({ ...breakdown, structureBV: NaN }).success).toBe(
    false,
  );
  expect(schema.safeParse({ ...breakdown, unknownTraceField: 1 }).success).toBe(
    false,
  );
  const legacy = { ...breakdown };
  for (const field of INFANTRY_BV_TRACE_FIELDS) delete legacy[field];
  expect(schema.safeParse(legacy).success).toBe(true);
});

test.each(
  personnel.rows.filter((row) => row.path.startsWith('infantry/') && row.valid),
)(
  'source infantry trace reconstructs offense before speed: $path',
  (source) => {
    const row = calculateRow({
      ...source,
      unit: null,
      sourceText: source.content,
    });
    expect(row.reason).toBeUndefined();
    const { weaponBV, ammoBV, speedFactor } = row.figure?.terms ?? {};
    if (
      typeof weaponBV !== 'number' ||
      typeof ammoBV !== 'number' ||
      typeof speedFactor !== 'number' ||
      row.figure?.offensive === undefined
    )
      throw new Error('Missing infantry offensive stages');
    expect(
      aggregateDelta(row.figure.offensive, (weaponBV + ammoBV) * speedFactor)
        .withinTolerance,
    ).toBe(true);
  },
);
