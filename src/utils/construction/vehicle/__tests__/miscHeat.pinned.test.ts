import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IEquipmentItem } from '@/types/equipment';
import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import {
  EngineType,
  type VehicleEngineType,
} from '@/types/construction/EngineType';
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
// MegaMek 48fcb2f64 MiscType.java:1423-1441; TestEntity.java:971-979.
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

/**
 * HeatSweepProbe on original MegaMek 48fcb2f64 classes: 30 BLK edits of
 * Scorpion Light Tank, changing only engine_type and Body Equipment.
 * MiscType.java:1436-1439 gives each device 2 heat; TestEntity.java:974-977
 * excludes welders on fusion/fission. TestTank.java:264-270 subtracts the
 * engine's free sinks and clamps the paid mass at zero.
 */
const syntheticRows: readonly (readonly [
  engine: EngineType,
  devices: string,
  javaCount: number,
  javaMass: number,
])[] = [
  [EngineType.STANDARD, 'none', 0, 0],
  [EngineType.STANDARD, 'welder', 0, 0],
  [EngineType.STANDARD, 'risc', 2, 0],
  [EngineType.STANDARD, 'nova', 2, 0],
  [EngineType.STANDARD, 'all3', 4, 0],
  [EngineType.ICE, 'none', 0, 0],
  [EngineType.ICE, 'welder', 2, 2],
  [EngineType.ICE, 'risc', 2, 2],
  [EngineType.ICE, 'nova', 2, 2],
  [EngineType.ICE, 'all3', 6, 6],
  [EngineType.XL_IS, 'none', 0, 0],
  [EngineType.XL_IS, 'welder', 0, 0],
  [EngineType.XL_IS, 'risc', 2, 0],
  [EngineType.XL_IS, 'nova', 2, 0],
  [EngineType.XL_IS, 'all3', 4, 0],
  [EngineType.LIGHT, 'none', 0, 0],
  [EngineType.LIGHT, 'welder', 0, 0],
  [EngineType.LIGHT, 'risc', 2, 0],
  [EngineType.LIGHT, 'nova', 2, 0],
  [EngineType.LIGHT, 'all3', 4, 0],
  [EngineType.FUEL_CELL, 'none', 0, 0],
  [EngineType.FUEL_CELL, 'welder', 2, 1],
  [EngineType.FUEL_CELL, 'risc', 2, 1],
  [EngineType.FUEL_CELL, 'nova', 2, 1],
  [EngineType.FUEL_CELL, 'all3', 6, 5],
  [EngineType.FISSION, 'none', 0, 0],
  [EngineType.FISSION, 'welder', 0, 0],
  [EngineType.FISSION, 'risc', 2, 0],
  [EngineType.FISSION, 'nova', 2, 0],
  [EngineType.FISSION, 'all3', 4, 0],
];
const devices: Readonly<Record<string, readonly string[]>> = {
  none: [],
  welder: ['spot-welder'],
  risc: ['risclaserpulsemodule'],
  nova: ['nova-combined-electronic-warfare-system-cews'],
  all3: [
    'spot-welder',
    'risclaserpulsemodule',
    'nova-combined-electronic-warfare-system-cews',
  ],
};
const scorpion = () =>
  mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/vehicles/Scorpion Light Tank.json',
        ),
        'utf8',
      ),
    ),
  );
const resolve = (id: string, isAmmo?: boolean) =>
  getEquipmentLookupService().getMountedById(id, isAmmo === true);

it.each(syntheticRows)(
  'Scorpion %s/%s matches Java heat count %s and sink mass %s',
  (engineType, set, javaCount, javaMass) => {
    const source = scorpion();
    const state = {
      ...source,
      engineType,
      equipment: [...source.equipment, ...devices[set].map(mount)],
    };
    expect(
      computeVehicleMountedWeightFigures(state, resolve).rawWeaponHeat,
    ).toBe(javaCount);
    expect(computeVehicleWeightBreakdown(state, resolve).heatSinks).toBe(
      javaMass,
    );
  },
);

it('keeps welder heat unresolved for an unknown engine', () => {
  const source = scorpion();
  const result = computeVehicleMountedWeightFigures(
    {
      ...source,
      // Exercise malformed boundary input that the typed store cannot create.
      engineType: 'Unknown engine' as VehicleEngineType,
      equipment: [...source.equipment, mount('spot-welder')],
    },
    resolve,
  );
  expect(result.rawWeaponHeat).toBeNull();
});
