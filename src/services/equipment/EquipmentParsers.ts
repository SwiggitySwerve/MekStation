import {
  parseTechBase as parseEnumTechBase,
  parseRulesLevel as parseEnumRulesLevel,
} from '@/services/units/EnumParserRegistry';
import { EquipmentBehaviorFlag } from '@/types/enums/EquipmentFlag';
import { AmmoCategory, AmmoVariant } from '@/types/equipment/AmmunitionTypes';
import { ElectronicsCategory } from '@/types/equipment/ElectronicsTypes';
import { MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export const parseTechBase = parseEnumTechBase;
export const parseRulesLevel = parseEnumRulesLevel;

const unitTypeMap: Record<string, UnitType> = {
  BATTLEMECH: UnitType.BATTLEMECH,
  OMNIMECH: UnitType.OMNIMECH,
  INDUSTRIALMECH: UnitType.INDUSTRIALMECH,
  PROTOMECH: UnitType.PROTOMECH,
  VEHICLE: UnitType.VEHICLE,
  VTOL: UnitType.VTOL,
  AEROSPACE: UnitType.AEROSPACE,
  CONVENTIONAL_FIGHTER: UnitType.CONVENTIONAL_FIGHTER,
  SMALL_CRAFT: UnitType.SMALL_CRAFT,
  DROPSHIP: UnitType.DROPSHIP,
  JUMPSHIP: UnitType.JUMPSHIP,
  WARSHIP: UnitType.WARSHIP,
  SPACE_STATION: UnitType.SPACE_STATION,
  INFANTRY: UnitType.INFANTRY,
  BATTLE_ARMOR: UnitType.BATTLE_ARMOR,
  SUPPORT_VEHICLE: UnitType.SUPPORT_VEHICLE,
  MECH: UnitType.BATTLEMECH,
  MECH_EQUIPMENT: UnitType.BATTLEMECH,
  TANK: UnitType.VEHICLE,
  VEHICLE_EQUIPMENT: UnitType.VEHICLE,
  VTOL_EQUIPMENT: UnitType.VTOL,
  FIGHTER: UnitType.AEROSPACE,
  FIGHTER_EQUIPMENT: UnitType.AEROSPACE,
  ASF: UnitType.AEROSPACE,
  SUPPORT: UnitType.SUPPORT_VEHICLE,
  SUPPORT_VEHICLE_EQUIPMENT: UnitType.SUPPORT_VEHICLE,
  BA: UnitType.BATTLE_ARMOR,
  BA_EQUIPMENT: UnitType.BATTLE_ARMOR,
  INF: UnitType.INFANTRY,
  INF_EQUIPMENT: UnitType.INFANTRY,
  PROTO: UnitType.PROTOMECH,
  PROTO_EQUIPMENT: UnitType.PROTOMECH,
  SC: UnitType.SMALL_CRAFT,
  SC_EQUIPMENT: UnitType.SMALL_CRAFT,
  DS: UnitType.DROPSHIP,
  DS_EQUIPMENT: UnitType.DROPSHIP,
  JS: UnitType.JUMPSHIP,
  JS_EQUIPMENT: UnitType.JUMPSHIP,
  WS: UnitType.WARSHIP,
  WS_EQUIPMENT: UnitType.WARSHIP,
  SS: UnitType.SPACE_STATION,
  SS_EQUIPMENT: UnitType.SPACE_STATION,
};

export function parseWeaponCategory(value: string): WeaponCategory {
  switch (value) {
    case 'Energy':
      return WeaponCategory.ENERGY;
    case 'Ballistic':
      return WeaponCategory.BALLISTIC;
    case 'Missile':
      return WeaponCategory.MISSILE;
    case 'Physical':
      return WeaponCategory.PHYSICAL;
    case 'Artillery':
      return WeaponCategory.ARTILLERY;
    default:
      return WeaponCategory.ENERGY;
  }
}

export function parseAmmoCategory(value: string): AmmoCategory {
  switch (value) {
    case 'Autocannon':
      return AmmoCategory.AUTOCANNON;
    case 'Gauss':
      return AmmoCategory.GAUSS;
    case 'Machine Gun':
      return AmmoCategory.MACHINE_GUN;
    case 'LRM':
      return AmmoCategory.LRM;
    case 'SRM':
      return AmmoCategory.SRM;
    case 'MRM':
      return AmmoCategory.MRM;
    case 'ATM':
      return AmmoCategory.ATM;
    case 'NARC':
      return AmmoCategory.NARC;
    case 'Artillery':
      return AmmoCategory.ARTILLERY;
    case 'AMS':
      return AmmoCategory.AMS;
    default:
      return AmmoCategory.AUTOCANNON;
  }
}

export function parseAmmoVariant(value: string): AmmoVariant {
  switch (value) {
    case 'Standard':
      return AmmoVariant.STANDARD;
    case 'Armor-Piercing':
      return AmmoVariant.ARMOR_PIERCING;
    case 'Cluster':
      return AmmoVariant.CLUSTER;
    case 'Precision':
      return AmmoVariant.PRECISION;
    case 'Flechette':
      return AmmoVariant.FLECHETTE;
    case 'Inferno':
      return AmmoVariant.INFERNO;
    case 'Fragmentation':
      return AmmoVariant.FRAGMENTATION;
    case 'Incendiary':
      return AmmoVariant.INCENDIARY;
    case 'Smoke':
      return AmmoVariant.SMOKE;
    case 'Thunder':
      return AmmoVariant.THUNDER;
    case 'Swarm':
      return AmmoVariant.SWARM;
    case 'Tandem-Charge':
      return AmmoVariant.TANDEM_CHARGE;
    case 'Extended Range':
      return AmmoVariant.EXTENDED_RANGE;
    case 'High Explosive':
      return AmmoVariant.HIGH_EXPLOSIVE;
    default:
      return AmmoVariant.STANDARD;
  }
}

export function parseElectronicsCategory(value: string): ElectronicsCategory {
  switch (value) {
    case 'Targeting':
      return ElectronicsCategory.TARGETING;
    case 'ECM':
      return ElectronicsCategory.ECM;
    case 'Active Probe':
      return ElectronicsCategory.ACTIVE_PROBE;
    case 'C3 System':
      return ElectronicsCategory.C3;
    case 'TAG':
      return ElectronicsCategory.TAG;
    case 'Communications':
      return ElectronicsCategory.COMMUNICATIONS;
    default:
      return ElectronicsCategory.TARGETING;
  }
}

export function parseMiscEquipmentCategory(
  value: string,
): MiscEquipmentCategory {
  switch (value) {
    case 'Heat Sink':
      return MiscEquipmentCategory.HEAT_SINK;
    case 'Jump Jet':
      return MiscEquipmentCategory.JUMP_JET;
    case 'Movement Enhancement':
      return MiscEquipmentCategory.MOVEMENT;
    case 'Defensive':
      return MiscEquipmentCategory.DEFENSIVE;
    case 'Myomer':
      return MiscEquipmentCategory.MYOMER;
    case 'Industrial':
      return MiscEquipmentCategory.INDUSTRIAL;
    default:
      return MiscEquipmentCategory.HEAT_SINK;
  }
}

export function parseUnitType(value: string): UnitType | undefined {
  const normalized = value.toUpperCase().replace(/-/g, '_').replace(/ /g, '_');
  return unitTypeMap[normalized];
}

export function parseBehaviorFlag(
  value: string,
): EquipmentBehaviorFlag | undefined {
  const normalized = value.toUpperCase().replace(/-/g, '_');
  const flagValues = Object.values(EquipmentBehaviorFlag);
  if (flagValues.includes(normalized as EquipmentBehaviorFlag)) {
    return normalized as EquipmentBehaviorFlag;
  }
  return undefined;
}

export function parseFlags(
  flags: string[] | undefined,
): EquipmentBehaviorFlag[] {
  if (!flags) return [];

  const result: EquipmentBehaviorFlag[] = [];
  for (const flag of flags) {
    const behaviorFlag = parseBehaviorFlag(flag);
    if (behaviorFlag) {
      result.push(behaviorFlag);
    }
  }
  return result;
}

export function parseAllowedUnitTypes(types: string[] | undefined): UnitType[] {
  if (!types) return [];

  const result: UnitType[] = [];
  for (const type of types) {
    const unitType = parseUnitType(type);
    if (unitType) {
      result.push(unitType);
    }
  }
  return result;
}
