/**
 * Unit Factory Service
 * 
 * Converts ISerializedUnit to runtime IBattleMech objects.
 * Handles equipment resolution, validation, and derived value calculation.
 * 
 * @module services/units/UnitFactoryService
 */

import {
  IBattleMech,
  IUnitMetadata,
  IEngineConfiguration,
  IGyroConfiguration,
  IStructureConfiguration,
  IHeatSinkConfiguration,
  IMovementConfiguration,
  IMountedEquipment,
  ICriticalSlotAssignment,
  ICriticalSlot,
  UnitType,
  MechConfiguration,
} from '@/types/unit/BattleMechInterfaces';
import {
  ISerializedUnit,
} from '@/types/unit/UnitSerialization';
import {
  EngineType,
  GyroType,
  InternalStructureType,
  HeatSinkType,
  ArmorTypeEnum,
  CockpitType,
  MechLocation,
  IArmorAllocation,
} from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { calculateEngineWeight } from '@/utils/construction/engineCalculations';

/**
 * Factory result
 */
export interface IUnitFactoryResult {
  readonly success: boolean;
  readonly unit: IBattleMech | null;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Parse engine type from string
 */
function parseEngineType(value: string): EngineType {
  switch (value.toUpperCase()) {
    case 'FUSION':
    case 'STANDARD':
      return EngineType.STANDARD;
    case 'XL':
    case 'XL_IS':
      return EngineType.XL_IS;
    case 'CLAN_XL':
    case 'XL_CLAN':
      return EngineType.XL_CLAN;
    case 'LIGHT':
      return EngineType.LIGHT;
    case 'COMPACT':
      return EngineType.COMPACT;
    case 'XXL':
      return EngineType.XXL;
    case 'ICE':
      return EngineType.ICE;
    case 'FUEL_CELL':
      return EngineType.FUEL_CELL;
    case 'FISSION':
      return EngineType.FISSION;
    default:
      return EngineType.STANDARD;
  }
}

/**
 * Parse gyro type from string
 */
function parseGyroType(value: string): GyroType {
  switch (value.toUpperCase()) {
    case 'STANDARD':
      return GyroType.STANDARD;
    case 'XL':
      return GyroType.XL;
    case 'COMPACT':
      return GyroType.COMPACT;
    case 'HEAVY_DUTY':
      return GyroType.HEAVY_DUTY;
    default:
      return GyroType.STANDARD;
  }
}

/**
 * Parse cockpit type from string
 */
function parseCockpitType(value: string): CockpitType {
  switch (value.toUpperCase()) {
    case 'STANDARD': return CockpitType.STANDARD;
    case 'SMALL': return CockpitType.SMALL;
    case 'COMMAND_CONSOLE': return CockpitType.COMMAND_CONSOLE;
    case 'TORSO_MOUNTED': return CockpitType.TORSO_MOUNTED;
    case 'PRIMITIVE': return CockpitType.PRIMITIVE;
    case 'INDUSTRIAL': return CockpitType.INDUSTRIAL;
    default: return CockpitType.STANDARD;
  }
}

/**
 * Parse structure type from string
 */
function parseStructureType(value: string): InternalStructureType {
  switch (value.toUpperCase()) {
    case 'STANDARD':
      return InternalStructureType.STANDARD;
    case 'ENDO_STEEL':
    case 'ENDO_STEEL_IS':
      return InternalStructureType.ENDO_STEEL_IS;
    case 'ENDO_STEEL_CLAN':
      return InternalStructureType.ENDO_STEEL_CLAN;
    case 'ENDO_COMPOSITE':
      return InternalStructureType.ENDO_COMPOSITE;
    case 'REINFORCED':
      return InternalStructureType.REINFORCED;
    case 'COMPOSITE':
      return InternalStructureType.COMPOSITE;
    case 'INDUSTRIAL':
      return InternalStructureType.INDUSTRIAL;
    default:
      return InternalStructureType.STANDARD;
  }
}

/**
 * Parse armor type from string
 */
function parseArmorType(value: string): ArmorTypeEnum {
  switch (value.toUpperCase()) {
    case 'STANDARD':
      return ArmorTypeEnum.STANDARD;
    case 'FERRO_FIBROUS':
    case 'FERRO_FIBROUS_IS':
      return ArmorTypeEnum.FERRO_FIBROUS_IS;
    case 'FERRO_FIBROUS_CLAN':
      return ArmorTypeEnum.FERRO_FIBROUS_CLAN;
    case 'LIGHT_FERRO_FIBROUS':
    case 'LIGHT_FERRO':
      return ArmorTypeEnum.LIGHT_FERRO;
    case 'HEAVY_FERRO_FIBROUS':
    case 'HEAVY_FERRO':
      return ArmorTypeEnum.HEAVY_FERRO;
    case 'STEALTH':
      return ArmorTypeEnum.STEALTH;
    case 'REACTIVE':
      return ArmorTypeEnum.REACTIVE;
    case 'REFLECTIVE':
      return ArmorTypeEnum.REFLECTIVE;
    case 'HARDENED':
      return ArmorTypeEnum.HARDENED;
    default:
      return ArmorTypeEnum.STANDARD;
  }
}

/**
 * Parse heat sink type from string
 */
function parseHeatSinkType(value: string): HeatSinkType {
  switch (value.toUpperCase()) {
    case 'SINGLE':
      return HeatSinkType.SINGLE;
    case 'DOUBLE':
    case 'DOUBLE_IS':
      return HeatSinkType.DOUBLE_IS;
    case 'DOUBLE_CLAN':
      return HeatSinkType.DOUBLE_CLAN;
    case 'COMPACT':
      return HeatSinkType.COMPACT;
    case 'LASER':
      return HeatSinkType.LASER;
    default:
      return HeatSinkType.SINGLE;
  }
}

/**
 * Parse tech base from string
 * Per spec VAL-ENUM-004: Components must have binary tech base (IS or Clan).
 * MIXED/BOTH from import sources default to INNER_SPHERE.
 */
function parseTechBase(value: string): TechBase {
  switch (value.toUpperCase()) {
    case 'CLAN':
      return TechBase.CLAN;
    case 'INNER_SPHERE':
    case 'IS':
    case 'BOTH':
    case 'MIXED':
    default:
      // Per spec: Default to IS for mixed/unknown
      return TechBase.INNER_SPHERE;
  }
}

/**
 * Parse rules level from string
 */
function parseRulesLevel(value: string): RulesLevel {
  switch (value.toUpperCase()) {
    case 'INTRODUCTORY':
      return RulesLevel.INTRODUCTORY;
    case 'STANDARD':
      return RulesLevel.STANDARD;
    case 'ADVANCED':
      return RulesLevel.ADVANCED;
    case 'EXPERIMENTAL':
    case 'UNOFFICIAL':
      return RulesLevel.EXPERIMENTAL;
    default:
      return RulesLevel.STANDARD;
  }
}

/**
 * Parse era from string
 */
function parseEra(value: string): Era {
  switch (value.toUpperCase()) {
    case 'AGE_OF_WAR':
      return Era.AGE_OF_WAR;
    case 'STAR_LEAGUE':
      return Era.STAR_LEAGUE;
    case 'EARLY_SUCCESSION_WARS':
      return Era.EARLY_SUCCESSION_WARS;
    case 'LATE_SUCCESSION_WARS':
      return Era.LATE_SUCCESSION_WARS;
    case 'RENAISSANCE':
      return Era.RENAISSANCE;
    case 'CLAN_INVASION':
      return Era.CLAN_INVASION;
    case 'CIVIL_WAR':
      return Era.CIVIL_WAR;
    case 'JIHAD':
      return Era.JIHAD;
    case 'DARK_AGE':
      return Era.DARK_AGE;
    case 'ILCLAN':
    case 'IL_CLAN':
      return Era.IL_CLAN;
    default:
      return Era.LATE_SUCCESSION_WARS;
  }
}

/**
 * Parse mech configuration from string
 */
function parseMechConfiguration(value: string): MechConfiguration {
  switch (value) {
    case 'Biped': return MechConfiguration.BIPED;
    case 'Quad': return MechConfiguration.QUAD;
    case 'Tripod': return MechConfiguration.TRIPOD;
    case 'LAM': return MechConfiguration.LAM;
    case 'QuadVee': return MechConfiguration.QUADVEE;
    default: return MechConfiguration.BIPED;
  }
}

/**
 * Parse mech location from string
 */
function parseMechLocation(value: string): MechLocation {
  switch (value.toUpperCase()) {
    case 'HEAD': return MechLocation.HEAD;
    case 'CENTER_TORSO': return MechLocation.CENTER_TORSO;
    case 'LEFT_TORSO': return MechLocation.LEFT_TORSO;
    case 'RIGHT_TORSO': return MechLocation.RIGHT_TORSO;
    case 'LEFT_ARM': return MechLocation.LEFT_ARM;
    case 'RIGHT_ARM': return MechLocation.RIGHT_ARM;
    case 'LEFT_LEG': return MechLocation.LEFT_LEG;
    case 'RIGHT_LEG': return MechLocation.RIGHT_LEG;
    default: return MechLocation.CENTER_TORSO;
  }
}

/**
 * Get weight class from tonnage
 */
function getWeightClass(tonnage: number): WeightClass {
  if (tonnage <= 35) return WeightClass.LIGHT;
  if (tonnage <= 55) return WeightClass.MEDIUM;
  if (tonnage <= 75) return WeightClass.HEAVY;
  return WeightClass.ASSAULT;
}

/**
 * Calculate structure points for a location
 */
function getStructurePoints(location: MechLocation, tonnage: number): number {
  // Standard structure points by tonnage (head is always 3)
  const structureTable: Record<number, Record<string, number>> = {
    20: { HEAD: 3, CT: 6, TORSO: 5, ARM: 3, LEG: 4 },
    25: { HEAD: 3, CT: 8, TORSO: 6, ARM: 4, LEG: 6 },
    30: { HEAD: 3, CT: 10, TORSO: 7, ARM: 5, LEG: 7 },
    35: { HEAD: 3, CT: 11, TORSO: 8, ARM: 6, LEG: 8 },
    40: { HEAD: 3, CT: 12, TORSO: 10, ARM: 6, LEG: 10 },
    45: { HEAD: 3, CT: 14, TORSO: 11, ARM: 7, LEG: 11 },
    50: { HEAD: 3, CT: 16, TORSO: 12, ARM: 8, LEG: 12 },
    55: { HEAD: 3, CT: 18, TORSO: 13, ARM: 9, LEG: 13 },
    60: { HEAD: 3, CT: 20, TORSO: 14, ARM: 10, LEG: 14 },
    65: { HEAD: 3, CT: 21, TORSO: 15, ARM: 10, LEG: 15 },
    70: { HEAD: 3, CT: 22, TORSO: 15, ARM: 11, LEG: 15 },
    75: { HEAD: 3, CT: 23, TORSO: 16, ARM: 12, LEG: 16 },
    80: { HEAD: 3, CT: 25, TORSO: 17, ARM: 13, LEG: 17 },
    85: { HEAD: 3, CT: 27, TORSO: 18, ARM: 14, LEG: 18 },
    90: { HEAD: 3, CT: 29, TORSO: 19, ARM: 15, LEG: 19 },
    95: { HEAD: 3, CT: 30, TORSO: 20, ARM: 16, LEG: 20 },
    100: { HEAD: 3, CT: 31, TORSO: 21, ARM: 17, LEG: 21 },
  };
  
  // Round tonnage to nearest 5
  const roundedTonnage = Math.min(100, Math.max(20, Math.round(tonnage / 5) * 5));
  const table = structureTable[roundedTonnage] || structureTable[100];
  
  switch (location) {
    case MechLocation.HEAD: return table.HEAD;
    case MechLocation.CENTER_TORSO: return table.CT;
    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO: return table.TORSO;
    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM: return table.ARM;
    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG: return table.LEG;
    default: return 0;
  }
}

/**
 * Unit Factory Service
 * 
 * Creates IBattleMech instances from serialized unit data.
 */
export class UnitFactoryService {
  private static instance: UnitFactoryService | null = null;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): UnitFactoryService {
    if (!UnitFactoryService.instance) {
      UnitFactoryService.instance = new UnitFactoryService();
    }
    return UnitFactoryService.instance;
  }
  
