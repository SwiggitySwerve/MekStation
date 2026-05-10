/**
 * BLK Parser Service
 *
 * Parses MegaMek BLK (Building Block) files into IBlkDocument format.
 * BLK is the primary format for non-mech units in mm-data (13,000+ files).
 *
 * BLK Format:
 * - Comments start with # and are ignored
 * - Tags use XML-like syntax: <TagName>\nvalue\n</TagName>
 * - Multi-line values are supported (equipment lists, fluff text)
 * - Tags are case-sensitive
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.2
 */

import {
  IBlkDocument,
  IBlkParseResult,
  type BlkDispatchParseResult,
  type IVehicleBlkResult,
  type IAerospaceBlkResult,
  type IBattleArmorBlkResult,
  type IInfantryBlkResult,
  type IProtoMechBlkResult,
} from '../../types/formats/BlkFormat';
import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import {
  extractBlkTags,
  getBlkString,
  mapBlkUnitType,
  parseBlkArmorArray,
  parseBlkEquipmentBlocks,
  parseBlkLineList,
  parseBlkNumber,
  parseBlkWeaponQuirks,
  removeBlkComments,
} from './BlkParserService.helpers';

/**
 * BLK Parser Service
 */
export class BlkParserService {
  /**
   * Parse raw BLK file content into IBlkDocument
   */
  parse(blkContent: string): IBlkParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Remove comments and normalize line endings
      const cleanContent = removeBlkComments(blkContent);

      // Extract all tags
      const rawTags = extractBlkTags(cleanContent);

      // Get required fields
      const blockVersion = parseBlkNumber(rawTags['BlockVersion']) ?? 1;
      const version = getBlkString(rawTags['Version']) ?? 'MAM0';
      const unitTypeStr = getBlkString(rawTags['UnitType']);

      if (!unitTypeStr) {
        errors.push('Missing required field: UnitType');
        return { success: false, error: { errors, warnings } };
      }

      const mappedUnitType = mapBlkUnitType(unitTypeStr);
      if (!mappedUnitType) {
        errors.push(`Unknown unit type: ${unitTypeStr}`);
        return { success: false, error: { errors, warnings } };
      }

      const name = getBlkString(rawTags['Name']);
      if (!name) {
        errors.push('Missing required field: Name');
        return { success: false, error: { errors, warnings } };
      }

      const model =
        getBlkString(rawTags['Model']) ?? getBlkString(rawTags['model']) ?? '';
      // Tonnage is required for most unit types but absent in Battle Armor and
      // Infantry BLK files (those units use per-trooper/per-soldier weight).
      // Default to 0 for those types so the document parses successfully.
      const TONLESS_TYPES = new Set(['BattleArmor', 'Infantry']);
      const tonnageRaw =
        parseBlkNumber(rawTags['Tonnage']) ??
        parseBlkNumber(rawTags['tonnage']);

      if (tonnageRaw === undefined && !TONLESS_TYPES.has(unitTypeStr)) {
        errors.push('Missing required field: Tonnage');
        return { success: false, error: { errors, warnings } };
      }
      const tonnage = tonnageRaw ?? 0;

      const year = parseBlkNumber(rawTags['year']);
      if (year === undefined) {
        errors.push('Missing required field: year');
        return { success: false, error: { errors, warnings } };
      }

      // Parse armor array
      const armor = parseBlkArmorArray(rawTags['armor'] ?? rawTags['Armor']);

      // Parse equipment blocks
      const equipmentByLocation = parseBlkEquipmentBlocks(rawTags);

