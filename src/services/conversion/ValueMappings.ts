/**
 * Value Mappings for Unit Conversion
 * 
 * Maps string values from MegaMekLab JSON format to typed enums.
 * 
 * @spec unit-json.plan.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era, getEraForYear } from '@/types/enums/Era';
import { EngineType } from '@/types/construction/EngineType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { GyroType } from '@/types/construction/GyroType';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

// ============================================================================
// TECH BASE MAPPINGS
// ============================================================================

/**
 * Map source tech_base string to TechBase enum
 */
const TECH_BASE_MAP: Record<string, TechBase> = {
  'Inner Sphere': TechBase.INNER_SPHERE,
  'IS': TechBase.INNER_SPHERE,
  'Clan': TechBase.CLAN,
  'Mixed': TechBase.MIXED,
  'Mixed (IS Chassis)': TechBase.MIXED_IS_CHASSIS,
  'Mixed (Clan Chassis)': TechBase.MIXED_CLAN_CHASSIS,
};

export function mapTechBase(source: string): TechBase {
  const normalized = source.trim();
  return TECH_BASE_MAP[normalized] ?? TechBase.INNER_SPHERE;
}

// ============================================================================
// RULES LEVEL MAPPINGS
// ============================================================================

/**
 * Map source rules_level to RulesLevel enum
 * MegaMekLab uses "1", "2", "3", "4" or string names
 */
const RULES_LEVEL_MAP: Record<string, RulesLevel> = {
  '1': RulesLevel.INTRODUCTORY,
  '2': RulesLevel.STANDARD,
  '3': RulesLevel.ADVANCED,
  '4': RulesLevel.EXPERIMENTAL,
  'Introductory': RulesLevel.INTRODUCTORY,
  'Standard': RulesLevel.STANDARD,
  'Advanced': RulesLevel.ADVANCED,
  'Experimental': RulesLevel.EXPERIMENTAL,
};

export function mapRulesLevel(source: string | number): RulesLevel {
  const key = String(source).trim();
  return RULES_LEVEL_MAP[key] ?? RulesLevel.STANDARD;
}

// ============================================================================
// ERA MAPPINGS
// ============================================================================

/**
 * Map source era (year number or string) to Era enum
 */
export function mapEra(source: string | number): Era {
  if (typeof source === 'number') {
    return getEraForYear(source);
  }
  
  // Try to parse as year
  const year = parseInt(source, 10);
  if (!isNaN(year)) {
    return getEraForYear(year);
  }
  
  // Try to match era name
  const eraMap: Record<string, Era> = {
    'Age of War': Era.AGE_OF_WAR,
    'Star League': Era.STAR_LEAGUE,
    'Succession Wars': Era.SUCCESSION_WARS,
    'Clan Invasion': Era.CLAN_INVASION,
    'Civil War': Era.CIVIL_WAR,
    'Jihad': Era.CIVIL_WAR, // Jihad is within Civil War era
    'Dark Age': Era.DARK_AGE,
    'ilClan': Era.ILCLAN,
  };
  
  return eraMap[source] ?? Era.SUCCESSION_WARS;
}

/**
 * Extract year from era value (if numeric) or estimate from era name
 */
export function extractYear(source: string | number): number {
  if (typeof source === 'number') {
    return source;
  }
  
  const year = parseInt(source, 10);
  if (!isNaN(year)) {
    return year;
  }
  
  // Default year for named eras
  const yearMap: Record<string, number> = {
    'Age of War': 2400,
    'Star League': 2700,
    'Succession Wars': 2900,
    'Clan Invasion': 3050,
    'Civil War': 3068,
    'Jihad': 3068,
    'Dark Age': 3100,
    'ilClan': 3152,
  };
  
  return yearMap[source] ?? 3025;
}

// ============================================================================
// ENGINE TYPE MAPPINGS
// ============================================================================

/**
 * Map source engine type string to EngineType enum
 */
