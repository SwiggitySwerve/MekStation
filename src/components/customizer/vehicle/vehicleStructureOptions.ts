import {
  EngineType,
  VehicleOnlyEngineType,
  type VehicleEngineType,
} from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';

export const VEHICLE_TONNAGE = {
  min: 1,
  max: 200,
  step: 1,
  heavyMin: 60,
  superheavyMin: 101,
};

export const MOTION_TYPE_OPTIONS: {
  value: GroundMotionType;
  label: string;
  maxTonnage: number;
}[] = [
  { value: GroundMotionType.TRACKED, label: 'Tracked', maxTonnage: 200 },
  { value: GroundMotionType.WHEELED, label: 'Wheeled', maxTonnage: 80 },
  { value: GroundMotionType.HOVER, label: 'Hover', maxTonnage: 50 },
  { value: GroundMotionType.VTOL, label: 'VTOL', maxTonnage: 30 },
  { value: GroundMotionType.NAVAL, label: 'Naval', maxTonnage: 300 },
  { value: GroundMotionType.HYDROFOIL, label: 'Hydrofoil', maxTonnage: 100 },
  { value: GroundMotionType.SUBMARINE, label: 'Submarine', maxTonnage: 300 },
  { value: GroundMotionType.WIGE, label: 'WiGE', maxTonnage: 80 },
];

export const ENGINE_TYPE_OPTIONS: {
  value: VehicleEngineType;
  label: string;
}[] = [
  { value: EngineType.STANDARD, label: 'Standard Fusion' },
  { value: EngineType.XL_IS, label: 'XL Engine (IS)' },
  { value: EngineType.XL_CLAN, label: 'XL Engine (Clan)' },
  { value: EngineType.LIGHT, label: 'Light Engine' },
  { value: EngineType.XXL, label: 'XXL Engine' },
  { value: EngineType.COMPACT, label: 'Compact Engine' },
  { value: EngineType.ICE, label: 'ICE (Internal Combustion)' },
  { value: EngineType.FUEL_CELL, label: 'Fuel Cell' },
  { value: EngineType.FISSION, label: 'Fission' },
];

/**
 * Steam and Battery are support-vehicle engines (SVEngine; MegaMekLab's
 * combat list, CVChassisView.ENGINE_TYPES, has neither). An absent engine is
 * listed only when the unit is a trailer or already has none, so the select
 * shows it instead of the first option.
 */
export function getEngineTypeOptions(
  unitType: UnitType,
  engineType: VehicleEngineType,
  isTrailer: boolean,
): { value: VehicleEngineType; label: string }[] {
  return [
    ...ENGINE_TYPE_OPTIONS,
    ...(unitType === UnitType.SUPPORT_VEHICLE
      ? [
          { value: VehicleOnlyEngineType.STEAM, label: 'Steam Engine' },
          { value: VehicleOnlyEngineType.BATTERY, label: 'Battery Engine' },
        ]
      : []),
    ...(isTrailer || engineType === VehicleOnlyEngineType.NONE
      ? [{ value: VehicleOnlyEngineType.NONE, label: 'No Engine' }]
      : []),
  ];
}

export const TURRET_TYPE_OPTIONS: { value: TurretType; label: string }[] = [
  { value: TurretType.NONE, label: 'No Turret' },
  { value: TurretType.SINGLE, label: 'Single Turret' },
  { value: TurretType.DUAL, label: 'Dual Turret' },
  { value: TurretType.CHIN, label: 'Chin Turret (VTOL)' },
];

export const STRUCTURE_TYPE_OPTIONS: {
  value: VehicleStructureType;
  label: string;
}[] = [
  { value: VehicleStructureType.STANDARD, label: 'Standard' },
  { value: VehicleStructureType.ENDO_STEEL, label: 'Endo-Steel (0.5x)' },
  { value: VehicleStructureType.COMPOSITE, label: 'Composite (0.5x)' },
];
