/**
 * Unit Format Converter Service
 * 
 * Converts MegaMekLab JSON format to the internal typed format.
 * 
 * @spec unit-json.plan.md
 */

import { v4 as uuidv4 } from 'uuid';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { WeightClass, getWeightClass } from '@/types/enums/WeightClass';
import { EngineType } from '@/types/construction/EngineType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { GyroType } from '@/types/construction/GyroType';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { IArmorAllocation } from '@/types/construction/ComponentInterfaces';
import {
  UnitType,
  MechConfiguration,
  IUnitMetadata,
  IEngineConfiguration,
  IGyroConfiguration,
  IStructureConfiguration,
  IHeatSinkConfiguration,
  IMovementConfiguration,
  IMountedEquipment,
  ICriticalSlotAssignment,
  ICriticalSlot,
  IBattleMech,
  IOmniMech,
} from '@/types/unit/BattleMechInterfaces';
import {
  ISerializedUnit,
  ISerializedFluff,
} from '@/types/unit/UnitSerialization';

import {
  mapTechBase,
  mapRulesLevel,
  mapEra,
  extractYear,
  mapEngineType,
  mapStructureType,
  mapHeatSinkType,
  mapArmorType,
  mapGyroType,
  mapMechConfiguration,
  isOmniMechConfig,
} from './ValueMappings';

import {
  parseLocation,
  convertArmorLocations,
  calculateTotalArmor,
  parseCriticalSlots,
  SourceArmorLocation,
  SourceCriticalEntry,
  ParsedCriticalSlots,
  BIPED_SLOT_COUNTS,
} from './LocationMappings';

import {
  equipmentNameResolver,
  EquipmentResolution,
} from './EquipmentNameResolver';

// ============================================================================
// SOURCE DATA TYPES
// ============================================================================

/**
 * MegaMekLab source unit format
 */
export interface MegaMekLabUnit {
  chassis: string;
  model: string;
  mul_id: string | number;
  config: string;
  tech_base: string;
  era: string | number;
  source: string;
  rules_level: string | number;
  role?: string;
  mass: number;
  
  engine: {
    type: string;
    rating: number;
    manufacturer?: string;
  };
  
  structure: {
    type: string;
    manufacturer?: string | null;
  };
  
  myomer?: {
    type: string;
    manufacturer?: string | null;
  };
  
  heat_sinks: {
    type: string;
    count: number;
  };
  
  walk_mp: string | number;
  jump_mp: string | number;
  
  armor: {
    type: string;
    manufacturer?: string;
    locations: SourceArmorLocation[];
    total_armor_points?: number;
  };
  
  weapons_and_equipment: MegaMekLabEquipmentItem[];
  criticals: SourceCriticalEntry[];
  
  quirks?: string[];
  manufacturers?: MegaMekLabManufacturer[];
  system_manufacturers?: MegaMekLabSystemManufacturer[];
  fluff_text?: MegaMekLabFluff;
  
  // OmniMech specific
  is_omnimech?: boolean;
  omnimech_base_chassis?: string;
  omnimech_configuration?: string;
  base_chassis_heat_sinks?: string | number;
  
  // Clan alternate name
  clanname?: string;
}

/**
 * MegaMekLab equipment item format
 */
export interface MegaMekLabEquipmentItem {
  item_name: string;
  location: string;
  item_type: string;
  tech_base: string;
  is_omnipod?: boolean;
  rear_facing?: boolean;
  turret_mounted?: boolean;
}

/**
 * MegaMekLab manufacturer info
 */
export interface MegaMekLabManufacturer {
  name: string;
  location?: string;
}

/**
 * MegaMekLab system manufacturer info
 */
export interface MegaMekLabSystemManufacturer {
  type: string;
  name: string;
}

/**
 * MegaMekLab fluff text
 */
export interface MegaMekLabFluff {
  overview?: string;
  capabilities?: string;
  deployment?: string;
  history?: string;
  notes?: string;
}

// ============================================================================
// CONVERSION RESULT TYPES
// ============================================================================

/**
 * Conversion warning
 */
export interface ConversionWarning {
  readonly field: string;
  readonly message: string;
  readonly sourceValue?: unknown;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  readonly success: boolean;
  readonly unit: ISerializedUnit | null;
  readonly warnings: ConversionWarning[];
  readonly errors: string[];
}

