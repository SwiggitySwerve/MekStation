import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';

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

/**
 * Pinned MegaMek 48fcb2f64a1b, original classes, loaded from the corpus BLKs:
 * count = TestEntity.calcHeatNeutralHSRequirement (TestEntity.java:945-984),
 * mass = TestTank.getWeightHeatSinks (TestTank.java:264-270), which subtracts
 * Engine.getWeightFreeEngineHeatSinks (Engine.java:480-493: fusion-class 10,
 * fission 5, fuel cell 1, otherwise 0) and clamps at zero. Values come from a
 * HeatSweepProbe run over all 1,444 mobile vehicles; MekStation matched Java
 * on count and mass for every one of the 1,150 complete combat weights.
 * Count > free allowance pins the allowance; count <= allowance pins the clamp.
 */
const rows: readonly (readonly [
  family: string,
  unit: string,
  javaCount: number,
  javaMass: number,
])[] = [
  ['Fusion', 'Ares Medium Tank', 12, 2],
  ['Fusion (clamped)', 'Ares Medium Tank (Plasma)', 7, 0],
  ['Fusion VTOL', 'Anhur Transport', 13, 3],
  ['XL', 'Ajax Assault Tank (Sealed)', 20, 10],
  ['XL (clamped)', 'Ajax Assault Tank A', 2, 0],
  ['Light', 'Manticore Heavy Tank (HPPC)', 15, 5],
  ['Light (clamped)', 'Demon Tank CX-2', 6, 0],
  ['XXL', 'Manticore II Heavy Tank', 15, 5],
  ['Clan XL', 'Aithon Assault Transport', 16, 6],
  ['Clan XXL', 'Enyo Strike Tank XR', 13, 3],
  ['ICE', 'Bulldog Medium Tank', 8, 8],
  ['Fuel Cell, one free', 'Anat APC', 2, 1],
  ['Fuel Cell', 'Bulldog Medium Tank (Cell)', 10, 9],
  ['Fission, five free', 'Condor Heavy Hover Tank (Fission)', 9, 4],
  ['No engine', 'J-27 Ordnance Transport (Trailer)', 0, 0],
  // Non-patchwork stealth armor adds ten (TestEntity.java:981-983).
  ['Stealth over the allowance', 'Lightning Attack Hovercraft CX-3', 14, 4],
  ['Stealth VTOL', 'Strix Stealth VTOL', 14, 4],
  ['Stealth at the allowance', 'Anhur (P-Stealth)', 10, 0],
  // A PPC capacitor adds five (TestEntity.java:966-968).
  ['PPC capacitor', 'Kamisori Light Tank A', 10, 0],
  // A laser insulator subtracts one (TestEntity.java:956-962).
  ['Laser insulator', 'Pandion Combat WiGE (3140 Upgrade)', 10, 0],
];

it.each(rows)(
  '%s: %s matches the Java sink count and mass',
  (_family, unit, javaCount, javaMass) => {
    const state = mapToVehicleState(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/vehicles', unit + '.json'),
          'utf8',
        ),
      ),
    );
    const resolve = (id: string, isAmmo?: boolean) =>
      getEquipmentLookupService().getMountedById(id, isAmmo === true);
    const raw = computeVehicleMountedWeightFigures(
      state,
      resolve,
    ).rawWeaponHeat;
    const stealth = state.armorType === ArmorTypeEnum.STEALTH ? 10 : 0;
    expect(raw).not.toBeNull();
    expect((raw ?? NaN) + stealth).toBe(javaCount);
    expect(computeVehicleWeightBreakdown(state, resolve).heatSinks).toBe(
      javaMass,
    );
  },
);