const ENGINE_TYPE_MAP: Record<string, EngineType> = {
  // Standard fusion variants
  'Fusion Engine': EngineType.STANDARD,
  'Fusion': EngineType.STANDARD,
  'Standard': EngineType.STANDARD,
  'Standard Engine': EngineType.STANDARD,
  
  // XL variants - Inner Sphere
  'XL Engine': EngineType.XL_IS,
  'XL': EngineType.XL_IS,
  'XL (IS) Engine': EngineType.XL_IS,
  'Extra-Light Engine': EngineType.XL_IS,
  
  // XL variants - Clan
  'XL (Clan) Engine': EngineType.XL_CLAN,
  'Clan XL Engine': EngineType.XL_CLAN,
  'Clan XL': EngineType.XL_CLAN,
  
  // Light Engine
  'Light Engine': EngineType.LIGHT,
  'Light': EngineType.LIGHT,
  'Light Fusion Engine': EngineType.LIGHT,
  
  // XXL Engine
  'XXL Engine': EngineType.XXL,
  'XXL': EngineType.XXL,
  
  // Compact Engine
  'Compact Engine': EngineType.COMPACT,
  'Compact': EngineType.COMPACT,
  'Compact Fusion Engine': EngineType.COMPACT,
  
  // ICE
  'ICE': EngineType.ICE,
  'I.C.E.': EngineType.ICE,
  'Internal Combustion': EngineType.ICE,
  'Internal Combustion Engine': EngineType.ICE,
  
  // Fuel Cell
  'Fuel Cell': EngineType.FUEL_CELL,
  'Fuel Cell Engine': EngineType.FUEL_CELL,
  
  // Fission
  'Fission': EngineType.FISSION,
  'Fission Engine': EngineType.FISSION,
};

export function mapEngineType(source: string, techBase?: TechBase): EngineType {
  const normalized = source.trim();
  
  // Direct match
  if (ENGINE_TYPE_MAP[normalized]) {
    return ENGINE_TYPE_MAP[normalized];
  }
  
  // Fuzzy matching for XL engines based on tech base
  const lowerSource = normalized.toLowerCase();
  if (lowerSource.includes('xl')) {
    if (lowerSource.includes('clan') || techBase === TechBase.CLAN) {
      return EngineType.XL_CLAN;
    }
    return EngineType.XL_IS;
  }
  
  if (lowerSource.includes('light')) {
    return EngineType.LIGHT;
  }
  
  if (lowerSource.includes('xxl')) {
    return EngineType.XXL;
  }
  
  if (lowerSource.includes('compact')) {
    return EngineType.COMPACT;
  }
  
  if (lowerSource.includes('ice') || lowerSource.includes('combustion')) {
    return EngineType.ICE;
  }
  
  if (lowerSource.includes('fuel cell')) {
    return EngineType.FUEL_CELL;
  }
  
  if (lowerSource.includes('fission')) {
    return EngineType.FISSION;
  }
  
  return EngineType.STANDARD;
}

// ============================================================================
// INTERNAL STRUCTURE TYPE MAPPINGS
// ============================================================================

/**
 * Map source structure type string to InternalStructureType enum
 */
const STRUCTURE_TYPE_MAP: Record<string, InternalStructureType> = {
  // Standard
  'Standard': InternalStructureType.STANDARD,
  'IS Standard': InternalStructureType.STANDARD,
  'Clan Standard': InternalStructureType.STANDARD,
  'Standard Structure': InternalStructureType.STANDARD,
  
  // Endo Steel - IS
  'Endo Steel': InternalStructureType.ENDO_STEEL_IS,
  'IS Endo Steel': InternalStructureType.ENDO_STEEL_IS,
  'Endo-Steel': InternalStructureType.ENDO_STEEL_IS,
  'Endo Steel (IS)': InternalStructureType.ENDO_STEEL_IS,
  
  // Endo Steel - Clan
  'Clan Endo Steel': InternalStructureType.ENDO_STEEL_CLAN,
  'Endo Steel (Clan)': InternalStructureType.ENDO_STEEL_CLAN,
  
  // Endo-Composite
  'Endo-Composite': InternalStructureType.ENDO_COMPOSITE,
  'Endo Composite': InternalStructureType.ENDO_COMPOSITE,
  
  // Reinforced
  'Reinforced': InternalStructureType.REINFORCED,
  'Reinforced Structure': InternalStructureType.REINFORCED,
  
  // Composite
  'Composite': InternalStructureType.COMPOSITE,
  'Composite Structure': InternalStructureType.COMPOSITE,
  
  // Industrial
  'Industrial': InternalStructureType.INDUSTRIAL,
  'Industrial Structure': InternalStructureType.INDUSTRIAL,
};

