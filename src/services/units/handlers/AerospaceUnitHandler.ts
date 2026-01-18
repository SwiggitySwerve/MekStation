/**
 * Aerospace Unit Handler
 *
 * Handler for parsing, validating, and serializing aerospace fighters.
 * Supports standard aerospace fighters, conventional fighters, and small craft.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.3
 */

import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { IBlkDocument } from '../../../types/formats/BlkFormat';
import { ISerializedUnit } from '../../../types/unit/UnitSerialization';
import {
  IAerospace,
  IAerospaceMountedEquipment,
  AerospaceCockpitType,
} from '../../../types/unit/AerospaceInterfaces';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '../../../types/unit/BaseUnitInterfaces';
import { AerospaceLocation } from '../../../types/construction/UnitLocation';
import { IUnitParseResult } from '../../../types/unit/UnitTypeHandler';
import { TechBase, Era, WeightClass, RulesLevel } from '../../../types/enums';
import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';

// ============================================================================
// Constants
// ============================================================================

/**
 * Aerospace armor arc order for array parsing
 * BLK format: Nose, Left Wing, Right Wing, Aft
 */
const AEROSPACE_ARMOR_ARCS = ['nose', 'leftWing', 'rightWing', 'aft'] as const;

/**
 * Map location strings to AerospaceLocation enum
 */
const LOCATION_MAP: Record<string, AerospaceLocation> = {
  nose: AerospaceLocation.NOSE,
  'nose equipment': AerospaceLocation.NOSE,
  'left wing': AerospaceLocation.LEFT_WING,
  'left wing equipment': AerospaceLocation.LEFT_WING,
  'right wing': AerospaceLocation.RIGHT_WING,
  'right wing equipment': AerospaceLocation.RIGHT_WING,
  aft: AerospaceLocation.AFT,
  'aft equipment': AerospaceLocation.AFT,
  fuselage: AerospaceLocation.FUSELAGE,
  'fuselage equipment': AerospaceLocation.FUSELAGE,
  wings: AerospaceLocation.LEFT_WING, // Generic wings maps to left
  'wings equipment': AerospaceLocation.LEFT_WING,
};

// ============================================================================
// Aerospace Unit Handler
// ============================================================================

/**
 * Handler for aerospace fighter units
 */
export class AerospaceUnitHandler extends AbstractUnitTypeHandler<IAerospace> {
  readonly unitType = UnitType.AEROSPACE;
  readonly displayName = 'Aerospace Fighter';

  /**
   * Get available locations for aerospace fighters
   */
  getLocations(): readonly string[] {
    return Object.values(AerospaceLocation);
  }

  /**
   * Parse aerospace-specific fields from BLK document
   */
  protected parseTypeSpecificFields(document: IBlkDocument): Partial<IAerospace> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Movement - thrust values
    const safeThrust = document.safeThrust || 0;
    const maxThrust = Math.floor(safeThrust * 1.5);
    const movement: IAerospaceMovement = { safeThrust, maxThrust };

    if (safeThrust < 1) {
      errors.push('Aerospace fighters must have at least 1 safe thrust');
    }

    // Fuel
    const fuel = document.fuel || 0;
    if (fuel < 80) {
      warnings.push('Low fuel capacity may limit operational range');
    }

    // Structural integrity
    const structuralIntegrity = document.structuralIntegrity || 0;

    // Heat sinks
    const heatSinks = document.heatsinks || 10;
    const heatSinkType = document.sinkType || 0;

    // Engine and armor types
    const engineType = document.engineType || 0;
    const armorType = document.armorType || 0;

    // Parse armor by arc
    const armor = document.armor || [];
    const armorByArc = this.parseArmorByArc(armor);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // Cockpit type
    const cockpitType = this.parseCockpitType(document);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Bomb bay
    const hasBombBay = this.checkBombBay(document);
    const bombCapacity = hasBombBay ? Math.floor(document.tonnage * 0.1) : 0;

    // Additional features from raw tags
    const rawTags = document.rawTags || {};
    const hasReinforcedCockpit = this.getBooleanFromRaw(rawTags, 'reinforcedcockpit');
    const hasEjectionSeat = this.getBooleanFromRaw(rawTags, 'ejectionseat') ?? true; // Default true

