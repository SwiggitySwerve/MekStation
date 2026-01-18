/**
 * Enum Parser Registry
 * 
 * Provides map-based parsing for BattleTech enum types.
 * Replaces switch statements with extensible registry pattern.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { CockpitType } from '@/types/construction/CockpitType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/enums/Era';
import { MechConfiguration, MechLocation } from '@/types/construction';
import { WeightClass } from '@/types/enums/WeightClass';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Parser function type - takes string input, returns typed enum value
 */
type EnumParser<T> = (value: string) => T;

/**
 * Registry for enum parsers
 */
interface IEnumParserRegistry {
  parseEngineType(value: string): EngineType;
  parseGyroType(value: string): GyroType;
  parseCockpitType(value: string): CockpitType;
  parseStructureType(value: string): InternalStructureType;
  parseArmorType(value: string): ArmorTypeEnum;
  parseHeatSinkType(value: string): HeatSinkType;
  parseTechBase(value: string): TechBase;
  parseRulesLevel(value: string): RulesLevel;
  parseEra(value: string): Era;
  parseMechConfiguration(value: string): MechConfiguration;
  parseMechLocation(value: string): MechLocation;
  getWeightClass(tonnage: number): WeightClass;
}

// =============================================================================
// Parsing Maps (Open for extension via registration)
// =============================================================================

/**
 * Engine type string to enum mapping
 * Supports multiple aliases for each engine type
 */
const ENGINE_TYPE_MAP = new Map<string, EngineType>([
  // Standard/Fusion
  ['FUSION', EngineType.STANDARD],
  ['STANDARD', EngineType.STANDARD],
  
  // XL variants
  ['XL', EngineType.XL_IS],
  ['XL_IS', EngineType.XL_IS],
  ['CLAN_XL', EngineType.XL_CLAN],
  ['XL_CLAN', EngineType.XL_CLAN],
  
  // Other types
  ['LIGHT', EngineType.LIGHT],
  ['COMPACT', EngineType.COMPACT],
  ['XXL', EngineType.XXL],
  ['ICE', EngineType.ICE],
  ['FUEL_CELL', EngineType.FUEL_CELL],
  ['FISSION', EngineType.FISSION],
]);

/**
 * Gyro type string to enum mapping
 */
const GYRO_TYPE_MAP = new Map<string, GyroType>([
  ['STANDARD', GyroType.STANDARD],
  ['XL', GyroType.XL],
  ['COMPACT', GyroType.COMPACT],
  ['HEAVY_DUTY', GyroType.HEAVY_DUTY],
  ['HEAVY-DUTY', GyroType.HEAVY_DUTY],
]);

/**
 * Cockpit type string to enum mapping
 */
const COCKPIT_TYPE_MAP = new Map<string, CockpitType>([
  ['STANDARD', CockpitType.STANDARD],
  ['SMALL', CockpitType.SMALL],
  ['COMMAND_CONSOLE', CockpitType.COMMAND_CONSOLE],
  ['COMMAND-CONSOLE', CockpitType.COMMAND_CONSOLE],
  ['TORSO_MOUNTED', CockpitType.TORSO_MOUNTED],
  ['TORSO-MOUNTED', CockpitType.TORSO_MOUNTED],
  ['PRIMITIVE', CockpitType.PRIMITIVE],
  ['INDUSTRIAL', CockpitType.INDUSTRIAL],
]);

/**
 * Structure type string to enum mapping
 */
const STRUCTURE_TYPE_MAP = new Map<string, InternalStructureType>([
  ['STANDARD', InternalStructureType.STANDARD],
  ['ENDO_STEEL', InternalStructureType.ENDO_STEEL_IS],
  ['ENDO_STEEL_IS', InternalStructureType.ENDO_STEEL_IS],
  ['ENDO-STEEL', InternalStructureType.ENDO_STEEL_IS],
  ['ENDO_STEEL_CLAN', InternalStructureType.ENDO_STEEL_CLAN],
  ['ENDO-STEEL-CLAN', InternalStructureType.ENDO_STEEL_CLAN],
  ['ENDO_COMPOSITE', InternalStructureType.ENDO_COMPOSITE],
  ['ENDO-COMPOSITE', InternalStructureType.ENDO_COMPOSITE],
  ['REINFORCED', InternalStructureType.REINFORCED],
  ['COMPOSITE', InternalStructureType.COMPOSITE],
  ['INDUSTRIAL', InternalStructureType.INDUSTRIAL],
]);