export function mapStructureType(source: string, techBase?: TechBase): InternalStructureType {
  const normalized = source.trim();
  
  // Direct match
  if (STRUCTURE_TYPE_MAP[normalized]) {
    return STRUCTURE_TYPE_MAP[normalized];
  }
  
  // Fuzzy matching
  const lowerSource = normalized.toLowerCase();
  
  if (lowerSource.includes('endo') && lowerSource.includes('composite')) {
    return InternalStructureType.ENDO_COMPOSITE;
  }
  
  if (lowerSource.includes('endo') || lowerSource.includes('endo-steel')) {
    if (lowerSource.includes('clan') || techBase === TechBase.CLAN) {
      return InternalStructureType.ENDO_STEEL_CLAN;
    }
    return InternalStructureType.ENDO_STEEL_IS;
  }
  
  if (lowerSource.includes('reinforced')) {
    return InternalStructureType.REINFORCED;
  }
  
  if (lowerSource.includes('composite')) {
    return InternalStructureType.COMPOSITE;
  }
  
  if (lowerSource.includes('industrial')) {
    return InternalStructureType.INDUSTRIAL;
  }
  
  return InternalStructureType.STANDARD;
}

// ============================================================================
// HEAT SINK TYPE MAPPINGS
// ============================================================================

/**
 * Map source heat sink type string to HeatSinkType enum
 */
const HEAT_SINK_TYPE_MAP: Record<string, HeatSinkType> = {
  // Single
  'Single': HeatSinkType.SINGLE,
  'Single Heat Sink': HeatSinkType.SINGLE,
  
  // Double - IS
  'Double': HeatSinkType.DOUBLE_IS,
  'Double Heat Sink': HeatSinkType.DOUBLE_IS,
  'Double (IS)': HeatSinkType.DOUBLE_IS,
  'IS Double': HeatSinkType.DOUBLE_IS,
  
  // Double - Clan
  'Double (Clan)': HeatSinkType.DOUBLE_CLAN,
  'Clan Double': HeatSinkType.DOUBLE_CLAN,
  'Clan Double Heat Sink': HeatSinkType.DOUBLE_CLAN,
  
  // Compact
  'Compact': HeatSinkType.COMPACT,
  'Compact Heat Sink': HeatSinkType.COMPACT,
  
  // Laser
  'Laser': HeatSinkType.LASER,
  'Laser Heat Sink': HeatSinkType.LASER,
};

export function mapHeatSinkType(source: string, techBase?: TechBase): HeatSinkType {
  const normalized = source.trim();
  
  // Direct match
  if (HEAT_SINK_TYPE_MAP[normalized]) {
    return HEAT_SINK_TYPE_MAP[normalized];
  }
  
  // Fuzzy matching
  const lowerSource = normalized.toLowerCase();
  
  if (lowerSource.includes('laser')) {
    return HeatSinkType.LASER;
  }
  
  if (lowerSource.includes('compact')) {
    return HeatSinkType.COMPACT;
  }
  
  if (lowerSource.includes('double')) {
    if (lowerSource.includes('clan') || techBase === TechBase.CLAN) {
      return HeatSinkType.DOUBLE_CLAN;
    }
    return HeatSinkType.DOUBLE_IS;
  }
  
  return HeatSinkType.SINGLE;
}

// ============================================================================
// ARMOR TYPE MAPPINGS
// ============================================================================

/**
 * Map source armor type string to ArmorTypeEnum
 */