    return {
      unitType: UnitType.AEROSPACE,
      motionType: AerospaceMotionType.AERODYNE,
      movement,
      fuel,
      structuralIntegrity,
      heatSinks,
      heatSinkType,
      engineType,
      armorType,
      armor,
      armorByArc,
      totalArmorPoints,
      cockpitType,
      equipment,
      hasBombBay,
      bombCapacity,
      bombs: [],
      hasReinforcedCockpit,
      hasEjectionSeat,
      errors,
      warnings,
    };
  }

  /**
   * Parse armor values into arc-keyed object
   */
  private parseArmorByArc(armor: readonly number[]): {
    nose: number;
    leftWing: number;
    rightWing: number;
    aft: number;
  } {
    return {
      nose: armor[0] || 0,
      leftWing: armor[1] || 0,
      rightWing: armor[2] || 0,
      aft: armor[3] || 0,
    };
  }

  /**
   * Parse cockpit type from document
   */
  private parseCockpitType(document: IBlkDocument): AerospaceCockpitType {
    const cockpitCode = document.cockpitType || 0;
    switch (cockpitCode) {
      case 1:
        return AerospaceCockpitType.SMALL;
      case 2:
        return AerospaceCockpitType.PRIMITIVE;
      case 3:
        return AerospaceCockpitType.COMMAND_CONSOLE;
      default:
        return AerospaceCockpitType.STANDARD;
    }
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(document: IBlkDocument): readonly IAerospaceMountedEquipment[] {
    const equipment: IAerospaceMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(document.equipmentByLocation)) {
      const location = this.normalizeLocation(locationKey);

      for (const item of items) {
        equipment.push({
          id: `mount-${mountId++}`,
          equipmentId: item,
          name: item,
          location,
        });
      }
    }

    return equipment;
  }

  /**
   * Normalize location string to AerospaceLocation enum
   */
  private normalizeLocation(locationKey: string): AerospaceLocation {
    const normalized = locationKey.toLowerCase();
    return LOCATION_MAP[normalized] || AerospaceLocation.FUSELAGE;
  }

  /**
   * Check if aerospace has bomb bay
   */
  private checkBombBay(document: IBlkDocument): boolean {
    // Check equipment for bomb-related items
    for (const items of Object.values(document.equipmentByLocation)) {
      for (const item of items) {
        if (item.toLowerCase().includes('bomb')) {
          return true;
        }
      }
    }

    // Check raw tags
    const rawTags = document.rawTags || {};
    return this.getBooleanFromRaw(rawTags, 'bombbay');
  }

  /**
   * Get boolean value from raw tags
   */
  private getBooleanFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string
  ): boolean {
    const value = rawTags[key];
    if (Array.isArray(value)) {
      return value[0]?.toLowerCase() === 'true' || value[0] === '1';
    }
    return value?.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Combine common and aerospace-specific fields into IAerospace
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IAerospace>
  ): IAerospace {
    // Determine weight class (aerospace use different thresholds)
    const weightClass = this.getWeightClass(commonFields.tonnage);

    // Parse tech base from type string
    const techBase = this.parseTechBase(commonFields.techBase);

    // Parse rules level from type string
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `aerospace-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.AEROSPACE,
      tonnage: commonFields.tonnage,
      weightClass,

      // Tech
      techBase,
      era: commonFields.era as Era,
      rulesLevel,

      // Metadata
      metadata: {
        chassis: commonFields.chassis,
        model: commonFields.model,
        year: commonFields.year,
        rulesLevel,
        techBase,
        role: commonFields.role,
      },

      // Optional fields
      source: commonFields.source,
      role: commonFields.role,

      // Calculated values (will be recalculated)
      bv: 0,
      cost: 0,
      totalWeight: commonFields.tonnage,
      remainingTonnage: 0,
      isValid: true,
      validationErrors: [],

      // Aerospace-specific fields
      ...typeSpecificFields,
    } as IAerospace;
  }

  /**
   * Determine weight class from tonnage (aerospace thresholds)
   */
  private getWeightClass(tonnage: number): WeightClass {
    if (tonnage <= 45) return WeightClass.LIGHT;
    if (tonnage <= 70) return WeightClass.MEDIUM;
    return WeightClass.HEAVY;
  }

  /**
   * Parse tech base from type string
   */
  private parseTechBase(typeStr: string): TechBase {
    const lower = typeStr.toLowerCase();
    if (lower.includes('clan') && !lower.includes('mixed')) {
      return TechBase.CLAN;
    }
    return TechBase.INNER_SPHERE;
  }

  /**
   * Parse rules level from type string
   */
  private parseRulesLevel(typeStr: string): RulesLevel {
    const lower = typeStr.toLowerCase();
    if (lower.includes('level 1') || lower.includes('introductory')) {
      return RulesLevel.INTRODUCTORY;
    }
    if (lower.includes('level 2') || lower.includes('standard')) {
      return RulesLevel.STANDARD;
    }
    if (lower.includes('level 3') || lower.includes('advanced')) {
      return RulesLevel.ADVANCED;
    }
    if (lower.includes('level 4') || lower.includes('experimental')) {
      return RulesLevel.EXPERIMENTAL;
    }
    return RulesLevel.STANDARD;
  }

  /**
   * Serialize aerospace-specific fields
   */
  protected serializeTypeSpecificFields(unit: IAerospace): Partial<ISerializedUnit> {
    return {
      configuration: 'Aerodyne',
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(serialized: ISerializedUnit): IUnitParseResult<IAerospace> {
    return createFailureResult(['Aerospace deserialization not yet implemented']);
  }

  /**
   * Validate aerospace-specific rules
   */
  protected validateTypeSpecificRules(unit: IAerospace): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Tonnage limits for aerospace fighters
    if (unit.tonnage < 5) {
      errors.push('Aerospace fighter tonnage must be at least 5 tons');
    }
    if (unit.tonnage > 100) {
      errors.push('Aerospace fighter tonnage cannot exceed 100 tons');
    }

    // Thrust validation
    if (unit.movement.safeThrust < 1) {
      errors.push('Aerospace fighters must have at least 1 safe thrust');
    }

    // Structural integrity validation
    if (unit.structuralIntegrity < 1) {
      errors.push('Aerospace fighters must have at least 1 SI');
    }

    // Fuel validation
    if (unit.fuel < 80) {
      warnings.push('Low fuel capacity (less than 80 points)');
    }

    // Heat sink minimum
    if (unit.heatSinks < 10) {
      errors.push('Aerospace fighters must have at least 10 heat sinks');
    }

    // Armor balance check
    const arcValues = [
      unit.armorByArc.nose,
      unit.armorByArc.leftWing,
      unit.armorByArc.rightWing,
      unit.armorByArc.aft,
    ];
    const maxArc = Math.max(...arcValues);
    const minArc = Math.min(...arcValues);
    if (maxArc > minArc * 3) {
      warnings.push('Armor distribution is highly unbalanced');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate aerospace weight
   */
  protected calculateTypeSpecificWeight(unit: IAerospace): number {
    let weight = 0;

    // Engine weight (simplified: based on safe thrust and tonnage)
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    weight += thrustRating * 0.05; // Simplified engine weight

    // Structural weight
    weight += unit.tonnage * 0.1;

    // Armor weight (aerospace: 16 points per ton for standard)
    weight += unit.totalArmorPoints / 16;

    // Heat sinks (first 10 free, rest = 1 ton each for single)
    const extraHeatSinks = Math.max(0, unit.heatSinks - 10);
    weight += extraHeatSinks * (unit.heatSinkType === 1 ? 1 : 1);

    // Fuel (200 points per ton)
    weight += unit.fuel / 200;

    // Cockpit (3 tons standard)
    weight += 3;

    return weight;
  }

  /**
   * Calculate aerospace BV
   */
  protected calculateTypeSpecificBV(unit: IAerospace): number {
    let bv = 0;

    // Base armor BV (2 points per armor point for aerospace)
    bv += unit.totalArmorPoints * 2;

    // SI contributes to BV
    bv += unit.structuralIntegrity * 10;

    // Thrust modifier (higher thrust = higher BV)
    const thrustMod = 1 + (unit.movement.safeThrust - 5) * 0.05;
    bv *= thrustMod;

    // Equipment BV would be added here

    return Math.round(bv);
  }

  /**
   * Calculate aerospace cost
   */
  protected calculateTypeSpecificCost(unit: IAerospace): number {
    let cost = 0;

    // Base structure cost
    cost += unit.tonnage * 50000;

    // Engine cost
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    cost += thrustRating * 10000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    // Avionics/cockpit
    cost += 200000;

    // Equipment cost would be added here

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create and optionally register the aerospace handler
 */
export function createAerospaceHandler(): AerospaceUnitHandler {
  return new AerospaceUnitHandler();
}