/**
 * Armor type string to enum mapping
 */
const ARMOR_TYPE_MAP = new Map<string, ArmorTypeEnum>([
  ['STANDARD', ArmorTypeEnum.STANDARD],
  ['FERRO_FIBROUS', ArmorTypeEnum.FERRO_FIBROUS_IS],
  ['FERRO_FIBROUS_IS', ArmorTypeEnum.FERRO_FIBROUS_IS],
  ['FERRO-FIBROUS', ArmorTypeEnum.FERRO_FIBROUS_IS],
  ['FERRO_FIBROUS_CLAN', ArmorTypeEnum.FERRO_FIBROUS_CLAN],
  ['FERRO-FIBROUS-CLAN', ArmorTypeEnum.FERRO_FIBROUS_CLAN],
  ['LIGHT_FERRO_FIBROUS', ArmorTypeEnum.LIGHT_FERRO],
  ['LIGHT_FERRO', ArmorTypeEnum.LIGHT_FERRO],
  ['LIGHT-FERRO', ArmorTypeEnum.LIGHT_FERRO],
  ['HEAVY_FERRO_FIBROUS', ArmorTypeEnum.HEAVY_FERRO],
  ['HEAVY_FERRO', ArmorTypeEnum.HEAVY_FERRO],
  ['HEAVY-FERRO', ArmorTypeEnum.HEAVY_FERRO],
  ['STEALTH', ArmorTypeEnum.STEALTH],
  ['REACTIVE', ArmorTypeEnum.REACTIVE],
  ['REFLECTIVE', ArmorTypeEnum.REFLECTIVE],
  ['HARDENED', ArmorTypeEnum.HARDENED],
]);

/**
 * Heat sink type string to enum mapping
 */
const HEAT_SINK_TYPE_MAP = new Map<string, HeatSinkType>([
  ['SINGLE', HeatSinkType.SINGLE],
  ['DOUBLE', HeatSinkType.DOUBLE_IS],
  ['DOUBLE_IS', HeatSinkType.DOUBLE_IS],
  ['DOUBLE-IS', HeatSinkType.DOUBLE_IS],
  ['DOUBLE_CLAN', HeatSinkType.DOUBLE_CLAN],
  ['DOUBLE-CLAN', HeatSinkType.DOUBLE_CLAN],
  ['COMPACT', HeatSinkType.COMPACT],
  ['LASER', HeatSinkType.LASER],
]);

/**
 * Tech base string to enum mapping
 * Per spec VAL-ENUM-004: Components must have binary tech base (IS or Clan)
 */
const TECH_BASE_MAP = new Map<string, TechBase>([
  ['CLAN', TechBase.CLAN],
  ['INNER_SPHERE', TechBase.INNER_SPHERE],
  ['INNER-SPHERE', TechBase.INNER_SPHERE],
  ['IS', TechBase.INNER_SPHERE],
  // MIXED/BOTH default to IS per spec
  ['BOTH', TechBase.INNER_SPHERE],
  ['MIXED', TechBase.INNER_SPHERE],
]);

/**
 * Rules level string to enum mapping
 */
const RULES_LEVEL_MAP = new Map<string, RulesLevel>([
  ['INTRODUCTORY', RulesLevel.INTRODUCTORY],
  ['STANDARD', RulesLevel.STANDARD],
  ['ADVANCED', RulesLevel.ADVANCED],
  ['EXPERIMENTAL', RulesLevel.EXPERIMENTAL],
  ['UNOFFICIAL', RulesLevel.EXPERIMENTAL],
]);

/**
 * Era string to enum mapping
 */
