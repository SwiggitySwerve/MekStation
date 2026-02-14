import { UnitType } from '@/types/unit/BattleMechInterfaces';

export interface IValidatableEquipmentItem {
  readonly id: string;
  readonly equipmentId: string;
  readonly name: string;
  readonly location: string;
  readonly allowedUnitTypes?: readonly UnitType[];
  readonly allowedLocations?: readonly string[];
  readonly flags?: readonly string[];
  readonly isTurretMounted?: boolean;
}

export const DEFAULT_ALLOWED_UNIT_TYPES: readonly UnitType[] = [
  UnitType.BATTLEMECH,
  UnitType.OMNIMECH,
  UnitType.INDUSTRIALMECH,
  UnitType.VEHICLE,
  UnitType.VTOL,
  UnitType.AEROSPACE,
];

export const TURRET_CAPABLE_UNIT_TYPES: readonly UnitType[] = [
  UnitType.VEHICLE,
  UnitType.VTOL,
  UnitType.SUPPORT_VEHICLE,
];

export function isUnitTypeAllowed(
  unitType: UnitType,
  allowedUnitTypes: readonly UnitType[] | undefined,
): boolean {
  const allowed = allowedUnitTypes ?? DEFAULT_ALLOWED_UNIT_TYPES;
  return allowed.includes(unitType);
}
