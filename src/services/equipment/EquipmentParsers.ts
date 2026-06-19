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

const weaponCategoryMap: Readonly<Record<string, WeaponCategory>> = {
  Energy: WeaponCategory.ENERGY,
  Ballistic: WeaponCategory.BALLISTIC,
  Missile: WeaponCategory.MISSILE,
  Physical: WeaponCategory.PHYSICAL,
  Artillery: WeaponCategory.ARTILLERY,
};

const ammoCategoryMap: Readonly<Record<string, AmmoCategory>> = {
  Autocannon: AmmoCategory.AUTOCANNON,
  Gauss: AmmoCategory.GAUSS,
  'Machine Gun': AmmoCategory.MACHINE_GUN,
  LRM: AmmoCategory.LRM,
  SRM: AmmoCategory.SRM,
  MRM: AmmoCategory.MRM,
  ATM: AmmoCategory.ATM,
  NARC: AmmoCategory.NARC,
  Artillery: AmmoCategory.ARTILLERY,
  AMS: AmmoCategory.AMS,
};

const ammoVariantMap: Readonly<Record<string, AmmoVariant>> = {
  Standard: AmmoVariant.STANDARD,
  'Armor-Piercing': AmmoVariant.ARMOR_PIERCING,
  Cluster: AmmoVariant.CLUSTER,
  Precision: AmmoVariant.PRECISION,
  Flechette: AmmoVariant.FLECHETTE,
  Inferno: AmmoVariant.INFERNO,
  Fragmentation: AmmoVariant.FRAGMENTATION,
  Incendiary: AmmoVariant.INCENDIARY,
  Smoke: AmmoVariant.SMOKE,
  Thunder: AmmoVariant.THUNDER,
  Swarm: AmmoVariant.SWARM,
  'Tandem-Charge': AmmoVariant.TANDEM_CHARGE,
  'Extended Range': AmmoVariant.EXTENDED_RANGE,
  'High Explosive': AmmoVariant.HIGH_EXPLOSIVE,
};

const electronicsCategoryMap: Readonly<Record<string, ElectronicsCategory>> = {
  Targeting: ElectronicsCategory.TARGETING,
  ECM: ElectronicsCategory.ECM,
  'Active Probe': ElectronicsCategory.ACTIVE_PROBE,
  'C3 System': ElectronicsCategory.C3,
  TAG: ElectronicsCategory.TAG,
  Communications: ElectronicsCategory.COMMUNICATIONS,
};

const miscEquipmentCategoryMap: Readonly<
  Record<string, MiscEquipmentCategory>
> = {
  'Heat Sink': MiscEquipmentCategory.HEAT_SINK,
  'Jump Jet': MiscEquipmentCategory.JUMP_JET,
  'Movement Enhancement': MiscEquipmentCategory.MOVEMENT,
  Defensive: MiscEquipmentCategory.DEFENSIVE,
  Myomer: MiscEquipmentCategory.MYOMER,
  Industrial: MiscEquipmentCategory.INDUSTRIAL,
};

export function parseWeaponCategory(value: string): WeaponCategory {
  return weaponCategoryMap[value] ?? WeaponCategory.ENERGY;
}

export function parseAmmoCategory(value: string): AmmoCategory {
  return ammoCategoryMap[value] ?? AmmoCategory.AUTOCANNON;
}

export function parseAmmoVariant(value: string): AmmoVariant {
  return ammoVariantMap[value] ?? AmmoVariant.STANDARD;
}

export function parseElectronicsCategory(value: string): ElectronicsCategory {
  return electronicsCategoryMap[value] ?? ElectronicsCategory.TARGETING;
}

export function parseMiscEquipmentCategory(
  value: string,
): MiscEquipmentCategory {
  return miscEquipmentCategoryMap[value] ?? MiscEquipmentCategory.HEAT_SINK;
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