const ERA_MAP = new Map<string, Era>([
  ['AGE_OF_WAR', Era.AGE_OF_WAR],
  ['AGE-OF-WAR', Era.AGE_OF_WAR],
  ['STAR_LEAGUE', Era.STAR_LEAGUE],
  ['STAR-LEAGUE', Era.STAR_LEAGUE],
  ['EARLY_SUCCESSION_WARS', Era.EARLY_SUCCESSION_WARS],
  ['EARLY-SUCCESSION-WARS', Era.EARLY_SUCCESSION_WARS],
  ['LATE_SUCCESSION_WARS', Era.LATE_SUCCESSION_WARS],
  ['LATE-SUCCESSION-WARS', Era.LATE_SUCCESSION_WARS],
  ['SUCCESSION_WARS', Era.LATE_SUCCESSION_WARS],
  ['RENAISSANCE', Era.RENAISSANCE],
  ['CLAN_INVASION', Era.CLAN_INVASION],
  ['CLAN-INVASION', Era.CLAN_INVASION],
  ['CIVIL_WAR', Era.CIVIL_WAR],
  ['CIVIL-WAR', Era.CIVIL_WAR],
  ['JIHAD', Era.JIHAD],
  ['DARK_AGE', Era.DARK_AGE],
  ['DARK-AGE', Era.DARK_AGE],
  ['ILCLAN', Era.IL_CLAN],
  ['IL_CLAN', Era.IL_CLAN],
  ['IL-CLAN', Era.IL_CLAN],
]);

/**
 * Mech configuration string to enum mapping
 */
const MECH_CONFIGURATION_MAP = new Map<string, MechConfiguration>([
  ['BIPED', MechConfiguration.BIPED],
  ['QUAD', MechConfiguration.QUAD],
  ['TRIPOD', MechConfiguration.TRIPOD],
  ['LAM', MechConfiguration.LAM],
  ['QUADVEE', MechConfiguration.QUADVEE],
]);

/**
 * Mech location string to enum mapping
 */