      // Build document
      const document: IBlkDocument = {
        blockVersion,
        version,
        unitType: unitTypeStr,
        mappedUnitType,
        name,
        model,
        mulId: parseBlkNumber(rawTags['mul id:']),
        year,
        originalBuildYear: parseBlkNumber(rawTags['originalBuildYear']),
        type: getBlkString(rawTags['type']) ?? 'Unknown',
        role: getBlkString(rawTags['role']),
        motionType: getBlkString(rawTags['motion_type']),
        source: getBlkString(rawTags['source']),
        tonnage,
        cruiseMP: parseBlkNumber(rawTags['cruiseMP']),
        jumpingMP: parseBlkNumber(rawTags['jumpingMP']),
        safeThrust: parseBlkNumber(rawTags['SafeThrust']),
        heatsinks: parseBlkNumber(rawTags['heatsinks']),
        sinkType: parseBlkNumber(rawTags['sink_type']),
        fuel: parseBlkNumber(rawTags['fuel']),
        structuralIntegrity: parseBlkNumber(rawTags['structural_integrity']),
        engineType: parseBlkNumber(rawTags['engine_type']),
        armorType: parseBlkNumber(rawTags['armor_type']),
        armorTech: parseBlkNumber(rawTags['armor_tech']),
        internalType: parseBlkNumber(rawTags['internal_type']),
        cockpitType: parseBlkNumber(rawTags['cockpit_type']),
        armor,
        barRating: parseBlkNumber(rawTags['barrating']),
        equipmentByLocation,
        // Battle Armor specific
        chassis: getBlkString(rawTags['chassis']),
        trooperCount: parseBlkNumber(rawTags['Trooper Count']),
        weightClass: parseBlkNumber(rawTags['weightclass']),
        // Infantry specific
        squadSize: parseBlkNumber(rawTags['squad_size']),
        squadn: parseBlkNumber(rawTags['squadn']),
        primary: getBlkString(rawTags['Primary']),
        secondary: getBlkString(rawTags['Secondary']),
        secondn: parseBlkNumber(rawTags['secondn']),
        armorKit: getBlkString(rawTags['armorKit']),
        // Capital ship specific
        designType: parseBlkNumber(rawTags['designtype']),
        crew: parseBlkNumber(rawTags['crew']),
        officers: parseBlkNumber(rawTags['officers']),
        gunners: parseBlkNumber(rawTags['gunners']),
        passengers: parseBlkNumber(rawTags['passengers']),
        marines: parseBlkNumber(rawTags['marines']),
        battlearmor: parseBlkNumber(rawTags['battlearmor']),
        otherpassenger: parseBlkNumber(rawTags['otherpassenger']),
        lifeBoat: parseBlkNumber(rawTags['life_boat']),
        escapePod: parseBlkNumber(rawTags['escape_pod']),
        transporters: parseBlkLineList(rawTags['transporters']),
        // Fluff
        overview: getBlkString(rawTags['overview']),
        capabilities: getBlkString(rawTags['capabilities']),
        deployment: getBlkString(rawTags['deployment']),
        history: getBlkString(rawTags['history']),
        manufacturer: getBlkString(rawTags['manufacturer']),
        primaryFactory: getBlkString(rawTags['primaryFactory']),
        // Quirks
        quirks: parseBlkLineList(rawTags['quirks']),
        weaponQuirks: parseBlkWeaponQuirks(rawTags['weapon_quirks']),
        // Raw tags for debugging
        rawTags,
      };