  /**
   * Create an IBattleMech from ISerializedUnit
   */
  createFromSerialized(data: ISerializedUnit): IUnitFactoryResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Parse enums
      const techBase = parseTechBase(data.techBase);
      const rulesLevel = parseRulesLevel(data.rulesLevel);
      const era = parseEra(data.era);
      const configuration = parseMechConfiguration(data.configuration);
      const weightClass = getWeightClass(data.tonnage);
      
      // Extended data with optional fields (from our converter)
      const extendedData = data as ISerializedUnit & { 
        source?: string; 
        role?: string; 
        mulId?: number;
      };
      
      // Build metadata
      const metadata: IUnitMetadata = {
        chassis: data.chassis,
        model: data.model,
        variant: data.variant,
        source: extendedData.source,
        era,
        year: data.year,
        rulesLevel,
        role: extendedData.role,
        manufacturer: data.fluff?.manufacturer,
        primaryFactory: data.fluff?.primaryFactory,
      };
      
      // Build engine configuration
      const engine: IEngineConfiguration = {
        type: parseEngineType(data.engine.type),
        rating: data.engine.rating,
        integralHeatSinks: Math.floor(data.engine.rating / 25),
      };
      
      // Build gyro configuration
      const gyro: IGyroConfiguration = {
        type: parseGyroType(data.gyro.type),
        weight: this.calculateGyroWeight(data.engine.rating, parseGyroType(data.gyro.type)),
      };
      
