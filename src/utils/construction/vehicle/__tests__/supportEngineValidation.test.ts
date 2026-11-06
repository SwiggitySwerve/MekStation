/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  EngineType,
  VehicleOnlyEngineType,
} from '@/types/construction/EngineType';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { validateVehicleEngine } from '../engine';
import { VehicleStructureType } from '../structure';
import { validateVehicleConstruction } from '../vehicleValidation';

// MegaMek 48fcb2f64: Engine.java:396-404,453-474,601-603.
// The same pinned loaded-source engine terms are covered by engine.test.ts.
it.each([
  ['Small Steamer', VehicleOnlyEngineType.STEAM, 1, 2.5, M.NAVAL, 2, 5, 0.28],
  ['Hoverpod', VehicleOnlyEngineType.BATTERY, 2, 0.25, M.HOVER, 5, 1.25, 0.05],
  ['Lesseps', VehicleOnlyEngineType.BATTERY, 3, 50, M.WHEELED, 3, 150, 6],
  ['Beast', EngineType.STANDARD, 3, 4.054, M.WHEELED, 3, 12.162, 0.25],
  ['Adelante', EngineType.STANDARD, 3, 600, M.RAIL, 12, 500, 312],
  ['TGV', VehicleOnlyEngineType.NONE, 5, 120, M.RAIL, 0, 0, 0],
] as const)(
  'validates the support engine of %s with its own rating and mass rules',
  (_name, engineType, engineTechRating, tonnage, motion, mp, rating, mass) => {
    const result = validateVehicleEngine(tonnage, mp, engineType, motion, {
      unitType: UnitType.SUPPORT_VEHICLE,
      engineTechRating,
    });
    expect(result.engineRating).toBeCloseTo(rating, 12);
    expect(result.engineWeight).toBe(mass);
    expect(result.errors).toEqual([]);
  },
);

it.each([
  [2, 5],
  [3, 1.5],
] as const)(
  'transports engine technology %s through construction validation',
  (engineTechRating, mass) => {
    expect(
      validateVehicleConstruction({
        unitType: UnitType.SUPPORT_VEHICLE,
        tonnage: 20,
        motionType: M.TRACKED,
        engineType: EngineType.STANDARD,
        engineTechRating,
        cruiseMP: 1,
        turretType: TurretType.NONE,
        turretEquipmentWeight: 0,
        turretStructureWeight: 0,
        secondaryTurretEquipmentWeight: 0,
        secondaryTurretStructureWeight: 0,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {},
        crewSize: 4,
        energyWeaponWeight: 0,
        powerAmpWeight: 0,
        structureType: VehicleStructureType.STANDARD,
      }).computedWeights.engine,
    ).toBe(mass);
  },
);

it('retains the combat rating limit and installed hover minimum', () => {
  expect(
    validateVehicleEngine(100, 5, EngineType.STANDARD, M.TRACKED).errors,
  ).toEqual([expect.objectContaining({ ruleId: 'VAL-VEHICLE-ENGINE' })]);
  expect(
    validateVehicleEngine(50, 1, EngineType.STANDARD, M.HOVER).engineWeight,
  ).toBe(10);
});