      return { success: true, data: { document, warnings } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown parse error';
      errors.push(`Parse error: ${message}`);
      return { success: false, error: { errors, warnings } };
    }
  }

  // ============================================================================
  // Per-Type Dispatcher
  // ============================================================================  // ============================================================================
  // Per-Type Dispatcher
  // ============================================================================

  /**
   * Parse a raw BLK string and dispatch to the correct per-type extractor.
   *
   * Returns a discriminated union tagged by `kind` so callers get full type
   * safety without needing to inspect the raw document.  Unsupported chassis
   * (WarShip, DropShip, JumpShip, LAM, QuadVee, Mobile Structure) are returned
   * with kind = 'unsupported' — they never cause a hard failure.
   */
  parseByUnitType(blkContent: string): BlkDispatchParseResult {
    const parsed = this.parse(blkContent);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.errors };
    }

    const doc = parsed.data.document;
    const ut = doc.unitType;

    // Unsupported chassis — skip with structured reason
    const unsupportedReasonMap: Record<string, string> = {
      Warship: 'warship',
      Jumpship: 'jumpship',
      Dropship: 'dropship',
      SpaceStation: 'spacestation',
    };
    if (ut in unsupportedReasonMap) {
      return {
        success: true,
        result: {
          kind: 'unsupported',
          data: {
            reason: unsupportedReasonMap[ut],
            name: doc.name,
            blkUnitType: ut,
          },
        },
      };
    }

    // Vehicle family: Tank, SupportTank, VTOL, SupportVTOL, Naval
    if (['Tank', 'SupportTank', 'VTOL', 'SupportVTOL', 'Naval'].includes(ut)) {
      return {
        success: true,
        result: { kind: 'vehicle', data: this.extractVehicle(doc) },
      };
    }

    // Aerospace family: Aero, AeroSpaceFighter, ConvFighter, SmallCraft
    if (
      ['Aero', 'AeroSpaceFighter', 'ConvFighter', 'SmallCraft'].includes(ut)
    ) {
      return {
        success: true,
        result: { kind: 'aerospace', data: this.extractAerospace(doc) },
      };
    }

    // Battle Armor
    if (ut === 'BattleArmor') {
      return {
        success: true,
        result: { kind: 'battlearmor', data: this.extractBattleArmor(doc) },
      };
    }

    // Infantry
    if (ut === 'Infantry') {
      return {
        success: true,
        result: { kind: 'infantry', data: this.extractInfantry(doc) },
      };
    }

    // ProtoMech (MegaMek uses both spellings)
    if (ut === 'ProtoMech' || ut === 'Protomech' || ut === 'ProtoMek') {
      return {
        success: true,
        result: { kind: 'protomech', data: this.extractProtoMech(doc) },
      };
    }

    // Everything else (BattleMech, IndustrialMech, unknown) → unsupported
    return {
      success: true,
      result: {
        kind: 'unsupported',
        data: { reason: ut.toLowerCase(), name: doc.name, blkUnitType: ut },
      },
    };
  }

  // ============================================================================
  // Per-Type Extractors (private)
  // ============================================================================

  /** Map the BLK `type` field to a canonical tech-base string. */
  private mapTechBase(typeStr: string): string {
    const lower = typeStr.toLowerCase();
    if (lower.startsWith('clan')) return 'CLAN';
    if (lower.startsWith('mixed')) return 'MIXED';
    return 'INNER_SPHERE';
  }

  /**
   * Extract vehicle-specific fields from a generic BLK document.
   * Handles Tank, VTOL, SupportTank, SupportVTOL, Naval motion types.
   */
  private extractVehicle(doc: IBlkDocument): IVehicleBlkResult {
    return {
      name: doc.name,
      model: doc.model,
      mulId: doc.mulId,
      year: doc.year,
      tonnage: doc.tonnage,
      techBase: this.mapTechBase(doc.type),
      motionType: doc.motionType ?? 'Tracked',
      cruiseMP: doc.cruiseMP ?? 0,
      jumpingMP: doc.jumpingMP ?? 0,
      armor: doc.armor,
      barRating: doc.barRating ?? 0,
      engineType: doc.engineType ?? 0,
      armorType: doc.armorType ?? 0,
      equipmentByLocation: doc.equipmentByLocation,
      role: doc.role,
      source: doc.source,
      quirks: doc.quirks,
      blkUnitType: doc.unitType,
    };
  }

  /**
   * Extract aerospace-specific fields from a generic BLK document.
   * Handles Aero, AeroSpaceFighter, ConvFighter, SmallCraft.
   *
   * maxThrust is always 2 × safeThrust for aerospace fighters per TW rules.
   */
  private extractAerospace(doc: IBlkDocument): IAerospaceBlkResult {
    const safeThrust = doc.safeThrust ?? 0;
    return {
      name: doc.name,
      model: doc.model,
      mulId: doc.mulId,
      year: doc.year,
      tonnage: doc.tonnage,
      techBase: this.mapTechBase(doc.type),
      safeThrust,
      maxThrust: safeThrust * 2,
      fuelPoints: doc.fuel ?? 0,
      structuralIntegrity: doc.structuralIntegrity ?? 0,
      heatsinks: doc.heatsinks ?? 10,
      sinkType: doc.sinkType ?? 0,
      cockpitType: doc.cockpitType ?? 0,
      armor: doc.armor,
      equipmentByLocation: doc.equipmentByLocation,
      role: doc.role,
      source: doc.source,
      quirks: doc.quirks,
      blkUnitType: doc.unitType,
    };
  }

  /**
   * Extract Battle Armor fields from a generic BLK document.
   *
   * BLK `armor` tag for BA is a single value — armor per trooper.
   * The `chassis` tag holds "biped" or "quad".
   * Equipment is in `Point Equipment` (shared) or `Trooper N Equipment` blocks.
   */
  private extractBattleArmor(doc: IBlkDocument): IBattleArmorBlkResult {
    // BA armor tag is a single numeric value: armor points per trooper
    const armorPerTrooper = doc.armor.length > 0 ? (doc.armor[0] ?? 0) : 0;

    return {
      name: doc.name,
      model: doc.model,
      mulId: doc.mulId,
      year: doc.year,
      weightClass: doc.weightClass ?? 0,
      techBase: this.mapTechBase(doc.type),
      motionType: doc.motionType ?? 'Ground',
      cruiseMP: doc.cruiseMP ?? 1,
      jumpMP: doc.jumpingMP ?? 0,
      chassis: doc.chassis ?? 'biped',
      trooperCount: doc.trooperCount ?? 4,
      armorPerTrooper,
      armorType: doc.armorType ?? 0,
      equipmentByLocation: doc.equipmentByLocation,
      role: doc.role,
      source: doc.source,
      quirks: doc.quirks,
    };
  }

  /**
   * Extract Infantry fields from a generic BLK document.
   *
   * Infantry BLK files are sparse: no equipment blocks, weapons referenced
   * by `Primary` and `Secondary` tag names (equipment IDs).
   */
  private extractInfantry(doc: IBlkDocument): IInfantryBlkResult {
    return {
      name: doc.name,
      model: doc.model,
      mulId: doc.mulId,
      year: doc.year,
      techBase: this.mapTechBase(doc.type),
      motionType: doc.motionType ?? 'Leg',
      squadSize: doc.squadSize ?? 7,
      squadCount: doc.squadn ?? 1,
      primaryWeapon: doc.primary ?? '',
      secondaryWeapon: doc.secondary,
      secondaryCount: doc.secondn ?? 0,
      armorKit: doc.armorKit,
      role: doc.role,
      source: doc.source,
    };
  }

  /**
   * Extract ProtoMech fields from a generic BLK document.
   *
   * ProtoMech armor array order: Head, Torso, Left Arm, Right Arm, Legs,
   * then optionally a 6th value for the main gun location.
   * Glider protos have motionType "Glider".
   */
  private extractProtoMech(doc: IBlkDocument): IProtoMechBlkResult {
    // motionType is the canonical chassis discriminant at the BLK boundary;
    // downstream consumers derive `glider`/`quad` flags from it instead of
    // carrying a redundant boolean field on the parsed result.
    const motionType = doc.motionType ?? 'Biped';
    return {
      name: doc.name,
      model: doc.model,
      mulId: doc.mulId,
      year: doc.year,
      tonnage: doc.tonnage,
      techBase: this.mapTechBase(doc.type),
      motionType,
      cruiseMP: doc.cruiseMP ?? 0,
      jumpMP: doc.jumpingMP ?? 0,
      armor: doc.armor,
      equipmentByLocation: doc.equipmentByLocation,
      role: doc.role,
      source: doc.source,
      quirks: doc.quirks,
    };
  }

  /**
   * Get unit type display name from BLK unit type string
   */
  getUnitTypeDisplayName(unitTypeStr: string): string {
    const mapping: Record<string, string> = {
      Tank: 'Combat Vehicle',
      SupportTank: 'Support Vehicle',
      SupportVTOL: 'Support VTOL',
      VTOL: 'VTOL',
      Naval: 'Naval Vehicle',
      Aero: 'Aerospace Fighter',
      AeroSpaceFighter: 'Aerospace Fighter',
      ConvFighter: 'Conventional Fighter',
      Dropship: 'DropShip',
      Jumpship: 'JumpShip',
      Warship: 'WarShip',
      SmallCraft: 'Small Craft',
      SpaceStation: 'Space Station',
      BattleArmor: 'Battle Armor',
      Infantry: 'Infantry',
      ProtoMech: 'ProtoMech',
      Protomech: 'ProtoMech',
      BattleMech: 'BattleMech',
      Mek: 'BattleMech',
      IndustrialMech: 'IndustrialMech',
    };
    return mapping[unitTypeStr] || unitTypeStr;
  }
}

const blkParserServiceFactory: SingletonFactory<BlkParserService> =
  createSingleton((): BlkParserService => new BlkParserService());

export function getBlkParserService(): BlkParserService {
  return blkParserServiceFactory.get();
}

export function resetBlkParserService(): void {
  blkParserServiceFactory.reset();
}
