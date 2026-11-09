/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createSupportRegistryMass } from '@/services/units/handlers/supportRegistryMass';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';

import { computeVehicleMountedWeightFigures } from '../mountedWeight';
import { computeSupportVehicleWeight } from '../supportWeight';
import {
  applyVehicleMountMechanismWeights,
  computeVehiclePintleMechanismWeight,
  isSponsonMechanismPayload,
  type IVehicleMechanismMount,
} from '../turret';
import sources from './supportMechanisms.pinned.json';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

const handler = new SupportVehicleUnitHandler();
const weigh = (content: string) => {
  const parsed = new BlkParserService().parse(content);
  if (!parsed.success) throw new Error('fixture parse');
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error('handler parse');
  const unit = result.data.unit;
  return computeSupportVehicleWeight(
    unit,
    createSupportRegistryMass(unit.techBase),
  );
};

/**
 * Construction excerpts: mm-data 50f7efef, CC BY-NC-SA 4.0 (prose removed; paths
 * and hashes identify the complete pinned sources). Expected terms are the pinned
 * MegaMek 48fcb2f64 TestSupportVehicle verifier values, probed from the original
 * classes. MiscType.java:563-603: a pintle turret weighs the source's fixed
 * chassis weight split over the pintles when one is given, otherwise 5% of the
 * pintle-mounted weapons in its location; a sponson pair weighs 10% of the
 * sponson-mounted equipment split between the two. Both round up (kilogram on a
 * small support vehicle, half ton otherwise).
 */
const closed = sources.filter((row) => row.closed);
const open = sources.filter((row) => !row.closed);

it.each(closed)('$path equals the pinned Java mechanism terms', (row) => {
  const weight = weigh(row.content);
  expect(weight.unresolved).toEqual([]);
  expect(weight.weapons).toBeCloseTo(row.java.weapons, 9);
  expect(weight.miscEquipment).toBeCloseTo(row.java.miscEquipment, 9);
  expect(weight.total).toBeCloseTo(row.java.total, 9);
});

// Honest residuals: a mechanism that depends on an unresolved weapon is itself
// unresolved, never charged as if the weapon weighed nothing.
it('leaves the pintles of the misidentified battle-armor gun unresolved (Java 0.001 t each)', () => {
  const row = open.find((r) => r.path.includes('Militarized MG'));
  if (!row) throw new Error('fixture');
  expect(weigh(row.content).unresolved).toEqual(
    expect.arrayContaining(['PintleTurret', 'PintleTurret']),
  );
});

it('resolves the Limpet pintles; only the clip ammunition stays unresolved', () => {
  const row = open.find((r) => r.path.includes('Limpet'));
  if (!row) throw new Error('fixture');
  const unresolved = weigh(row.content).unresolved;
  expect(unresolved).not.toContain('PintleTurret');
  expect(unresolved).toEqual([
    'InfantryAssaultRifle(PT):SIZE:10.0 (clip ammunition mass)',
    'InfantryAssaultRifle(PT):SIZE:10.0 (clip ammunition mass)',
  ]);
});

describe('pintle mechanism owner', () => {
  it.each([
    // [weapon tons, pintles, fixed chassis tons, kilograms, expected]
    [0.03, 1, undefined, true, 0.002], // Ibex LDGR: 0.0015 rounds up to 2 kg
    [0.007, 1, undefined, true, 0.001], // Ibex MG: 0.00035 rounds up to 1 kg
    [0.044, 1, undefined, true, 0.003], // Outrider: 0.0022 rounds up to 3 kg
    [0, 1, undefined, true, 0], // a pintle with no weapon
    [4, 1, undefined, false, 0.5], // 0.2 t rounds up to the half ton
    [0.03, 1, 0.08, true, 0.08], // Apocalypse World Rover: the fixed weight wins
    [0.5, 2, 0.06, true, 0.03], // split over the pintles
    [0.5, 1, 0, true, 0], // a fixed weight of zero is still fixed
    [0.03, 1, -1, true, 0.002], // -1 is MegaMek's unassigned sentinel
  ])(
    'weapons %s t, %s pintle(s), fixed %s, kilograms %s weigh %s t each',
    (weaponWeight, count, baseChassisWeight, kilograms, expected) => {
      expect(
        computeVehiclePintleMechanismWeight({
          weaponWeight,
          count,
          baseChassisWeight,
          kilograms,
        }),
      ).toBeCloseTo(expected, 9);
    },
  );
  it('is unavailable without a known weapon mass or a pintle count', () => {
    expect(
      computeVehiclePintleMechanismWeight({ weaponWeight: null, count: 1 }),
    ).toBeNull();
    expect(
      computeVehiclePintleMechanismWeight({ weaponWeight: 0.1, count: 0 }),
    ).toBeNull();
  });
});

