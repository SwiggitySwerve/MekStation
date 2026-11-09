import type { VehicleBVInput } from '../../src/utils/construction/vehicle/vehicleBVTypes';

import { GroundMotionType } from '../../src/types/unit/BaseUnitInterfaces';
import { vehicleBVTerms } from '../../src/utils/construction/vehicle/bvTrace';
import { calculateVehicleBV } from '../../src/utils/construction/vehicle/vehicleBVCalculator';
import { calculateRow } from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

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
describe('vehicle per-mount weapon projection', () => {
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
        'weapon.0.FR.rocket-launcher-10': 18,
        'weapon.1.FR.rocket-launcher-10': 18,
        'weapon.2.RR.rocket-launcher-10': 9,
        'weapon.3.RR.rocket-launcher-10': 9,
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
      'weapon.1.FR.machine-gun-array': 0,
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
      'weapon.1.TU.machine-gun-array': 6.7,
      'weapon.2.TU.machine-gun': 5,
      'weapon.3.TU.machine-gun': 5,
    });
  });

  test('unarmed and legacy breakdowns do not invent mount facts', () => {
    const b = calculateVehicleBV(input());
    expect(b).not.toHaveProperty('weaponMountBV');
    expect(weaponTerms(vehicleBVTerms(b))).toEqual({});
    const legacy = { ...b, weaponBV: 6 };
    expect(vehicleBVTerms(legacy)).not.toHaveProperty('weaponMountBV');
    expect(weaponTerms(vehicleBVTerms(legacy))).toEqual({});
  });
});