/**
 * Batch conversion result
 */
export interface BatchConversionResult {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly results: ConversionResult[];
}

// ============================================================================
// UNIT FORMAT CONVERTER
// ============================================================================

/**
 * Unit Format Converter
 * 
 * Converts MegaMekLab JSON format to internal serialized format.
 */
export class UnitFormatConverter {
  private warnings: ConversionWarning[] = [];
  private errors: string[] = [];
  
  /**
   * Convert a MegaMekLab unit to serialized format
   */
  convert(source: MegaMekLabUnit): ConversionResult {
    this.warnings = [];
    this.errors = [];
    
    try {
      const unit = this.convertUnit(source);
      
      return {
        success: true,
        unit,
        warnings: this.warnings,
        errors: this.errors,
      };
    } catch (error) {
      return {
        success: false,
        unit: null,
        warnings: this.warnings,
        errors: [...this.errors, error instanceof Error ? error.message : String(error)],
      };
    }
  }
  
  /**
   * Convert a batch of units
   */
  convertBatch(sources: MegaMekLabUnit[]): BatchConversionResult {
    const results: ConversionResult[] = [];
    let successful = 0;
    let failed = 0;
    
    for (const source of sources) {
      const result = this.convert(source);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }
    
    return {
      total: sources.length,
      successful,
      failed,
      results,
    };
  }
  
  /**
   * Main conversion logic
   */
  private convertUnit(source: MegaMekLabUnit): ISerializedUnit {
    // Generate unique ID
    const id = this.generateUnitId(source);
    
    // Convert tech base
    const techBase = mapTechBase(source.tech_base);
    
    // Convert era and year
    const era = mapEra(source.era);
    const year = extractYear(source.era);
    
    // Convert rules level
    const rulesLevel = mapRulesLevel(source.rules_level);
    
    // Convert configuration
    const configuration = mapMechConfiguration(source.config);
    const isOmni = isOmniMechConfig(source.config) || source.is_omnimech === true;
    
    // Convert engine
    const engine = this.convertEngine(source.engine, techBase);
    
    // Convert gyro (defaults to standard - source doesn't always specify)
    const gyro = this.convertGyro(source, techBase);
    
    // Convert cockpit (defaults to standard - source doesn't always specify)
    const cockpit = this.convertCockpit(source);
    
    // Convert structure
    const structure = this.convertStructure(source.structure, techBase);
    
    // Convert armor
    const armor = this.convertArmor(source.armor, techBase);
    
    // Convert heat sinks
    const heatSinks = this.convertHeatSinks(source.heat_sinks, source.engine.rating, techBase);
    
    // Convert movement
    const movement = this.convertMovement(source);
    
    // Convert equipment
    const equipment = this.convertEquipment(source.weapons_and_equipment, techBase);
    
    // Convert critical slots
    const criticalSlots = this.convertCriticals(source.criticals);
    
    // Convert fluff
    const fluff = this.convertFluff(source);
    
    return {
      id,
      chassis: source.chassis,
      model: source.model,
      variant: source.clanname || source.omnimech_configuration,
      unitType: isOmni ? 'OmniMech' : 'BattleMech',
      configuration: configuration,
      techBase: techBase,
      rulesLevel: rulesLevel,
      era: era,
      year,
      tonnage: source.mass,
      engine,
      gyro,
      cockpit: CockpitType.STANDARD, // Default - source doesn't usually specify
      structure,
      armor,
      heatSinks,
      movement,
      equipment,
      criticalSlots,
      quirks: source.quirks,
      fluff,
    };
  }
  
