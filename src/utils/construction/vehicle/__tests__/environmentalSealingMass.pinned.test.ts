import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';

import { computeVehicleMountedWeightBreakdown } from '../mountedWeight';
import { resolveVehicleAccessoryMass } from '../variableEquipmentMass';

/** @spec establish-all-unit-data-parity/vehicle-unit-system */
// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// MiscType.java:660-666,10270-10281; RoundWeight.java:56-68;
// TestEntity.java:631-667. mm-data 50f7efe's 19 frozen sealing rows.
// Each mass is independently observed with Mounted.getTonnage() in TestTank.
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

const sealingIds = [
  'environmental-sealed-chassis',
  'environmental-sealed-chassis-registry',
] as const;

it.each(sealingIds)('%s shares native rounding and the support guard', (id) => {
  for (const [tonnage, support, mass] of [
    [55, false, 5.5],
    [55.01, false, 6],
    [1.3, false, 0.5],
    [1.3, true, 0],
    [55, true, 0],
  ] as const) {
    expect(
      resolveVehicleAccessoryMass(
        { id, weight: 0 },
        { tonnage, isSupportVehicle: support },
      ),
    ).toBe(mass);
  }
  expect(resolveVehicleAccessoryMass({ id, weight: 0 })).toBeNull();
});

it.each([
  ['Prowler Multi-Terrain Vehicle (Sealed)', 55, 5.5],
  ['Ajax Assault Tank (Sealed)', 90, 9],
  ['Beagle (Sealed)', 15, 1.5],
  ['Challenger XIVs MBT', 90, 9],
  ['Drillson Heavy Hover Tank (Sealed)', 50, 5],
  ['Goblin Infantry Support Vehicle (Sealed)', 45, 4.5],
  ['Hetzer Wheeled Assault Gun (Sealed)', 40, 4],
  ['Ontos Heavy Tank (Sealed)', 95, 9.5],
  ['Pegasus Scout Hover Tank (Sealed)', 35, 3.5],
  ['Plainsman Medium Hovertank (Sealed)', 35, 3.5],
  ['Rommel Tank (Sealed)', 65, 6.5],
  ['Striker Light Tank (Sealed)', 35, 3.5],
  ['Hiryo Armored Infantry Transport BloodHound', 40, 4],
  ['Ontos Heavy Tank Heat', 95, 9.5],
  ['Partisan Hull Defense', 80, 8],
  ['Hiryo Armored Infantry Transport Hound', 40, 4],
  ['Patton Tank SB', 65, 6.5],
  ['Packrat Gespenst', 20, 2],
  ['Ontos Heavy Tank X', 95, 9.5],
] as const)(
  '%s charges the Java-probed sealing mass',
  (name, tonnage, mass) => {
    // Exercise the native registry lookup, not the converted catalog's legacy id.
    const result = getEquipmentRegistry().lookup(
      'Environmental Sealed Chassis',
    );
    expect(result.equipment?.id).toBe(sealingIds[1]);
    const equipmentId = result.equipment?.id;
    if (!equipmentId) throw Error('Native sealing must resolve');
    const state = {
      ...createDefaultVehicleState({
        name,
        tonnage,
        techBase: TechBase.INNER_SPHERE,
      }),
      equipment: [
        {
          id: 'sealing-mount',
          equipmentId,
          name: 'Environmental Sealed Chassis',
          location: VehicleLocation.BODY,
          isTurretMounted: false,
          isRearMounted: false,
          isSponsonMounted: false,
        },
      ],
    };
    const mounted = computeVehicleMountedWeightBreakdown(state, (id, ammo) =>
      getEquipmentLookupService().getMountedById(id, ammo === true),
    );
    expect(mounted.equipment).toBe(mass);
    expect(mounted.unresolvedMountIds).toEqual([]);
  },
);