      // Build structure configuration
      const structurePoints = this.buildStructurePoints(data.tonnage);
      const structure: IStructureConfiguration = {
        type: parseStructureType(data.structure.type),
        points: structurePoints,
      };
      
      // Build heat sink configuration
      const heatSinks: IHeatSinkConfiguration = {
        type: parseHeatSinkType(data.heatSinks.type),
        total: data.heatSinks.count,
        integrated: engine.integralHeatSinks,
        external: Math.max(0, data.heatSinks.count - engine.integralHeatSinks),
      };
      
      // Build movement configuration
      const movement: IMovementConfiguration = {
        walkMP: data.movement.walk,
        runMP: Math.ceil(data.movement.walk * 1.5),
        jumpMP: data.movement.jump,
        jumpJetType: data.movement.jumpJetType,
        hasMASC: data.movement.enhancements?.includes('MASC') || false,
        hasSupercharger: data.movement.enhancements?.includes('Supercharger') || false,
        hasTSM: data.movement.enhancements?.includes('TSM') || false,
      };
      
      // Build armor allocation
      const armorAllocation = this.buildArmorAllocation(data.armor.allocation);
      const totalArmorPoints = this.calculateTotalArmor(armorAllocation);
      
      // Build equipment list
      const equipment = this.buildEquipmentList(data.equipment);
      