  /**
   * Generate a unique ID for the unit
   */
  private generateUnitId(source: MegaMekLabUnit): string {
    // Use MUL ID if available
    if (source.mul_id) {
      return `mul-${source.mul_id}`;
    }
    
    // Generate from chassis and model
    const sanitized = `${source.chassis}-${source.model}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    return sanitized || uuidv4();
  }
  
  /**
   * Convert engine data
   */
  private convertEngine(
    source: { type: string; rating: number; manufacturer?: string },
    techBase: TechBase
  ): { type: string; rating: number } {
    const engineType = mapEngineType(source.type, techBase);
    
    return {
      type: engineType,
      rating: source.rating,
    };
  }
  
  /**
   * Convert gyro data
   */
  private convertGyro(source: MegaMekLabUnit, _techBase: TechBase): { type: string } {
    // MegaMekLab doesn't usually include gyro type in exported JSON
    // We default to standard, but could infer from criticals
    return {
      type: GyroType.STANDARD,
    };
  }
  
  /**
   * Convert cockpit data
   */
  private convertCockpit(_source: MegaMekLabUnit): string {
    // MegaMekLab doesn't usually include cockpit type in exported JSON
    return CockpitType.STANDARD;
  }
  
  /**
   * Convert structure data
   */
  private convertStructure(
    source: { type: string; manufacturer?: string | null },
    techBase: TechBase
  ): { type: string } {
    const structureType = mapStructureType(source.type, techBase);
    
    return {
      type: structureType,
    };
  }
  
  /**
   * Convert armor data
   */
  private convertArmor(
    source: { type: string; manufacturer?: string; locations: SourceArmorLocation[]; total_armor_points?: number },
    techBase: TechBase
  ): { type: string; allocation: Record<string, number | { front: number; rear: number }> } {
    const armorType = mapArmorType(source.type, techBase);
    const allocation = convertArmorLocations(source.locations);
    
    // Convert IArmorAllocation to serialized format
    const serializedAllocation: Record<string, number | { front: number; rear: number }> = {
      head: allocation.head,
      centerTorso: {
        front: allocation.centerTorso,
        rear: allocation.centerTorsoRear,
      },
      leftTorso: {
        front: allocation.leftTorso,
        rear: allocation.leftTorsoRear,
      },
      rightTorso: {
        front: allocation.rightTorso,
        rear: allocation.rightTorsoRear,
      },
      leftArm: allocation.leftArm,
      rightArm: allocation.rightArm,
      leftLeg: allocation.leftLeg,
      rightLeg: allocation.rightLeg,
    };
    
    return {
      type: armorType,
      allocation: serializedAllocation,
    };
  }
  
  /**
   * Convert heat sinks data
   */
  private convertHeatSinks(
    source: { type: string; count: number },
    engineRating: number,
    techBase: TechBase
  ): { type: string; count: number } {
    const heatSinkType = mapHeatSinkType(source.type, techBase);
    
    return {
      type: heatSinkType,
      count: source.count,
    };
  }
  
  /**
   * Convert movement data
   */
  private convertMovement(source: MegaMekLabUnit): {
    walk: number;
    jump: number;
    jumpJetType?: string;
    enhancements?: string[];
  } {
    const walkMP = typeof source.walk_mp === 'string' 
      ? parseInt(source.walk_mp, 10) 
      : source.walk_mp;
    
    const jumpMP = typeof source.jump_mp === 'string'
      ? parseInt(source.jump_mp, 10)
      : source.jump_mp;
    
    // Detect movement enhancements from equipment
    const enhancements: string[] = [];
    for (const item of source.weapons_and_equipment) {
      const lowerType = item.item_type.toLowerCase();
      if (lowerType.includes('masc')) {
        enhancements.push('MASC');
      }
      if (lowerType.includes('tsm') || lowerType.includes('triplestrength')) {
        enhancements.push('TSM');
      }
      if (lowerType.includes('supercharger')) {
        enhancements.push('Supercharger');
      }
    }
    
    // Detect jump jet type from equipment
    let jumpJetType: string | undefined;
    for (const item of source.weapons_and_equipment) {
      const lowerType = item.item_type.toLowerCase();
      if (lowerType.includes('improved') && lowerType.includes('jump')) {
        jumpJetType = 'Improved';
        break;
      } else if (lowerType.includes('jump')) {
        jumpJetType = 'Standard';
      }
    }
    
    return {
      walk: walkMP || 0,
      jump: jumpMP || 0,
      jumpJetType: jumpMP > 0 ? jumpJetType : undefined,
      enhancements: enhancements.length > 0 ? enhancements : undefined,
    };
  }
  
  /**
   * Convert equipment items
   */
  private convertEquipment(
    items: MegaMekLabEquipmentItem[],
    unitTechBase: TechBase
  ): Array<{
    id: string;
    location: string;
    slots?: number[];
    isRearMounted?: boolean;
    linkedAmmo?: string;
  }> {
    const result: Array<{
      id: string;
      location: string;
      slots?: number[];
      isRearMounted?: boolean;
      linkedAmmo?: string;
    }> = [];
    
    for (const item of items) {
      // Skip system components (they're handled separately)
      if (equipmentNameResolver.isSystemComponent(item.item_type)) {
        continue;
      }
      
      // Resolve equipment ID
      const itemTechBase = item.tech_base === 'Clan' ? TechBase.CLAN : 
                          item.tech_base === 'IS' ? TechBase.INNER_SPHERE : 
                          unitTechBase;
      
      const resolution = equipmentNameResolver.resolve(
        item.item_type,
        item.item_name,
        itemTechBase
      );
      
      // Parse location
      const parsedLocation = parseLocation(item.location);
      const locationStr = parsedLocation?.location || item.location;
      
      if (!resolution.found) {
        this.warnings.push({
          field: 'equipment',
          message: `Unknown equipment: ${item.item_name} (type: ${item.item_type})`,
          sourceValue: item,
        });
        
        // Still include it with a generated ID
        result.push({
          id: this.generateEquipmentId(item.item_type, item.item_name),
          location: locationStr,
          isRearMounted: item.rear_facing || parsedLocation?.isRear,
        });
      } else {
        result.push({
          id: resolution.equipmentId!,
          location: locationStr,
          isRearMounted: item.rear_facing || parsedLocation?.isRear,
        });
      }
    }
    
    return result;
  }
  
  /**
   * Generate an equipment ID for unrecognized equipment
   */
  private generateEquipmentId(itemType: string, itemName: string): string {
    return `unknown-${itemType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }
  
  /**
   * Convert critical slots
   */
  private convertCriticals(entries: SourceCriticalEntry[]): { [location: string]: (string | null)[] } {
    const parsed = parseCriticalSlots(entries);
    const result: { [location: string]: (string | null)[] } = {};
    
    for (const entry of parsed) {
      const slots = entry.slots.map(slot => {
        if (slot === '-Empty-' || slot === 'Empty' || slot === '') {
          return null;
        }
        return slot;
      });
      
      result[entry.location] = slots;
    }
    
    return result;
  }
  
  /**
   * Convert fluff/flavor text
   */
  private convertFluff(source: MegaMekLabUnit): ISerializedFluff | undefined {
    if (!source.fluff_text && !source.manufacturers && !source.system_manufacturers) {
      return undefined;
    }
    
    // Build fluff object - use Partial to allow building incrementally
    const fluff: Partial<{
      overview?: string;
      capabilities?: string;
      history?: string;
      deployment?: string;
      variants?: string;
      notableUnits?: string;
      manufacturer?: string;
      primaryFactory?: string;
      systemManufacturer?: Record<string, string>;
    }> = {};
    
    if (source.fluff_text) {
      if (source.fluff_text.overview) fluff.overview = source.fluff_text.overview;
      if (source.fluff_text.capabilities) fluff.capabilities = source.fluff_text.capabilities;
      if (source.fluff_text.history) fluff.history = source.fluff_text.history;
      if (source.fluff_text.deployment) fluff.deployment = source.fluff_text.deployment;
    }
    
    // Extract primary manufacturer
    if (source.manufacturers && source.manufacturers.length > 0) {
      fluff.manufacturer = source.manufacturers[0].name;
      if (source.manufacturers[0].location) {
        fluff.primaryFactory = source.manufacturers[0].location;
      }
    }
    
    // Extract system manufacturers
    if (source.system_manufacturers && source.system_manufacturers.length > 0) {
      const systemMfrs: Record<string, string> = {};
      for (const sm of source.system_manufacturers) {
        systemMfrs[sm.type.toLowerCase()] = sm.name;
      }
      fluff.systemManufacturer = systemMfrs;
    }
    
    return Object.keys(fluff).length > 0 ? (fluff as ISerializedFluff) : undefined;
  }
}

// Singleton instance
export const unitFormatConverter = new UnitFormatConverter();

