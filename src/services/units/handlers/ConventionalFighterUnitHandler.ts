/**
 * Conventional Fighter Unit Handler
 *
 * Handler for parsing, validating, and serializing conventional fighters.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { TechBase, Era, WeightClass, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  IConventionalFighter,
  IAerospaceMountedEquipment,
  AerospaceCockpitType,
  ConventionalFighterEngineType,
} from '@/types/unit/AerospaceInterfaces';
import {
  AerospaceMotionType,
  IAerospaceMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';

// ============================================================================
// Constants
// ============================================================================

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
};

/**
 * Map engine type codes to ConventionalFighterEngineType
 */
const ENGINE_TYPE_MAP: Record<number, ConventionalFighterEngineType> = {
  0: ConventionalFighterEngineType.ICE,
  1: ConventionalFighterEngineType.FUEL_CELL,
  2: ConventionalFighterEngineType.ELECTRIC,
  3: ConventionalFighterEngineType.FISSION,
  4: ConventionalFighterEngineType.FUSION,
  5: ConventionalFighterEngineType.SOLAR,
  6: ConventionalFighterEngineType.MAGLEV,
};

// ============================================================================
// Conventional Fighter Unit Handler
// ============================================================================

/**
 * Handler for conventional fighter units
 */
export class ConventionalFighterUnitHandler extends AbstractUnitTypeHandler<IConventionalFighter> {
  readonly unitType = UnitType.CONVENTIONAL_FIGHTER;
  readonly displayName = 'Conventional Fighter';

  /**
   * Get available locations for conventional fighters
   */
  getLocations(): readonly string[] {
    return Object.values(AerospaceLocation);
  }

