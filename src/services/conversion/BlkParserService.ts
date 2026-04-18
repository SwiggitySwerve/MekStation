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
  BLK_UNIT_TYPE_MAP,
  BLK_EQUIPMENT_BLOCK_TAGS,
  type BlkDispatchParseResult,
  type IVehicleBlkResult,
  type IAerospaceBlkResult,
  type IBattleArmorBlkResult,
  type IInfantryBlkResult,
  type IProtoMechBlkResult,
} from '../../types/formats/BlkFormat';
import { UnitType } from '../../types/unit/BattleMechInterfaces';
import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';

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
      const cleanContent = this.removeComments(blkContent);

      // Extract all tags
      const rawTags = this.extractTags(cleanContent);

      // Get required fields
      const blockVersion = this.parseNumber(rawTags['BlockVersion']) ?? 1;
      const version = this.getString(rawTags['Version']) ?? 'MAM0';
      const unitTypeStr = this.getString(rawTags['UnitType']);

      if (!unitTypeStr) {
        errors.push('Missing required field: UnitType');
        return { success: false, error: { errors, warnings } };
      }

      const mappedUnitType = this.mapUnitType(unitTypeStr);
      if (!mappedUnitType) {
        errors.push(`Unknown unit type: ${unitTypeStr}`);
        return { success: false, error: { errors, warnings } };
      }

      const name = this.getString(rawTags['Name']);
      if (!name) {
        errors.push('Missing required field: Name');
        return { success: false, error: { errors, warnings } };
      }

      const model =
        this.getString(rawTags['Model']) ??
        this.getString(rawTags['model']) ??
        '';
      // Tonnage is required for most unit types but absent in Battle Armor and
      // Infantry BLK files (those units use per-trooper/per-soldier weight).
      // Default to 0 for those types so the document parses successfully.
      const TONLESS_TYPES = new Set(['BattleArmor', 'Infantry']);
      const tonnageRaw =
        this.parseNumber(rawTags['Tonnage']) ??
        this.parseNumber(rawTags['tonnage']);

      if (tonnageRaw === undefined && !TONLESS_TYPES.has(unitTypeStr)) {
        errors.push('Missing required field: Tonnage');
        return { success: false, error: { errors, warnings } };
      }
      const tonnage = tonnageRaw ?? 0;

      const year = this.parseNumber(rawTags['year']);
      if (year === undefined) {
        errors.push('Missing required field: year');
        return { success: false, error: { errors, warnings } };
      }

      // Parse armor array
      const armor = this.parseArmorArray(rawTags['armor'] ?? rawTags['Armor']);

      // Parse equipment blocks
      const equipmentByLocation = this.parseEquipmentBlocks(rawTags);

      // Build document
      const document: IBlkDocument = {
        blockVersion,
        version,
        unitType: unitTypeStr,
        mappedUnitType,
        name,
        model,
        mulId: this.parseNumber(rawTags['mul id:']),
        year,
        originalBuildYear: this.parseNumber(rawTags['originalBuildYear']),
        type: this.getString(rawTags['type']) ?? 'Unknown',
        role: this.getString(rawTags['role']),
        motionType: this.getString(rawTags['motion_type']),
        source: this.getString(rawTags['source']),
        tonnage,
        cruiseMP: this.parseNumber(rawTags['cruiseMP']),
        jumpingMP: this.parseNumber(rawTags['jumpingMP']),
        safeThrust: this.parseNumber(rawTags['SafeThrust']),
        heatsinks: this.parseNumber(rawTags['heatsinks']),
        sinkType: this.parseNumber(rawTags['sink_type']),
        fuel: this.parseNumber(rawTags['fuel']),
        structuralIntegrity: this.parseNumber(rawTags['structural_integrity']),
        engineType: this.parseNumber(rawTags['engine_type']),
        armorType: this.parseNumber(rawTags['armor_type']),
        armorTech: this.parseNumber(rawTags['armor_tech']),
        internalType: this.parseNumber(rawTags['internal_type']),
        cockpitType: this.parseNumber(rawTags['cockpit_type']),
        armor,
        barRating: this.parseNumber(rawTags['barrating']),
        equipmentByLocation,
        // Battle Armor specific
        chassis: this.getString(rawTags['chassis']),
        trooperCount: this.parseNumber(rawTags['Trooper Count']),
        weightClass: this.parseNumber(rawTags['weightclass']),
        // Infantry specific
        squadSize: this.parseNumber(rawTags['squad_size']),
        squadn: this.parseNumber(rawTags['squadn']),
        primary: this.getString(rawTags['Primary']),
        secondary: this.getString(rawTags['Secondary']),
        secondn: this.parseNumber(rawTags['secondn']),
        armorKit: this.getString(rawTags['armorKit']),
        // Capital ship specific
        designType: this.parseNumber(rawTags['designtype']),
        crew: this.parseNumber(rawTags['crew']),
        officers: this.parseNumber(rawTags['officers']),
        gunners: this.parseNumber(rawTags['gunners']),
        passengers: this.parseNumber(rawTags['passengers']),
        marines: this.parseNumber(rawTags['marines']),
        battlearmor: this.parseNumber(rawTags['battlearmor']),
        otherpassenger: this.parseNumber(rawTags['otherpassenger']),
        lifeBoat: this.parseNumber(rawTags['life_boat']),
        escapePod: this.parseNumber(rawTags['escape_pod']),
        transporters: this.parseTransporters(rawTags['transporters']),
        // Fluff
        overview: this.getString(rawTags['overview']),
        capabilities: this.getString(rawTags['capabilities']),
        deployment: this.getString(rawTags['deployment']),
        history: this.getString(rawTags['history']),
        manufacturer: this.getString(rawTags['manufacturer']),
        primaryFactory: this.getString(rawTags['primaryFactory']),
        // Quirks
        quirks: this.parseQuirks(rawTags['quirks']),
        weaponQuirks: this.parseWeaponQuirks(rawTags['weapon_quirks']),
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

  /**
   * Remove comments (lines starting with #)
   */
  private removeComments(content: string): string {
    return content
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');
  }

  /**
   * Extract all tags from content
   */
  private extractTags(content: string): Record<string, string | string[]> {
    const tags: Record<string, string | string[]> = {};

    // Match <TagName>...content...</TagName> patterns
    // Supports multi-line content
    const tagPattern = /<([^>]+)>\s*([\s\S]*?)\s*<\/\1>/g;

    let match;
    while ((match = tagPattern.exec(content)) !== null) {
      const tagName = match[1].trim();
      const tagContent = match[2].trim();

      // Check if this is an equipment block (has multiple lines)
      if (this.isEquipmentBlock(tagName)) {
        tags[tagName] = tagContent
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      } else if (tagContent.includes('\n')) {
        // Multi-line value - could be armor array or equipment
        const lines = tagContent
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        // If all lines are numbers, keep as array for armor
        if (lines.every((line) => !isNaN(parseFloat(line)))) {
          tags[tagName] = tagContent;
        } else {
          tags[tagName] = lines;
        }
      } else {
        tags[tagName] = tagContent;
      }
    }

    return tags;
  }

  /**
   * Check if tag name is an equipment block
   */
  private isEquipmentBlock(tagName: string): boolean {
    return BLK_EQUIPMENT_BLOCK_TAGS.some(
      (block) => tagName.toLowerCase() === block.toLowerCase(),
    );
  }

  /**
   * Map BLK unit type string to UnitType enum
   */
  private mapUnitType(unitTypeStr: string): UnitType | undefined {
    // Direct mapping
    if (BLK_UNIT_TYPE_MAP[unitTypeStr]) {
      return BLK_UNIT_TYPE_MAP[unitTypeStr];
    }

    // Case-insensitive search
    const lowerStr = unitTypeStr.toLowerCase();
    for (const [key, value] of Object.entries(BLK_UNIT_TYPE_MAP)) {
      if (key.toLowerCase() === lowerStr) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Get string value from tag
   */
  private getString(value: string | string[] | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value.join('\n');
    return value.trim() || undefined;
  }

  /**
   * Parse number from tag value
   */
  private parseNumber(
    value: string | string[] | undefined,
  ): number | undefined {
    if (value === undefined) return undefined;
    const str = Array.isArray(value) ? value[0] : value;
    const num = parseFloat(str);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse armor array from multi-line value
   */
  private parseArmorArray(
    value: string | string[] | undefined,
  ): readonly number[] {
    if (value === undefined) return [];

    const str = Array.isArray(value) ? value.join('\n') : value;
    return str
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => parseFloat(line))
      .filter((num) => !isNaN(num));
  }

  /**
   * Parse equipment blocks from raw tags
   */
  private parseEquipmentBlocks(
    rawTags: Record<string, string | string[]>,
  ): Record<string, readonly string[]> {
    const equipment: Record<string, string[]> = {};

    for (const [tagName, value] of Object.entries(rawTags)) {
      if (this.isEquipmentBlock(tagName)) {
        const locationName = tagName.replace(/ Equipment$/, '');
        const items = Array.isArray(value)
          ? value
          : value
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => line.length > 0);

        equipment[locationName] = items;
      }
    }

    return equipment;
  }

  /**
   * Parse transporters/bays from tag
   */
  private parseTransporters(
    value: string | string[] | undefined,
  ): readonly string[] | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value.filter((v) => v.length > 0);

    const items = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return items.length > 0 ? items : undefined;
  }

  /**
   * Parse quirks from tag
   */
  private parseQuirks(
    value: string | string[] | undefined,
  ): readonly string[] | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value.filter((v) => v.length > 0);

    const items = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return items.length > 0 ? items : undefined;
  }

  private parseWeaponQuirks(
    value: string | string[] | undefined,
  ): Readonly<Record<string, readonly string[]>> | undefined {
    if (value === undefined) return undefined;

    const lines = Array.isArray(value)
      ? value
      : value
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

    const result: Record<string, string[]> = {};
    for (const entry of lines) {
      const colonIdx = entry.indexOf(':');
      if (colonIdx < 0) continue;

      const quirkName = entry.substring(0, colonIdx).trim();
      const weaponName = entry.substring(colonIdx + 1).trim();
      if (!quirkName || !weaponName) continue;

      if (!result[weaponName]) {
        result[weaponName] = [];
      }
      result[weaponName].push(quirkName);
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  // ============================================================================
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
      isGlider: motionType.toLowerCase() === 'glider',
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
