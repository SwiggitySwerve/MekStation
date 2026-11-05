import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IEquipmentItem } from '@/types/equipment';
import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory as C } from '@/types/equipment/EquipmentCategory';

import { computeVehicleMountedWeightFigures } from '../mountedWeight';
import { computeVehicleWeightBreakdown } from '../weightComposition';

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
// MegaMek 48fcb2f64 MiscType.java:1423-1435; TestEntity.java:971-979.
it.each([
  ['Morningstar City Command Vehicle (HPG)', 20, 10, 60],
  ['J-27 Trailer (RISC) (Decoy)', 12, 2, 10],
  ['J-27 Trailer (RISC) (Homing)', 12, 2, 10],
])(
  'charges native %s miscellaneous heat and paid sinks',
  (name, heat, sinks, java) => {
    const state = mapToVehicleState(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/vehicles', name + '.json'),
          'utf8',
        ),
      ),
    );
    const resolve = (id: string, isAmmo?: boolean) =>
      getEquipmentLookupService().getMountedById(id, isAmmo === true);
    expect(
      computeVehicleMountedWeightFigures(state, resolve).rawWeaponHeat,
    ).toBe(heat);
    const result = computeVehicleWeightBreakdown(state, resolve);
    expect(result.heatSinks).toBe(sinks);
    expect(state.tonnage - (result.remaining ?? NaN)).toBe(java);
  },
);
const base = createDefaultVehicleState({
  name: 'Thermal order',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
});
const mount = (equipmentId: string): IVehicleMountedEquipment => ({
  id: equipmentId,
  name: equipmentId,
  equipmentId,
  location: VehicleLocation.FRONT,
  isTurretMounted: false,
  isSponsonMounted: false,
  isRearMounted: false,
});
const item = (id: string, category: C, heat?: number): IEquipmentItem => ({
  id,
  category,
  heat,
  name: id,
  weight: 1,
  criticalSlots: 1,
  costCBills: 0,
  battleValue: 0,
  introductionYear: 3000,
  rulesLevel: RulesLevel.STANDARD,
  techBase: TechBase.INNER_SPHERE,
});
const records = new Map([
  ['groundmobilehpg', item('groundmobilehpg', C.MISC_EQUIPMENT)],
  ['laser', item('laser', C.ENERGY_WEAPON, 1)],
  ['laserinsulator', item('laserinsulator', C.MISC_EQUIPMENT)],
]);
it.each([
  ['groundmobilehpg', 'laser', 'laserinsulator'],
  ['laser', 'laserinsulator', 'groundmobilehpg'],
])(
  'adds misc heat after the linked-weapon zero guard for order %s',
  (...ids) => {
    const result = computeVehicleMountedWeightFigures(
      { ...base, equipment: ids.map(mount) },
      (id) => records.get(id),
    );
    expect(result.rawWeaponHeat).toBe(21);
  },
);
it('does not treat an ammunition or weapon identity as a miscellaneous device', () => {
  for (const category of [C.AMMUNITION, C.BALLISTIC_WEAPON]) {
    const result = computeVehicleMountedWeightFigures(
      { ...base, equipment: [mount('groundmobilehpg')] },
      (id) => item(id, category, 0),
    );
    expect(result.rawWeaponHeat).toBe(0);
  }
});
