import type { VehicleBVInput } from '../../src/utils/construction/vehicle/vehicleBVTypes';

import prime from '../../public/data/units/vehicles/Boreas Cavalry Hovercraft (Prime).json';
import boreas from '../../public/data/units/vehicles/Boreas Cavalry Hovercraft A.json';
import monocycle from '../../public/data/units/vehicles/Monocycle.json';
import { GroundMotionType } from '../../src/types/unit/BaseUnitInterfaces';
import { vehicleBVTerms } from '../../src/utils/construction/vehicle/bvTrace';
import { calculateVehicleBV } from '../../src/utils/construction/vehicle/vehicleBVCalculator';
import { calculateRow } from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

// Pinned 48fcb2f64 loaded-entity reference: positive clips carry zero generic BV.
test.each([
  {
    source: boreas,
    path: 'vehicles/AToW Companion/Hover/Boreas Cavalry Hovercraft A.blk',
    bv: 30,
  },
  {
    source: prime,
    path: 'vehicles/AToW Companion/Hover/Boreas Cavalry Hovercraft Prime.blk',
    bv: 78,
  },
  {
    source: monocycle,
    path: 'vehicles/TRO Irregulars/Smalls/Monocycle.blk',
    bv: 81,
  },
])(
  'per-term adapter preserves $source.id BV and exposes its implicit ammo',
  ({ source, path, bv }) => {
    const row = calculateRow(
      { unit: source, path, sha256: 'a'.repeat(64) },
      true,
    );
    expect(row.reason).toBeUndefined();
    expect(row.figure?.total).toBe(bv);
    expect(row.figure?.terms?.['ammo.available.INFANTRY:0']).toBe(0);
    expect(row.figure?.terms).not.toHaveProperty(['ammo.cap.INFANTRY:0']);
  },
);