const ARMOR_TYPE_MAP: Record<string, ArmorTypeEnum> = {
  // Standard
  'Standard': ArmorTypeEnum.STANDARD,
  'Standard Armor': ArmorTypeEnum.STANDARD,
  
  // Ferro-Fibrous - IS
  'Ferro-Fibrous': ArmorTypeEnum.FERRO_FIBROUS_IS,
  'IS Ferro-Fibrous': ArmorTypeEnum.FERRO_FIBROUS_IS,
  'Ferro-Fibrous (IS)': ArmorTypeEnum.FERRO_FIBROUS_IS,
  
  // Ferro-Fibrous - Clan
  'Clan Ferro-Fibrous': ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  'Ferro-Fibrous (Clan)': ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  
  // Light Ferro-Fibrous
  'Light Ferro-Fibrous': ArmorTypeEnum.LIGHT_FERRO,
  'Light Ferro': ArmorTypeEnum.LIGHT_FERRO,
  
  // Heavy Ferro-Fibrous
  'Heavy Ferro-Fibrous': ArmorTypeEnum.HEAVY_FERRO,
  'Heavy Ferro': ArmorTypeEnum.HEAVY_FERRO,
  
  // Stealth
  'Stealth': ArmorTypeEnum.STEALTH,
  'Stealth Armor': ArmorTypeEnum.STEALTH,
  
  // Reactive
  'Reactive': ArmorTypeEnum.REACTIVE,
  'Reactive Armor': ArmorTypeEnum.REACTIVE,
  
  // Reflective
  'Reflective': ArmorTypeEnum.REFLECTIVE,
  'Reflective Armor': ArmorTypeEnum.REFLECTIVE,
  'Laser-Reflective': ArmorTypeEnum.REFLECTIVE,
  
  // Hardened
  'Hardened': ArmorTypeEnum.HARDENED,
  'Hardened Armor': ArmorTypeEnum.HARDENED,
};

export function mapArmorType(source: string, techBase?: TechBase): ArmorTypeEnum {
  const normalized = source.trim();
  
  // Direct match
  if (ARMOR_TYPE_MAP[normalized]) {
    return ARMOR_TYPE_MAP[normalized];
  }
  
  // Fuzzy matching
  const lowerSource = normalized.toLowerCase();
  
  if (lowerSource.includes('stealth')) {
    return ArmorTypeEnum.STEALTH;
  }
  
  if (lowerSource.includes('reactive')) {
    return ArmorTypeEnum.REACTIVE;
  }
  
  if (lowerSource.includes('reflective') || lowerSource.includes('laser-reflective')) {
    return ArmorTypeEnum.REFLECTIVE;
  }
  
  if (lowerSource.includes('hardened')) {
    return ArmorTypeEnum.HARDENED;
  }
  
  if (lowerSource.includes('heavy') && lowerSource.includes('ferro')) {
    return ArmorTypeEnum.HEAVY_FERRO;
  }
  
  if (lowerSource.includes('light') && lowerSource.includes('ferro')) {
    return ArmorTypeEnum.LIGHT_FERRO;
  }
  
  if (lowerSource.includes('ferro')) {
    if (lowerSource.includes('clan') || techBase === TechBase.CLAN) {
      return ArmorTypeEnum.FERRO_FIBROUS_CLAN;
    }
    return ArmorTypeEnum.FERRO_FIBROUS_IS;
  }
  
  return ArmorTypeEnum.STANDARD;
}

// ============================================================================
// GYRO TYPE MAPPINGS
// ============================================================================

/**
 * Map source gyro type string to GyroType enum
 */
const GYRO_TYPE_MAP: Record<string, GyroType> = {
  // Standard
  'Standard': GyroType.STANDARD,
  'Standard Gyro': GyroType.STANDARD,
  
  // Compact
  'Compact': GyroType.COMPACT,
  'Compact Gyro': GyroType.COMPACT,
  
  // Heavy-Duty
  'Heavy Duty': GyroType.HEAVY_DUTY,
  'Heavy-Duty': GyroType.HEAVY_DUTY,
  'Heavy-Duty Gyro': GyroType.HEAVY_DUTY,
  
  // XL
  'XL': GyroType.XL,
  'XL Gyro': GyroType.XL,
  'Extra-Light': GyroType.XL,
  'Extra-Light Gyro': GyroType.XL,
};

export function mapGyroType(source: string): GyroType {
  const normalized = source.trim();
  
  // Direct match
  if (GYRO_TYPE_MAP[normalized]) {
    return GYRO_TYPE_MAP[normalized];
  }
  
  // Fuzzy matching
  const lowerSource = normalized.toLowerCase();
  
  if (lowerSource.includes('compact')) {
    return GyroType.COMPACT;
  }
  
  if (lowerSource.includes('heavy') || lowerSource.includes('duty')) {
    return GyroType.HEAVY_DUTY;
  }
  
  if (lowerSource.includes('xl') || lowerSource.includes('extra-light')) {
    return GyroType.XL;
  }
  
  return GyroType.STANDARD;
}