const MECH_LOCATION_MAP = new Map<string, MechLocation>([
  ['HEAD', MechLocation.HEAD],
  ['CENTER_TORSO', MechLocation.CENTER_TORSO],
  ['CENTER-TORSO', MechLocation.CENTER_TORSO],
  ['CT', MechLocation.CENTER_TORSO],
  ['LEFT_TORSO', MechLocation.LEFT_TORSO],
  ['LEFT-TORSO', MechLocation.LEFT_TORSO],
  ['LT', MechLocation.LEFT_TORSO],
  ['RIGHT_TORSO', MechLocation.RIGHT_TORSO],
  ['RIGHT-TORSO', MechLocation.RIGHT_TORSO],
  ['RT', MechLocation.RIGHT_TORSO],
  ['LEFT_ARM', MechLocation.LEFT_ARM],
  ['LEFT-ARM', MechLocation.LEFT_ARM],
  ['LA', MechLocation.LEFT_ARM],
  ['RIGHT_ARM', MechLocation.RIGHT_ARM],
  ['RIGHT-ARM', MechLocation.RIGHT_ARM],
  ['RA', MechLocation.RIGHT_ARM],
  ['LEFT_LEG', MechLocation.LEFT_LEG],
  ['LEFT-LEG', MechLocation.LEFT_LEG],
  ['LL', MechLocation.LEFT_LEG],
  ['RIGHT_LEG', MechLocation.RIGHT_LEG],
  ['RIGHT-LEG', MechLocation.RIGHT_LEG],
  ['RL', MechLocation.RIGHT_LEG],
]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generic map-based parser with default value
 */
function parseFromMap<T>(
  value: string, 
  map: Map<string, T>, 
  defaultValue: T
): T {
  const normalized = value.toUpperCase().trim();
  return map.get(normalized) ?? defaultValue;
}

// =============================================================================
// Registry Implementation
// =============================================================================

/**
 * Enum Parser Registry implementation
 * Uses map-based lookups instead of switch statements (OCP compliant)
 */
class EnumParserRegistryImpl implements IEnumParserRegistry {
  
  parseEngineType(value: string): EngineType {
    return parseFromMap(value, ENGINE_TYPE_MAP, EngineType.STANDARD);
  }
  
  parseGyroType(value: string): GyroType {
    return parseFromMap(value, GYRO_TYPE_MAP, GyroType.STANDARD);
  }
  
  parseCockpitType(value: string): CockpitType {
    return parseFromMap(value, COCKPIT_TYPE_MAP, CockpitType.STANDARD);
  }
  
  parseStructureType(value: string): InternalStructureType {
    return parseFromMap(value, STRUCTURE_TYPE_MAP, InternalStructureType.STANDARD);
  }
  
  parseArmorType(value: string): ArmorTypeEnum {
    return parseFromMap(value, ARMOR_TYPE_MAP, ArmorTypeEnum.STANDARD);
  }
  
  parseHeatSinkType(value: string): HeatSinkType {
    return parseFromMap(value, HEAT_SINK_TYPE_MAP, HeatSinkType.SINGLE);
  }
  
  parseTechBase(value: string): TechBase {
    return parseFromMap(value, TECH_BASE_MAP, TechBase.INNER_SPHERE);
  }
  
  parseRulesLevel(value: string): RulesLevel {
    return parseFromMap(value, RULES_LEVEL_MAP, RulesLevel.STANDARD);
  }
  
  parseEra(value: string): Era {
    return parseFromMap(value, ERA_MAP, Era.LATE_SUCCESSION_WARS);
  }
  
  parseMechConfiguration(value: string): MechConfiguration {
    // Handle PascalCase input (e.g., "Biped" -> "BIPED")
    return parseFromMap(value, MECH_CONFIGURATION_MAP, MechConfiguration.BIPED);
  }
  
  parseMechLocation(value: string): MechLocation {
    return parseFromMap(value, MECH_LOCATION_MAP, MechLocation.CENTER_TORSO);
  }
  
  getWeightClass(tonnage: number): WeightClass {
    if (tonnage <= 35) return WeightClass.LIGHT;
    if (tonnage <= 55) return WeightClass.MEDIUM;
    if (tonnage <= 75) return WeightClass.HEAVY;
    return WeightClass.ASSAULT;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

let _instance: EnumParserRegistryImpl | null = null;

/**
 * Get the singleton EnumParserRegistry instance
 */
export function getEnumParserRegistry(): IEnumParserRegistry {
  if (!_instance) {
    _instance = new EnumParserRegistryImpl();
  }
  return _instance;
}

/**
 * Reset the singleton instance (for testing)
 * @internal
 */
export function _resetEnumParserRegistry(): void {
  _instance = null;
}

// =============================================================================
// Convenience Exports (direct parser functions)
// =============================================================================

export const parseEngineType = (value: string): EngineType => 
  getEnumParserRegistry().parseEngineType(value);

export const parseGyroType = (value: string): GyroType => 
  getEnumParserRegistry().parseGyroType(value);

export const parseCockpitType = (value: string): CockpitType => 
  getEnumParserRegistry().parseCockpitType(value);

export const parseStructureType = (value: string): InternalStructureType => 
  getEnumParserRegistry().parseStructureType(value);

export const parseArmorType = (value: string): ArmorTypeEnum => 
  getEnumParserRegistry().parseArmorType(value);

export const parseHeatSinkType = (value: string): HeatSinkType => 
  getEnumParserRegistry().parseHeatSinkType(value);

export const parseTechBase = (value: string): TechBase => 
  getEnumParserRegistry().parseTechBase(value);

export const parseRulesLevel = (value: string): RulesLevel => 
  getEnumParserRegistry().parseRulesLevel(value);

export const parseEra = (value: string): Era => 
  getEnumParserRegistry().parseEra(value);

export const parseMechConfiguration = (value: string): MechConfiguration => 
  getEnumParserRegistry().parseMechConfiguration(value);

export const parseMechLocation = (value: string): MechLocation => 
  getEnumParserRegistry().parseMechLocation(value);

export const getWeightClass = (tonnage: number): WeightClass => 
  getEnumParserRegistry().getWeightClass(tonnage);

// Export types
export type { IEnumParserRegistry, EnumParser };
