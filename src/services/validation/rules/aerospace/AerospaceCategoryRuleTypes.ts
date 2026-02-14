import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';

export interface IAerospaceUnit extends IValidatableUnit {
  engine?: { type: string; rating: number };
  thrust?: number;
  structuralIntegrity?: number;
  fuelCapacity?: number;
}

export interface IAerospaceUnitExtended extends IAerospaceUnit {
  maxFuelCapacity?: number;
  weapons?: Array<{
    id: string;
    name: string;
    arc?: 'nose' | 'left-wing' | 'right-wing' | 'aft';
    isRearMounting?: boolean;
  }>;
}

export const AEROSPACE_UNIT_TYPES: readonly UnitType[] = [
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
  UnitType.SMALL_CRAFT,
  UnitType.DROPSHIP,
  UnitType.JUMPSHIP,
  UnitType.WARSHIP,
  UnitType.SPACE_STATION,
];

export const THRUST_REQUIRED_TYPES: readonly UnitType[] = [
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
];

export const MIN_THRUST_WEIGHT_RATIO: Record<string, number> = {
  [UnitType.AEROSPACE]: 0.1,
  [UnitType.CONVENTIONAL_FIGHTER]: 0.1,
};

export const MAX_REAR_WEAPONS_BY_TONNAGE: Array<{
  maxTonnage: number;
  maxWeapons: number;
}> = [
  { maxTonnage: 50, maxWeapons: 1 },
  { maxTonnage: 75, maxWeapons: 2 },
  { maxTonnage: 100, maxWeapons: 3 },
];

export const AEROSPACE_WEAPON_ARCS = [
  'nose',
  'left-wing',
  'right-wing',
  'aft',
] as const;

export function isAerospaceUnit(
  unit: IValidatableUnit,
): unit is IAerospaceUnit {
  return AEROSPACE_UNIT_TYPES.includes(unit.unitType);
}

export function isAerospaceUnitExtended(
  unit: IValidatableUnit,
): unit is IAerospaceUnitExtended {
  return AEROSPACE_UNIT_TYPES.includes(unit.unitType);
}