      // Build critical slots
      const criticalSlots = this.buildCriticalSlots(data.criticalSlots);
      
      // Calculate totals
      const totalWeight = this.calculateTotalWeight(data, engine, gyro, heatSinks);
      const remainingTonnage = data.tonnage - totalWeight;
      
      // Build the mech
      const mech: IBattleMech = {
        id: data.id,
        name: `${data.chassis} ${data.model}`,
        techBase,
        rulesLevel,
        introductionYear: data.year,
        era,
        unitType: UnitType.BATTLEMECH,
        configuration,
        tonnage: data.tonnage,
        weightClass,
        metadata,
        engine,
        gyro,
        cockpitType: parseCockpitType(data.cockpit),
        structure,
        armorType: parseArmorType(data.armor.type),
        armorAllocation,
        totalArmorPoints,
        heatSinks,
        movement,
        equipment,
        criticalSlots,
        quirks: data.quirks,
        totalWeight,
        remainingTonnage,
        isValid: errors.length === 0 && remainingTonnage >= 0,
        validationErrors: errors,
        cost: 0, // Would need full cost calculation
        battleValue: 0, // Would need full BV calculation
      };
      
      return {
        success: true,
        unit: mech,
        errors,
        warnings,
      };
    } catch (e) {
      errors.push(`Factory error: ${e}`);
      return {
        success: false,
        unit: null,
        errors,
        warnings,
      };
    }
  }
  
  /**
   * Calculate gyro weight
   */
  private calculateGyroWeight(engineRating: number, gyroType: GyroType): number {
    const baseWeight = Math.ceil(engineRating / 100);
    switch (gyroType) {
      case GyroType.XL:
        return Math.ceil(baseWeight / 2);
      case GyroType.COMPACT:
        return Math.ceil(baseWeight * 1.5);
      case GyroType.HEAVY_DUTY:
        return baseWeight * 2;
      default:
        return baseWeight;
    }
  }
  
  /**
   * Build structure points map
   */
  private buildStructurePoints(tonnage: number): Record<MechLocation, number> {
    return {
      [MechLocation.HEAD]: getStructurePoints(MechLocation.HEAD, tonnage),
      [MechLocation.CENTER_TORSO]: getStructurePoints(MechLocation.CENTER_TORSO, tonnage),
      [MechLocation.LEFT_TORSO]: getStructurePoints(MechLocation.LEFT_TORSO, tonnage),
      [MechLocation.RIGHT_TORSO]: getStructurePoints(MechLocation.RIGHT_TORSO, tonnage),
      [MechLocation.LEFT_ARM]: getStructurePoints(MechLocation.LEFT_ARM, tonnage),
      [MechLocation.RIGHT_ARM]: getStructurePoints(MechLocation.RIGHT_ARM, tonnage),
      [MechLocation.LEFT_LEG]: getStructurePoints(MechLocation.LEFT_LEG, tonnage),
      [MechLocation.RIGHT_LEG]: getStructurePoints(MechLocation.RIGHT_LEG, tonnage),
    };
  }
  
  /**
   * Convert UPPER_SNAKE_CASE location key to camelCase
   */
  private locationToCamelCase(location: string): string {
    // Map from serialized format to IArmorAllocation property names
    const mapping: Record<string, string> = {
      'HEAD': 'head',
      'CENTER_TORSO': 'centerTorso',
      'LEFT_TORSO': 'leftTorso',
      'RIGHT_TORSO': 'rightTorso',
      'LEFT_ARM': 'leftArm',
      'RIGHT_ARM': 'rightArm',
      'LEFT_LEG': 'leftLeg',
      'RIGHT_LEG': 'rightLeg',
    };
    return mapping[location] || location.toLowerCase();
  }

  /**
   * Build armor allocation from serialized data
   */
  private buildArmorAllocation(allocation: Record<string, number | { front: number; rear: number }>): IArmorAllocation {
    // Initialize with zeros to satisfy the interface
    const result: IArmorAllocation = {
      head: 0,
      centerTorso: 0,
      centerTorsoRear: 0,
      leftTorso: 0,
      leftTorsoRear: 0,
      rightTorso: 0,
      rightTorsoRear: 0,
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0,
    };
    
    for (const [location, value] of Object.entries(allocation)) {
      const camelKey = this.locationToCamelCase(location) as keyof IArmorAllocation;
      
      if (typeof value === 'number') {
        if (camelKey in result) {
          (result as Record<keyof IArmorAllocation, number>)[camelKey] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Front armor
        if (camelKey in result) {
          (result as Record<keyof IArmorAllocation, number>)[camelKey] = value.front;
        }
        // Rear armor (only for torso locations)
        const rearKey = `${camelKey}Rear` as keyof IArmorAllocation;
        if (rearKey in result) {
          (result as Record<keyof IArmorAllocation, number>)[rearKey] = value.rear;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Calculate total armor points
   */
  private calculateTotalArmor(allocation: IArmorAllocation): number {
    let total = 0;
    for (const value of Object.values(allocation)) {
      if (typeof value === 'number') {
        total += value;
      }
    }
    return total;
  }
  
  /**
   * Build equipment list
   */
  private buildEquipmentList(equipment: readonly { id: string; location: string; slots?: number[]; isRearMounted?: boolean; linkedAmmo?: string }[]): readonly IMountedEquipment[] {
    const registry = getEquipmentRegistry();
    
    return equipment.map((item, index) => ({
      id: `${item.id}-${index}`,
      equipmentId: item.id,
      name: registry.lookup(item.id).equipment?.name || item.id,
      location: parseMechLocation(item.location),
      slots: item.slots || [],
      isRearMounted: item.isRearMounted || false,
      isTurretMounted: false,
      linkedAmmoId: item.linkedAmmo,
    }));
  }
  
  /**
   * Build critical slots from serialized data
   */
  private buildCriticalSlots(slots: Record<string, (string | null)[]>): readonly ICriticalSlotAssignment[] {
    const assignments: ICriticalSlotAssignment[] = [];
    
    for (const [locationStr, slotItems] of Object.entries(slots)) {
      const location = parseMechLocation(locationStr);
      const slotList: ICriticalSlot[] = slotItems.map((item, index) => ({
        index,
        content: item ? {
          type: this.determineSlotContentType(item),
          name: item,
          isHittable: !item.includes('Engine') && !item.includes('Gyro'),
        } : null,
        isFixed: item !== null && (
          item.includes('Engine') ||
          item.includes('Gyro') ||
          item.includes('Cockpit') ||
          item.includes('Life Support') ||
          item.includes('Sensors') ||
          item.includes('Actuator') ||
          item.includes('Shoulder') ||
          item.includes('Hip')
        ),
        isDestroyed: false,
      }));
      
      assignments.push({ location, slots: slotList });
    }
    
    return assignments;
  }
  
  /**
   * Determine the type of content in a critical slot
   */
  private determineSlotContentType(item: string): 'equipment' | 'actuator' | 'system' | 'structure' | 'armor' {
    const lower = item.toLowerCase();
    if (lower.includes('actuator') || lower.includes('shoulder') || lower.includes('hip')) {
      return 'actuator';
    }
    if (lower.includes('engine') || lower.includes('gyro') || lower.includes('cockpit') ||
        lower.includes('life support') || lower.includes('sensors')) {
      return 'system';
    }
    return 'equipment';
  }
  
  /**
   * Calculate total weight (simplified)
   */
  private calculateTotalWeight(
    data: ISerializedUnit,
    engine: IEngineConfiguration,
    gyro: IGyroConfiguration,
    heatSinks: IHeatSinkConfiguration
  ): number {
    // This is a simplified calculation
    // A full implementation would use ConstructionRulesValidator
    let weight = 0;
    
    // Structure (10% of tonnage for standard)
    weight += data.tonnage * 0.1;
    
    // Engine weight (using proper TechManual calculation)
    const engineWeight = calculateEngineWeight(engine.rating, engine.type);
    weight += engineWeight;
    
    // Gyro
    weight += gyro.weight;
    
    // Cockpit (3 tons standard)
    weight += 3;
    
    // Heat sinks (external only, 1 ton each for single)
    weight += heatSinks.external * (heatSinks.type === HeatSinkType.SINGLE ? 1 : 1);
    
    // Armor (16 points per ton for standard)
    let totalArmor = 0;
    for (const val of Object.values(data.armor.allocation)) {
      if (typeof val === 'number') {
        totalArmor += val;
      } else if (typeof val === 'object' && val !== null && 'front' in val && 'rear' in val) {
        totalArmor += val.front + val.rear;
      }
    }
    weight += totalArmor / 16;
    
    // Jump jets (weight varies by tonnage)
    if (data.movement.jump > 0) {
      const jjWeight = data.tonnage <= 55 ? 0.5 : data.tonnage <= 85 ? 1 : 2;
      weight += data.movement.jump * jjWeight;
    }
    
    return Math.round(weight * 2) / 2; // Round to nearest half ton
  }
}

/**
 * Convenience function to get the factory instance
 */
export function getUnitFactory(): UnitFactoryService {
  return UnitFactoryService.getInstance();
}