  /**
   * Parse conventional fighter-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IConventionalFighter> & {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Movement - thrust/speed values
    const safeThrust = document.safeThrust || 0;
    const maxThrust = Math.floor(safeThrust * 1.5);
    const movement: IAerospaceMovement = { safeThrust, maxThrust };

    if (safeThrust < 1) {
      errors.push('Conventional fighters must have at least 1 safe thrust');
    }

    // Fuel (conventional fighters use more fuel)
    const fuel = document.fuel || 0;
    if (fuel < 40) {
      warnings.push('Very low fuel capacity');
    }

    // Structural integrity
    const structuralIntegrity = document.structuralIntegrity || 0;

    // Heat sinks (fewer than aerospace fighters)
    const heatSinks = document.heatsinks || 0;
    const heatSinkType = document.sinkType || 0;

    // Engine type (conventional uses non-fusion)
    const engineTypeCode = document.engineType || 0;
    const conventionalEngineType =
      ENGINE_TYPE_MAP[engineTypeCode] || ConventionalFighterEngineType.ICE;
    const engineType = engineTypeCode;

    // Armor
    const armorType = document.armorType || 0;
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

    // Tonnage limits for conventional fighters
    if (document.tonnage > 100) {
      errors.push('Conventional fighters cannot exceed 100 tons');
    }

    return {
      unitType: UnitType.CONVENTIONAL_FIGHTER,
      motionType: AerospaceMotionType.AERODYNE,
      conventionalEngineType,
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
      default:
        return AerospaceCockpitType.STANDARD;
    }
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(
    document: IBlkDocument,
  ): readonly IAerospaceMountedEquipment[] {
    const equipment: IAerospaceMountedEquipment[] = [];
    let mountId = 0;

    for (const [locationKey, items] of Object.entries(
      document.equipmentByLocation,
    )) {
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
   * Check if fighter has bomb bay
   */
  private checkBombBay(document: IBlkDocument): boolean {
    for (const items of Object.values(document.equipmentByLocation)) {
      for (const item of items) {
        if (item.toLowerCase().includes('bomb')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Combine common and conventional fighter-specific fields
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IConventionalFighter>,
  ): IConventionalFighter {
    const weightClass = this.getWeightClass(commonFields.tonnage);
    const techBase = this.parseTechBase(commonFields.techBase);
    const rulesLevel = this.parseRulesLevel(commonFields.techBase);

    return {
      // Identity
      id: `conv-fighter-${Date.now()}`,
      name: `${commonFields.chassis} ${commonFields.model}`.trim(),

      // Classification
      unitType: UnitType.CONVENTIONAL_FIGHTER,
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

      // Calculated values
      bv: 0,
      cost: 0,
      totalWeight: commonFields.tonnage,
      remainingTonnage: 0,
      isValid: true,
      validationErrors: [],

      // Conventional fighter-specific fields
      ...typeSpecificFields,
    } as IConventionalFighter;
  }

  /**
   * Determine weight class from tonnage
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
    return RulesLevel.STANDARD;
  }

  /**
   * Serialize conventional fighter-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IConventionalFighter,
  ): Partial<ISerializedUnit> {
    return {
      configuration: `Conventional Fighter (${unit.conventionalEngineType})`,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(
    _serialized: ISerializedUnit,
  ): IUnitParseResult<IConventionalFighter> {
    return createFailureResult([
      'Conventional Fighter deserialization not yet implemented',
    ]);
  }

  /**
   * Validate conventional fighter-specific rules
   */
  protected validateTypeSpecificRules(unit: IConventionalFighter): {
    errors: string[];
    warnings: string[];
    infos: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Tonnage limits
    if (unit.tonnage < 5) {
      errors.push('Conventional fighter tonnage must be at least 5 tons');
    }
    if (unit.tonnage > 100) {
      errors.push('Conventional fighter tonnage cannot exceed 100 tons');
    }

    // Thrust validation
    if (unit.movement.safeThrust < 1) {
      errors.push('Conventional fighters must have at least 1 safe thrust');
    }

    // SI validation (can be lower than aerospace fighters)
    if (unit.structuralIntegrity < 1) {
      errors.push('Conventional fighters must have at least 1 SI');
    }

    // Atmosphere-only warning
    infos.push('Conventional fighters cannot operate in space');

    return { errors, warnings, infos };
  }

  /**
   * Calculate conventional fighter weight
   */
  protected calculateTypeSpecificWeight(unit: IConventionalFighter): number {
    let weight = 0;

    // Engine weight (conventional uses ICE/turbine)
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    weight += thrustRating * 0.08; // Heavier than fusion

    // Structural weight
    weight += unit.tonnage * 0.1;

    // Armor weight
    weight += unit.totalArmorPoints / 16;

    // Fuel weight (conventional needs more fuel)
    weight += unit.fuel / 100; // Simplified

    // Cockpit
    weight += 2;

    return weight;
  }

  /**
   * Calculate conventional fighter BV
   */
  protected calculateTypeSpecificBV(unit: IConventionalFighter): number {
    let bv = 0;

    // Armor BV (reduced compared to ASF)
    bv += unit.totalArmorPoints * 1.5;

    // SI contributes
    bv += unit.structuralIntegrity * 5;

    // Thrust modifier
    const thrustMod = 1 + (unit.movement.safeThrust - 5) * 0.03;
    bv *= thrustMod;

    return Math.round(bv);
  }

  /**
   * Calculate conventional fighter cost
   */
  protected calculateTypeSpecificCost(unit: IConventionalFighter): number {
    // Conventional fighters are cheaper than aerospace fighters
    let cost = 0;

    // Base structure cost
    cost += unit.tonnage * 20000;

    // Engine cost (cheaper than fusion)
    const thrustRating = unit.movement.safeThrust * unit.tonnage;
    cost += thrustRating * 3000;

    // Armor cost
    cost += unit.totalArmorPoints * 5000;

    // Avionics
    cost += 50000;

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create Conventional Fighter handler instance
 */
export function createConventionalFighterHandler(): ConventionalFighterUnitHandler {
  return new ConventionalFighterUnitHandler();
}