// ============================================================================
// COCKPIT TYPE MAPPINGS
// ============================================================================

/**
 * Map source cockpit type string to CockpitType enum
 */
const COCKPIT_TYPE_MAP: Record<string, CockpitType> = {
  // Standard
  'Standard': CockpitType.STANDARD,
  'Standard Cockpit': CockpitType.STANDARD,
  
  // Small
  'Small': CockpitType.SMALL,
  'Small Cockpit': CockpitType.SMALL,
  
  // Command Console
  'Command Console': CockpitType.COMMAND_CONSOLE,
  
  // Torso-Mounted
  'Torso-Mounted': CockpitType.TORSO_MOUNTED,
  'Torso Mounted': CockpitType.TORSO_MOUNTED,
  'Torso-Mounted Cockpit': CockpitType.TORSO_MOUNTED,
  
  // Industrial
  'Industrial': CockpitType.INDUSTRIAL,
  'Industrial Cockpit': CockpitType.INDUSTRIAL,
  
  // Primitive
  'Primitive': CockpitType.PRIMITIVE,
  'Primitive Cockpit': CockpitType.PRIMITIVE,
  
  // Superheavy
  'Superheavy': CockpitType.SUPER_HEAVY,
  'Superheavy Cockpit': CockpitType.SUPER_HEAVY,
};

export function mapCockpitType(source: string): CockpitType {
  const normalized = source.trim();
  
  // Direct match
  if (COCKPIT_TYPE_MAP[normalized]) {
    return COCKPIT_TYPE_MAP[normalized];
  }
  
  // Fuzzy matching
  const lowerSource = normalized.toLowerCase();
  
  if (lowerSource.includes('small')) {
    return CockpitType.SMALL;
  }
  
  if (lowerSource.includes('command')) {
    return CockpitType.COMMAND_CONSOLE;
  }
  
  if (lowerSource.includes('torso')) {
    return CockpitType.TORSO_MOUNTED;
  }
  
  if (lowerSource.includes('industrial')) {
    return CockpitType.INDUSTRIAL;
  }
  
  if (lowerSource.includes('primitive')) {
    return CockpitType.PRIMITIVE;
  }
  
  if (lowerSource.includes('superheavy') || lowerSource.includes('super-heavy')) {
    return CockpitType.SUPER_HEAVY;
  }
  
  return CockpitType.STANDARD;
}

// ============================================================================
// MECH CONFIGURATION MAPPINGS
// ============================================================================

/**
 * Map source config string to MechConfiguration enum
 */
const MECH_CONFIG_MAP: Record<string, MechConfiguration> = {
  'Biped': MechConfiguration.BIPED,
  'Biped Omnimech': MechConfiguration.BIPED,
  'Quad': MechConfiguration.QUAD,
  'Quad Omnimech': MechConfiguration.QUAD,
  'Tripod': MechConfiguration.TRIPOD,
  'Tripod Omnimech': MechConfiguration.TRIPOD,
  'LAM': MechConfiguration.LAM,
  'QuadVee': MechConfiguration.QUADVEE,
};

export function mapMechConfiguration(source: string): MechConfiguration {
  const normalized = source.trim();
  
  // Direct match
  if (MECH_CONFIG_MAP[normalized]) {
    return MECH_CONFIG_MAP[normalized];
  }
  
  // Fuzzy matching
  const lowerSource = normalized.toLowerCase();
  
  if (lowerSource.includes('quad') && lowerSource.includes('vee')) {
    return MechConfiguration.QUADVEE;
  }
  
  if (lowerSource.includes('quad')) {
    return MechConfiguration.QUAD;
  }
  
  if (lowerSource.includes('tripod')) {
    return MechConfiguration.TRIPOD;
  }
  
  if (lowerSource.includes('lam')) {
    return MechConfiguration.LAM;
  }
  
  return MechConfiguration.BIPED;
}

/**
 * Detect if config indicates an OmniMech
 */
export function isOmniMechConfig(source: string): boolean {
  const lowerSource = source.toLowerCase();
  return lowerSource.includes('omni') || lowerSource.includes('omnimech');
}