describe('sponson payload predicate', () => {
  const payload = (over: {
    isSponsonMounted?: boolean;
    isAmmunition?: boolean;
    id?: string;
  }) =>
    isSponsonMechanismPayload({
      isSponsonMounted: true,
      isAmmunition: false,
      id: 'medium-laser',
      ...over,
    });
  it('counts sponson-mounted equipment other than ammunition, heat sinks and armor', () => {
    expect(payload({})).toBe(true);
    expect(payload({ isSponsonMounted: false })).toBe(false);
    expect(payload({ isAmmunition: true })).toBe(false);
    expect(payload({ id: HEAT_SINK_EQUIPMENT_IDS[0] })).toBe(false);
    expect(payload({ id: 'reactive-armor' })).toBe(false);
  });
});

// An unidentified mount that is not ammunition may be the weapon a pintle carries;
// unidentified ammunition cannot be.
it('does not let unidentified ammunition make a pintle unresolved', () => {
  const row = closed.find((r) => r.path.includes('Militarized LDGR'));
  if (!row) throw new Error('fixture');
  const content = row.content.replace(
    'PintleTurret\n',
    'PintleTurret\nIS Ammo Bogus - Full(PT)\n',
  );
  expect(content).not.toBe(row.content);
  const unresolved = weigh(content).unresolved;
  expect(unresolved).toEqual(['IS Ammo Bogus - Full(PT)']);
});

describe('mechanism pass over mounted equipment', () => {
  const mount = (
    over: Partial<IVehicleMechanismMount<string>>,
  ): IVehicleMechanismMount<string> => ({
    id: 'laser',
    location: 'right',
    weight: 0.5,
    weapon: true,
    pintleMounted: false,
    sponsonPayload: false,
    ...over,
  });
  it('charges each pintle only the pintle-mounted weapons of its own location', () => {
    const mounts = [
      mount({ pintleMounted: true, weight: 0.044 }),
      mount({ id: 'pintle-mount', weapon: false, weight: 0 }),
      mount({ id: 'pintle-mount', weapon: false, weight: 0, location: 'left' }),
      mount({ weight: 9 }), // same location, not pintle-mounted
    ];
    const result = applyVehicleMountMechanismWeights(mounts, {
      kilograms: true,
    });
    expect(result).toEqual({
      sponsonUnavailable: false,
      pintleUnavailable: false,
    });
    expect(mounts[1].weight).toBeCloseTo(0.003, 9);
    expect(mounts[2].weight).toBe(0);
  });
  it('splits ten percent of the sponson payload, rounded up, between the sponsons', () => {
    const mounts = [
      mount({ sponsonPayload: true, weight: 2 }),
      mount({ sponsonPayload: true, weight: 2, location: 'left' }),
      mount({ id: 'vehicular-sponson-turret', weapon: false, weight: 0 }),
      mount({
        id: 'vehicular-sponson-turret',
        weapon: false,
        weight: 0,
        location: 'left',
      }),
    ];
    applyVehicleMountMechanismWeights(mounts, {});
    // 10% of 4 t is 0.4 t, rounded up to 0.5 t, split in two.
    expect(mounts[2].weight).toBe(0.25);
    expect(mounts[3].weight).toBe(0.25);
  });
  it('is unavailable when a weapon or the sponson payload has no known mass', () => {
    const mounts = [
      mount({ pintleMounted: true, weight: null }),
      mount({ id: 'pintle-mount', weapon: false, weight: 0 }),
      mount({ sponsonPayload: true, weight: null }),
      mount({ id: 'vehicular-sponson-turret', weapon: false, weight: 0 }),
    ];
    expect(applyVehicleMountMechanismWeights(mounts, {})).toEqual({
      sponsonUnavailable: true,
      pintleUnavailable: true,
    });
    expect(mounts[1].weight).toBeNull();
    expect(mounts[3].weight).toBeNull();
  });
});

// The editor reads the same owner: Ibex RV Militarized-Gauss mounts two Light
// Gauss rifles (0.03 t each) with a pintle each; Java weapon 0.06 t plus pintles
// 0.004 t.
it('charges the editor the Java pintle masses', () => {
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/vehicles',
          'Ibex RV (Militarized-Gauss).json',
        ),
        'utf8',
      ),
    ),
  );
  const figures = computeVehicleMountedWeightFigures(state, (id, isAmmo) =>
    getEquipmentLookupService().getMountedById(id, isAmmo === true),
  );
  expect(figures.unresolvedMountIds).toEqual([]);
  expect(figures.equipment).toBeCloseTo(0.064, 9);
});
