import { getTankMaxTonnage } from '@/services/construction/constructionConstants';
/**
 * Vehicle Unit Handler
 *
 * Handler for parsing, validating, and serializing combat vehicles.
 * Supports standard vehicles (tanks), VTOLs, and naval units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.2
 */
import {
  blkEngineName,
  decodeBlkConstructionEngine,
  isClanBlkEngine,
} from '@/services/conversion/blkEngineIdentity';
import {
  blkEquipmentBlockLocation,
  isSuperHeavyTank,
  placeRejectedBlkVehicleArmor,
  resolveBlkVehicleArmor,
} from '@/services/conversion/blkVehicleArmorLayout';
import {
  SuperHeavyVehicleLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  GroundMotionType,
  IGroundMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { IUnitParseResult } from '@/types/unit/UnitTypeHandler';
import {
  IVehicle,
  IVehicleMountedEquipment,
  ITurretConfiguration,
} from '@/types/unit/VehicleInterfaces';
import { getTankMaxTotalArmor } from '@/utils/construction/vehicle/armor';
import {
  computeEngineRating,
  computeFlankMP,
  computeVehicleEngineWeight,
  validateVehicleEngine,
} from '@/utils/construction/vehicle/engine';
import {
  getPrimaryVehicleTurretType,
  getVehicleMountFlags,
} from '@/utils/construction/vehicle/equipmentMounts';

import {
  AbstractUnitTypeHandler,
  createFailureResult,
} from './AbstractUnitTypeHandler';
import {
  UnitFieldParseMessages,
  UnitValidationMessages,
  combineCommonUnitFields,
  createParseMessages,
  createValidationMessages,
  getRawTagString,
  getVehicleWeightClass,
  mapLocationEquipment,
  pushTonnageRangeErrors,
} from './unitHandlerShared';
import {
  getBooleanFromRawTags,
  hasVehicleEquipmentFeature,
} from './vehicleFeatureTags';

// ============================================================================
// Constants
// ============================================================================

/**
 * Motion type string to enum mapping
 */
const MOTION_TYPE_MAP: Record<string, GroundMotionType> = {
  tracked: GroundMotionType.TRACKED,
  wheeled: GroundMotionType.WHEELED,
  hover: GroundMotionType.HOVER,
  vtol: GroundMotionType.VTOL,
  naval: GroundMotionType.NAVAL,
  hydrofoil: GroundMotionType.HYDROFOIL,
  submarine: GroundMotionType.SUBMARINE,
  wige: GroundMotionType.WIGE,
  rail: GroundMotionType.RAIL,
  maglev: GroundMotionType.MAGLEV,
};

const VEHICLE_LOCATION_MAP: Record<
  string,
  VehicleLocation | SuperHeavyVehicleLocation
> = {
  front: VehicleLocation.FRONT,
  'front right': SuperHeavyVehicleLocation.FRONT_RIGHT,
  'front left': SuperHeavyVehicleLocation.FRONT_LEFT,
  'rear right': SuperHeavyVehicleLocation.REAR_RIGHT,
  'rear left': SuperHeavyVehicleLocation.REAR_LEFT,
  left: VehicleLocation.LEFT,
  'left side': VehicleLocation.LEFT,
  right: VehicleLocation.RIGHT,
  'right side': VehicleLocation.RIGHT,
  rear: VehicleLocation.REAR,
  turret: VehicleLocation.TURRET,
  'turret 2': VehicleLocation.TURRET_2,
  body: VehicleLocation.BODY,
};

// ============================================================================
// Vehicle Unit Handler
// ============================================================================

/**
 * Handler for combat vehicle units
 */
export class VehicleUnitHandler extends AbstractUnitTypeHandler<IVehicle> {
  readonly unitType = UnitType.VEHICLE;
  readonly displayName = 'Combat Vehicle';

  /**
   * Get available locations for vehicles
   */
  getLocations(): readonly string[] {
    return Object.values(VehicleLocation);
  }

  /**
   * Parse vehicle-specific fields from BLK document
   */
  protected parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<IVehicle> & UnitFieldParseMessages {
    const { errors, warnings } = createParseMessages();

    // Motion type
    const motionTypeStr = document.motionType?.toLowerCase() || 'tracked';
    const motionType = MOTION_TYPE_MAP[motionTypeStr];
    if (!motionType) {
      warnings.push(
        `Unknown motion type: ${document.motionType}, defaulting to Tracked`,
      );
    }

    // Movement
    // Audit 2026-06-09 C-14: flank MP rounds UP — MegaMek Entity.getRunMP is
    // ceil(walk MP * 1.5) (Tank inherits it) and the project's own BLK Python
    // converter (blk_vehicle_converter.py) uses math.ceil.
    const cruiseMP = document.cruiseMP || 0;
    const flankMP = computeFlankMP(cruiseMP);
    const jumpMP = document.jumpingMP || 0;
    const movement: IGroundMovement = { cruiseMP, flankMP, jumpMP };

    // Engine
    const engineType = document.engineType ?? 0;
    const clanEngine = isClanBlkEngine(
      document.type,
      document.rawTags?.clan_engine,
    );
    try {
      decodeBlkConstructionEngine(engineType, clanEngine);
    } catch (error) {
      errors.push(String(error));
    }
    const engineRating =
      errors.length > 0
        ? 0
        : this.getEngineRating(
            document.tonnage,
            cruiseMP,
            motionType ?? GroundMotionType.TRACKED,
            engineType,
          );

    // Armor
    const armorType = document.armorType || 0;
    const armor = document.armor || [];
    const layoutArmor = resolveBlkVehicleArmor(
      document.unitType,
      document.motionType || 'Tracked',
      document.tonnage,
      armor,
    );
    const placed = layoutArmor
      ? { byLocation: layoutArmor, warning: undefined }
      : placeRejectedBlkVehicleArmor(
          document.unitType,
          document.motionType || 'Tracked',
          document.tonnage,
          armor,
        );
    if (placed.warning) warnings.push(placed.warning);
    const armorByLocation = this.parseArmorByLocation(placed.byLocation);
    const totalArmorPoints = armor.reduce((sum, val) => sum + val, 0);

    // Turret configuration
    const turret = this.parseTurretConfiguration(document, layoutArmor);

    // Equipment
    const equipment = this.parseEquipment(document);

    // Vehicle-specific flags
    const isSuperheavy = isSuperHeavyTank(
      document.motionType || 'Tracked',
      document.tonnage,
    );

    // Parse raw tags for additional fields
    const rawTags = document.rawTags || {};
    const hasEnvironmentalSealing = getBooleanFromRawTags(
      rawTags,
      'environmentalsealing',
    );
    const hasFlotationHull =
      getBooleanFromRawTags(rawTags, 'flotationhull') ||
      hasVehicleEquipmentFeature(equipment, 'flotationhull');
    const isAmphibious =
      getBooleanFromRawTags(rawTags, 'amphibious') ||
      getBooleanFromRawTags(rawTags, 'fullyamphibious') ||
      hasVehicleEquipmentFeature(equipment, 'fullyamphibious');
    const limitedAmphibious =
      getBooleanFromRawTags(rawTags, 'limitedamphibious') ||
      hasVehicleEquipmentFeature(equipment, 'limitedamphibious');
    const hasTrailerHitch = getBooleanFromRawTags(rawTags, 'trailerhitch');
    const isTrailer = getBooleanFromRawTags(rawTags, 'trailer');

    // Internal structure type
    const internalStructureType = document.internalType || 0;

    return {
      unitType: UnitType.VEHICLE,
      motionType: motionType || GroundMotionType.TRACKED,
      movement,
      engineType,
      clanEngine,
      engineRating,
      armorType,
      armor,
      armorByLocation,
      totalArmorPoints,
      maxArmorPoints: this.calculateMaxArmor(document.tonnage),
      turret,
      equipment,
      internalStructureType,
      isSuperheavy,
      hasEnvironmentalSealing,
      hasFlotationHull,
      isAmphibious,
      limitedAmphibious,
      hasTrailerHitch,
      isTrailer,
      errors,
      warnings,
    };
  }

  /**
   * Armor in MegaMek's layout for this chassis (six sides for SuperHeavy,
   * Turret 2 for dual turrets), over zeroes for the standard locations
   */
  private parseArmorByLocation(
    layoutArmor: Readonly<Record<string, number>>,
  ): IVehicle['armorByLocation'] {
    const result: Record<string, number> = {
      [VehicleLocation.FRONT]: 0,
      [VehicleLocation.LEFT]: 0,
      [VehicleLocation.RIGHT]: 0,
      [VehicleLocation.REAR]: 0,
      [VehicleLocation.TURRET]: 0,
      [VehicleLocation.TURRET_2]: 0,
      [VehicleLocation.BODY]: 0,
    };

    return Object.assign(result, layoutArmor) as IVehicle['armorByLocation'];
  }

  /**
   * Parse turret configuration from document
   */
  private parseTurretConfiguration(
    document: IBlkDocument,
    layoutArmor: Readonly<Record<string, number>> | undefined,
  ): ITurretConfiguration | undefined {
    // A turret exists when MegaMek's armor layout has a Turret value, a dual
    // turret when it also has Turret 2 (BLKTankFile.java:185-186,191-192);
    // turret equipment under a plain Turret block also counts.
    const rawTags = document.rawTags || {};
    const type = getPrimaryVehicleTurretType(
      Object.keys(document.equipmentByLocation).filter(
        (location) => document.equipmentByLocation[location]?.length > 0,
      ),
      this.getStringFromRaw(rawTags, 'turrettype'),
      {
        hasTurret: layoutArmor?.[VehicleLocation.TURRET] !== undefined,
        hasSecondTurret: layoutArmor?.[VehicleLocation.TURRET_2] !== undefined,
      },
    );
    if (type === undefined) return undefined;

    // Calculate turret weight (simplified - full calculation would need equipment data)
    const turretWeightFraction = 0.1; // 10% of weapons in turret typically
    const maxWeight = document.tonnage * turretWeightFraction;

    return {
      type,
      maxWeight,
      currentWeight: 0, // Would be calculated from actual equipment
      rotationArc: 360,
    };
  }

  /**
   * Parse equipment from BLK document
   */
  private parseEquipment(
    document: IBlkDocument,
  ): readonly IVehicleMountedEquipment[] {
    return mapLocationEquipment(
      document.equipmentByLocation,
      (locationKey) => this.normalizeLocation(locationKey),
      ({ mountId, item, location, locationKey }) => ({
        id: `mount-${mountId}`,
        equipmentId: item,
        name: item,
        location,
        ...getVehicleMountFlags(locationKey),
      }),
    );
  }

  /**
   * Normalize location string to VehicleLocation enum
   */
  private normalizeLocation(
    locationKey: string,
  ): VehicleLocation | SuperHeavyVehicleLocation {
    const block = locationKey.replace(/ equipment$/i, '');
    const normalized = blkEquipmentBlockLocation(block).toLowerCase();
    return VEHICLE_LOCATION_MAP[normalized] || VehicleLocation.BODY;
  }

  /**
   * Calculate maximum armor points for vehicle tonnage
   * (TestTank.java:338: tonnage * 7 / 2 + 40, rounded down)
   */
  private calculateMaxArmor(tonnage: number): number {
    return getTankMaxTotalArmor(tonnage);
  }

  /**
   * Get string value from raw tags
   */
  private getStringFromRaw(
    rawTags: Record<string, string | string[]>,
    key: string,
  ): string | undefined {
    return getRawTagString(rawTags, key);
  }

  /**
   * Combine common and vehicle-specific fields into IVehicle
   */
  protected combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<IVehicle>,
  ): IVehicle {
    // Determine weight class
    const weightClass = getVehicleWeightClass(commonFields.tonnage);

    return combineCommonUnitFields<IVehicle>({
      commonFields,
      typeSpecificFields,
      idPrefix: 'vehicle',
      unitType: UnitType.VEHICLE,
      weightClass,
    });
  }

  /**
   * Serialize vehicle-specific fields
   */
  protected serializeTypeSpecificFields(
    unit: IVehicle,
  ): Partial<ISerializedUnit> {
    // Vehicle-specific serialization would go here
    // For now, return empty as full serialization is complex
    return {
      configuration: unit.motionType,
      rulesLevel: String(unit.rulesLevel),
    };
  }

  /**
   * Deserialize from standard format
   */
  deserialize(_serialized: ISerializedUnit): IUnitParseResult<IVehicle> {
    // Full deserialization would require mapping all serialized fields back
    return createFailureResult(['Vehicle deserialization not yet implemented']);
  }

  /**
   * Validate vehicle-specific rules
   */
  protected validateTypeSpecificRules(unit: IVehicle): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    // Tonnage limits
    pushTonnageRangeErrors(errors, unit.tonnage, {
      label: 'Vehicle',
      min: 1,
      max: getTankMaxTonnage(unit.motionType, unit.isSuperheavy),
      minText: '1',
    });

    // Movement validation
    if (unit.movement.cruiseMP < 1 && !unit.isTrailer) {
      errors.push('Non-trailer vehicles must have at least 1 cruise MP');
    }

    if (blkEngineName(unit.engineType) === 'NONE') {
      errors.push(
        ...validateVehicleEngine(
          unit.tonnage,
          unit.movement.cruiseMP,
          null,
          unit.motionType,
        ).errors.map(({ message }) => message),
      );
    }

    // Armor validation
    if (unit.totalArmorPoints > unit.maxArmorPoints) {
      errors.push(
        `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`,
      );
    }

    // Turret validation
    if (unit.turret && unit.turret.currentWeight > unit.turret.maxWeight) {
      errors.push('Turret weight exceeds maximum capacity');
    }

    // Motion type specific validations
    if (unit.motionType === GroundMotionType.HOVER && unit.tonnage > 50) {
      warnings.push('Hover vehicles over 50 tons are rare');
    }

    return { errors, warnings, infos };
  }

  /**
   * Calculate vehicle weight
   */
  protected calculateTypeSpecificWeight(unit: IVehicle): number {
    let weight = 0;

    const engineType = decodeBlkConstructionEngine(
      unit.engineType,
      unit.clanEngine ?? isClanBlkEngine(String(unit.techBase)),
    );
    const engineRating = this.getEngineRating(
      unit.tonnage,
      unit.movement.cruiseMP,
      unit.motionType,
      unit.engineType,
    );
    weight += computeVehicleEngineWeight(engineRating, engineType, {
      tonnage: unit.tonnage,
      motionType: unit.motionType,
    });

    // Structural weight (10% of tonnage for most vehicles)
    weight += unit.tonnage * 0.1;

    // Armor weight (1 point = 0.0625 tons for standard armor)
    const armorPointsPerTon = 16; // Standard armor
    weight += unit.totalArmorPoints / armorPointsPerTon;

    // Turret weight (10% of turret-mounted weapons)
    if (unit.turret) {
      weight += unit.turret.currentWeight * 0.1;
    }

    // Equipment weight would be added here

    return weight;
  }

  private getEngineRating(
    tonnage: number,
    cruiseMP: number,
    motionType: GroundMotionType,
    engineType: number,
  ): number {
    // BLKTankFile.java:155-162 checks the shared BLKFile.NONE identity; trailer is independent.
    return computeEngineRating(
      tonnage,
      cruiseMP,
      motionType,
      blkEngineName(engineType) === 'NONE',
    );
  }

  /**
   * Calculate vehicle BV
   */
  protected calculateTypeSpecificBV(unit: IVehicle): number {
    // Simplified BV calculation
    // Full calculation would involve weapon BV, armor BV, movement modifiers
    let bv = 0;

    // Base armor BV (2.5 points per armor point for vehicles)
    bv += unit.totalArmorPoints * 2.5;

    // Movement modifier (higher MP = higher BV)
    const movementMod = 1 + (unit.movement.cruiseMP - 1) * 0.1;
    bv *= movementMod;

    // Equipment BV would be added here

    return Math.round(bv);
  }

  /**
   * Calculate vehicle cost
   */
  protected calculateTypeSpecificCost(unit: IVehicle): number {
    // Simplified cost calculation
    let cost = 0;

    // Base structure cost
    cost += unit.tonnage * 10000;

    // Engine cost (varies by type)
    const engineRating = this.getEngineRating(
      unit.tonnage,
      unit.movement.cruiseMP,
      unit.motionType,
      unit.engineType,
    );
    cost += engineRating * 5000;

    // Armor cost
    cost += unit.totalArmorPoints * 10000;

    // Equipment cost would be added here

    return Math.round(cost);
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Create and optionally register the vehicle handler
 */
export function createVehicleHandler(): VehicleUnitHandler {
  return new VehicleUnitHandler();
}