test('vehicle adapter exposes type, penalty and weight without folding them into TMM', () => {
  const source = fixture.units[0];
  const row = calculateRow({ ...source, sha256: 'a'.repeat(64) });
  expect(row.reason).toBeUndefined();
  expect(row.figure?.terms).toMatchObject({
    typeModifier: 0.7,
    explosivePenalty: 0,
    weightBV: 10,
    offensiveTypeModifier: 1,
    adjustment: 0,
  });
});

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('vehicle BV diagnostic projection', () => {
  const input = (patch: Partial<VehicleBVInput> = {}): VehicleBVInput => ({
    motionType: GroundMotionType.TRACKED,
    tonnage: 20,
    cruiseMP: 4,
    flankMP: 6,
    totalArmorPoints: 48,
    totalStructurePoints: 10,
    weapons: [],
    ...patch,
  });
  const weaponTerms = (value: object) =>
    Object.fromEntries(
      Object.entries(value).filter(([key]) => key.startsWith('weapon.')),
    );

  test('Tamerlane Flamer exposes all three pinned mount values without changing totals', () => {
    const row = calculateRow({ ...fixture.units[0], sha256: 'a'.repeat(64) });
    expect(row.figure).toMatchObject({
      total: 436,
      terms: {
        'weapon.0.FR.flamer': 6,
        'weapon.1.TU.medium-laser': 46,
        'weapon.2.TU.medium-laser': 46,
        weaponBV: 98,
      },
    });
  });

  test('Tamerlane RL retains duplicate front launchers and adjusted rear values', () => {
    const source = fixture.units[0];
    const row = calculateRow({
      ...source,
      sha256: 'a'.repeat(64),
      unit: {
        ...source.unit,
        equipment: [
          { id: 'rocket-launcher-10', location: 'FRONT' },
          { id: 'rocket-launcher-10', location: 'FRONT' },
          { id: 'rocket-launcher-10', location: 'REAR' },
          { id: 'rocket-launcher-10', location: 'REAR' },
          { id: 'er-medium-laser', location: 'TURRET' },
        ],
      },
    });
    expect(row.reason).toBeUndefined();
    expect(row.figure).toMatchObject({
      total: 484,
      terms: {
        'weapon.0.FR.rl10': 18,
        'weapon.1.FR.rl10': 18,
        'weapon.2.RR.rl10': 9,
        'weapon.3.RR.rl10': 9,
        'weapon.4.TU.er-medium-laser': 62,
        weaponBV: 116,
      },
    });
  });

  test.each([
    ['Front', 'FR'],
    ['Right', 'RS'],
    ['Left', 'LS'],
    ['Rear', 'RR'],
    ['Body', 'BD'],
    ['Rotor', 'RO'],
    ['Turret', 'TU'],
    ['Front Right', 'FRRS'],
    ['Front Left', 'FRLS'],
    ['Rear Right', 'RRRS'],
    ['Rear Left', 'RRLS'],
  ])('formats known location %s as %s', (location, abbreviation) => {
    const b = calculateVehicleBV(
      input({ weapons: [{ id: 'flamer', location }] }),
    );
    expect(weaponTerms(b)).toEqual({ [`weapon.0.${abbreviation}.flamer`]: 6 });
  });

  test('dual turrets use RT and FT while a VTOL chin turret uses TU', () => {
    const mounts = [
      { id: 'medium-laser', location: 'Turret' },
      { id: 'medium-laser', location: 'Turret 2' },
    ];
    const b = calculateVehicleBV(
      input({
        weapons: mounts,
        turret: { kind: 'dual' },
        secondaryTurret: { kind: 'dual' },
      }),
    );
    expect(weaponTerms(b)).toEqual({
      'weapon.0.RT.medium-laser': 46,
      'weapon.1.FT.medium-laser': 46,
    });
    const chin = calculateVehicleBV(
      input({
        motionType: GroundMotionType.VTOL,
        turret: { kind: 'chin' },
        weapons: [mounts[0]],
      }),
    );
    expect(weaponTerms(chin)).toEqual({ 'weapon.0.TU.medium-laser': 46 });
  });

  test.each([
    [{ isSupportVehicle: true }, 36.800000000000004],
    [{ chassisEquipment: ['targeting-computer'] }, 57.5],
    [{ chassisEquipment: ['droneoperatingsystem'] }, 36.800000000000004],
  ] satisfies [Partial<VehicleBVInput>, number][])(
    'projects the existing modifier result for %j',
    (patch, expected) => {
      const value = input({
        ...patch,
        weapons: [{ id: 'medium-laser', location: 'Front' }],
      });
      const original = JSON.stringify(value);
      const b = calculateVehicleBV(value);
      expect(weaponTerms(b)).toEqual({ 'weapon.0.FR.medium-laser': expected });
      expect(b.weaponBV).toBe(expected);
      expect(JSON.stringify(value)).toBe(original);
    },
  );

  test('rear reversal projects the existing value rather than listed BV', () => {
    const b = calculateVehicleBV(
      input({
        weapons: [
          { id: 'flamer', location: 'Front' },
          { id: 'medium-laser', location: 'Rear' },
        ],
      }),
    );
    expect(weaponTerms(b)).toEqual({
      'weapon.0.FR.flamer': 3,
      'weapon.1.RR.medium-laser': 46,
    });
  });

  test('unknown locations stay unprojected, without affecting existing arithmetic', () => {
    const b = calculateVehicleBV(
      input({ weapons: [{ id: 'flamer', location: 'Unknown' }] }),
    );
    expect(b.weaponBV).toBe(6);
    expect(weaponTerms(b)).toEqual({});
  });

  test('zero-BV TAG is absent while an empty machine-gun array stays admitted', () => {
    const b = calculateVehicleBV(
      input({
        weapons: [
          { id: 'istag', location: 'Front' },
          { id: 'machine-gun-array', location: 'Front' },
          { id: 'flamer', location: 'Front' },
        ],
      }),
    );
    expect(weaponTerms(b)).toEqual({
      'weapon.1.FR.mga': 0,
      'weapon.2.FR.flamer': 6,
    });
    expect(b.weaponBV).toBe(6);
  });

  test('capacitor exclusion preserves local indices and the linked PPC result', () => {
    const value = input({
      weapons: [
        { id: 'ppc-capacitor', location: 'Front' },
        { id: 'ppc', location: 'Front' },
      ],
    });
    const original = JSON.stringify(value);
    const b = calculateVehicleBV(value);
    expect(weaponTerms(b)).toEqual({ 'weapon.1.FR.ppc': 264 });
    expect(JSON.stringify(value)).toBe(original);
  });

  test('source names and canonical IDs produce identical sponson diagnostics', () => {
    const source = input({
      weapons: [
        {
          id: 'Medium Laser',
          location: 'Body',
          isTurretMounted: true,
          isSponsonMounted: true,
        },
      ],
    });
    const original = JSON.stringify(source);
    const canonical = input({
      weapons: [{ ...source.weapons[0], id: 'medium-laser' }],
    });
    const actual = calculateVehicleBV(source);
    expect(actual).toEqual(calculateVehicleBV(canonical));
    expect(weaponTerms(actual)).toEqual({ 'weapon.0.BD.medium-laser': 46 });
    expect(actual.weaponMountBV?.[0].equipmentId).toBe('medium-laser');
    expect(JSON.stringify(source)).toBe(original);
  });

  describe('ammo pool projection', () => {
    test('exposes uncapped availability and the listed cap before Artemis', () => {
      const b = calculateVehicleBV(
        input({
          weapons: [{ id: 'srm-2', location: 'Front', artemisType: 'iv' }],
          ammo: [
            { id: 'srm-2-ammo', location: 'Body', bvOverride: 32 },
            { id: 'srm-2-ammo', location: 'Body', bvOverride: 4 },
          ],
        }),
      );
      expect(b).toMatchObject({
        weaponBV: 25.2,
        ammoBV: 21,
        ammoPools: { available: { 'SRM:2': 36 }, cap: { 'SRM:2': 21 } },
        'ammo.available.SRM:2': 36,
        'ammo.cap.SRM:2': 21,
      });
    });

    test('retains raw pools before support fire-control scaling', () => {
      const b = calculateVehicleBV(
        input({
          isSupportVehicle: true,
          chassisEquipment: ['basic-fire-control'],
          weapons: [{ id: 'srm-2', location: 'Front' }],
          ammo: [{ id: 'srm-2-ammo', location: 'Body', bvOverride: 3 }],
        }),
      );
      expect(b.ammoBV).toBeCloseTo(2.7);
      expect(b).toMatchObject({
        ammoPools: { available: { 'SRM:2': 3 }, cap: { 'SRM:2': 21 } },
        'ammo.available.SRM:2': 3,
        'ammo.cap.SRM:2': 21,
      });
    });

    test('reports orphan bins and caps without bins independently', () => {
      const orphan = calculateVehicleBV(
        input({
          ammo: [{ id: 'srm-2-ammo', location: 'Body', bvOverride: 3 }],
        }),
      );
      expect(orphan.ammoBV).toBe(0);
      expect(orphan).toMatchObject({ 'ammo.available.SRM:2': 3 });
      expect(Object.keys(orphan)).not.toContain('ammo.cap.SRM:2');
      const empty = calculateVehicleBV(
        input({ weapons: [{ id: 'srm-2', location: 'Front' }] }),
      );
      expect(empty.ammoBV).toBe(0);
      expect(empty).toMatchObject({ 'ammo.cap.SRM:2': 21 });
      expect(Object.keys(empty)).not.toContain('ammo.available.SRM:2');
    });

    test('preserves admitted zero pools and never mutates supplied maps', () => {
      const b = calculateVehicleBV(
        input({
          ammo: [{ id: 'srm-2-ammo', location: 'Body', bvOverride: 0 }],
        }),
      );
      if (!b.ammoPools) throw new Error('Missing represented zero ammo pool');
      const frozen = Object.freeze({
        ...b,
        ammoPools: Object.freeze({
          available: Object.freeze({ ...b.ammoPools.available }),
          cap: Object.freeze({ ...b.ammoPools.cap }),
        }),
      });
      const original = JSON.stringify(frozen);
      expect(vehicleBVTerms(frozen)).toMatchObject({
        ammoBV: 0,
        'ammo.available.SRM:2': 0,
      });
      expect(JSON.stringify(frozen)).toBe(original);
    });

    test('shares raw AMS cap facts across aliases without admitting defensive ammo', () => {
      const source = input({
        weapons: [{ id: 'srm-2', location: 'Front' }],
        ammo: [{ id: 'srm-2-ammo', location: 'Body', bvOverride: 3 }],
        defensiveEquipment: [
          { id: 'isantimissilesystem', location: 'Turret' },
          { id: 'isams-ammo', location: 'Body' },
        ],
      });
      const original = JSON.stringify(source);
      const actual = calculateVehicleBV(source);
      expect(actual).toEqual(
        calculateVehicleBV({
          ...source,
          defensiveEquipment: [
            { id: 'ams', location: 'Turret' },
            { id: 'ams-ammo', location: 'Body' },
          ],
        }),
      );
      expect(actual).toMatchObject({
        ammoBV: 3,
        defensiveEquipmentBV: 43,
        ammoPools: {
          available: { 'SRM:2': 3 },
          cap: { 'SRM:2': 21, 'AMS:2': 32 },
        },
        'ammo.cap.AMS:2': 32,
      });
      expect(Object.keys(actual)).not.toContain('ammo.available.AMS:2');
      expect(JSON.stringify(source)).toBe(original);
    });

    test('retains two APDS launcher caps while their ammo stays defensive', () => {
      const b = calculateVehicleBV(
        input({
          defensiveEquipment: [
            { id: 'risc-apds', location: 'Turret' },
            { id: 'risc-apds', location: 'Turret' },
            { id: 'isapds-ammo', location: 'Body' },
          ],
        }),
      );
      expect(b).toMatchObject({
        ammoBV: 0,
        defensiveEquipmentBV: 150,
        ammoPools: { available: {}, cap: { 'APDS:2': 128 } },
        'ammo.cap.APDS:2': 128,
      });
      expect(Object.keys(b)).not.toContain('ammo.available.APDS:2');
    });
  });

  test('Artemis and machine-gun arrays project the existing linked values', () => {
    const b = calculateVehicleBV(
      input({
        weapons: [
          { id: 'srm-2', location: 'Front', artemisType: 'iv' },
          { id: 'machine-gun-array', location: 'Turret' },
          { id: 'machine-gun', location: 'Turret' },
          { id: 'machine-gun', location: 'Turret' },
        ],
      }),
    );
    expect(weaponTerms(b)).toEqual({
      'weapon.0.FR.srm-2': 25.2,
      'weapon.1.TU.mga': 6.7,
      'weapon.2.TU.machine-gun': 5,
      'weapon.3.TU.machine-gun': 5,
    });
  });

  test('unarmed and legacy breakdowns do not invent mount facts', () => {
    const b = calculateVehicleBV(input());
    expect(b).not.toHaveProperty('weaponMountBV');
    expect(b).not.toHaveProperty('ammoPools');
    expect(
      Object.keys(vehicleBVTerms(b)).filter((key) => key.startsWith('ammo.')),
    ).toEqual([]);
    expect(weaponTerms(vehicleBVTerms(b))).toEqual({});
    const legacy = { ...b, weaponBV: 6 };
    expect(vehicleBVTerms(legacy)).not.toHaveProperty('weaponMountBV');
    expect(weaponTerms(vehicleBVTerms(legacy))).toEqual({});
  });
});
