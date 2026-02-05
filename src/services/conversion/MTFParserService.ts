/**
 * MTF Parser Service
 *
 * Parses raw MTF (MegaMek Text Format) files into ISerializedUnit format.
 * Used for parity validation against canonical mm-data source files.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import {
  ISerializedUnit,
  ISerializedFluff,
} from '@/types/unit/UnitSerialization';
/**
 * Result of parsing an MTF file
 */
export interface IMTFParseResult {
  readonly success: boolean;
  readonly unit?: ISerializedUnit;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Location header patterns in MTF files
 * Supports both biped and quad configurations
 */
const LOCATION_HEADERS: Record<string, string> = {
  // Biped locations
  'Left Arm:': 'LEFT_ARM',
  'Right Arm:': 'RIGHT_ARM',
  'Left Torso:': 'LEFT_TORSO',
  'Right Torso:': 'RIGHT_TORSO',
  'Center Torso:': 'CENTER_TORSO',
  'Head:': 'HEAD',
  'Left Leg:': 'LEFT_LEG',
  'Right Leg:': 'RIGHT_LEG',
  // Quad locations
  'Front Left Leg:': 'FRONT_LEFT_LEG',
  'Front Right Leg:': 'FRONT_RIGHT_LEG',
  'Rear Left Leg:': 'REAR_LEFT_LEG',
  'Rear Right Leg:': 'REAR_RIGHT_LEG',
  // Tripod locations
  'Center Leg:': 'CENTER_LEG',
};

/**
 * Slot counts per location for all mech configurations
 */
const SLOT_COUNTS: Record<string, number> = {
  // Biped locations
  HEAD: 6,
  CENTER_TORSO: 12,
  LEFT_TORSO: 12,
  RIGHT_TORSO: 12,
  LEFT_ARM: 12,
  RIGHT_ARM: 12,
  LEFT_LEG: 6,
  RIGHT_LEG: 6,
  // Quad locations (6 slots each for legs)
  FRONT_LEFT_LEG: 6,
  FRONT_RIGHT_LEG: 6,
  REAR_LEFT_LEG: 6,
  REAR_RIGHT_LEG: 6,
  // Tripod locations
  CENTER_LEG: 6,
};

/**
 * MTF Parser Service
 */
export class MTFParserService {
  private static instance: MTFParserService | null = null;

  private constructor() {}

  static getInstance(): MTFParserService {
    if (!MTFParserService.instance) {
      MTFParserService.instance = new MTFParserService();
    }
    return MTFParserService.instance;
  }

  /**
   * Parse raw MTF text content into ISerializedUnit
   */
  parse(mtfContent: string): IMTFParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const lines = mtfContent.split(/\r?\n/);

      // Parse header fields
      const header = this.parseHeader(lines);
      // Only chassis is required - model can be empty (many MTF files have `model:` with no value)
      if (!header.chassis) {
        errors.push('Missing required field: chassis');
        return { success: false, errors, warnings };
      }

      // Parse structural components
      const mass = this.parseField(lines, 'mass');
      const engine = this.parseEngine(lines);
      const structure = this.parseField(lines, 'structure') || 'IS Standard';
      // Myomer parsed but not yet used - will be used for TSM/MASC detection
      const _myomer = this.parseField(lines, 'myomer') || 'Standard';

      // Parse heat sinks
      const heatSinks = this.parseHeatSinks(lines);

      // Parse movement
      const walkMP = parseInt(this.parseField(lines, 'walk mp') || '0', 10);
      const jumpMP = parseInt(this.parseField(lines, 'jump mp') || '0', 10);

      // Parse armor
      const armor = this.parseArmor(lines);

      // Parse weapons
      const equipment = this.parseWeapons(lines);

      // Parse critical slots
      const criticalSlots = this.parseCriticalSlots(lines);

      // Parse quirks
      const quirks = this.parseQuirks(lines);

      // Parse fluff
      const fluff = this.parseFluff(lines);

      // Generate unit ID
      const id = this.generateUnitId(header.chassis, header.model);

      // Map era to our format
      const era = this.mapEraFromYear(header.year);

      // Map tech base
      const techBase = this.mapTechBase(header.techBase);

      // Map rules level
      const rulesLevel = this.mapRulesLevel(header.rulesLevel);

      // Normalize configuration to remove "Omnimech" suffix for base config
      const baseConfig =
        header.config.replace(/\s*omnimech\s*/i, '').trim() || 'Biped';

      const unit: ISerializedUnit = {
        id,
        chassis: header.chassis,
        model: header.model,
        unitType: 'BattleMech',
        configuration: baseConfig,
        techBase,
        rulesLevel,
        era,
        year: header.year,
        tonnage: parseInt(mass || '0', 10),
        engine: {
          type: this.mapEngineType(engine.type),
          rating: engine.rating,
        },
        gyro: {
          type: 'STANDARD', // Default, could be parsed from crits
        },
        cockpit: 'STANDARD', // Default
        structure: {
          type: this.mapStructureType(structure),
        },
        armor: {
          type: this.mapArmorType(armor.type),
          allocation: armor.allocation,
        },
        heatSinks: {
          type: heatSinks.type === 'Double' ? 'DOUBLE' : 'SINGLE',
          count: heatSinks.count,
        },
        movement: {
          walk: walkMP,
          jump: jumpMP,
        },
        equipment,
        criticalSlots,
        quirks: quirks.length > 0 ? quirks : undefined,
        fluff: Object.keys(fluff).length > 0 ? fluff : undefined,
        // OmniMech-specific fields
        isOmni: header.isOmni || undefined,
        baseChassisHeatSinks: header.baseChassisHeatSinks,
        clanName: header.clanname,
      };

      // Add extra fields for round-trip
      const extendedUnit = {
        ...unit,
        mulId: header.mulId,
        role: header.role,
        source: header.source,
      };

      return {
        success: true,
        unit: extendedUnit as ISerializedUnit,
        errors,
        warnings,
      };
    } catch (e) {
      errors.push(`Parse error: ${e}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Parse header fields from MTF
   */
  private parseHeader(lines: string[]): {
    chassis: string;
    model: string;
    config: string;
    techBase: string;
    year: number;
    rulesLevel: string;
    mulId?: number;
    role?: string;
    source?: string;
    clanname?: string;
    isOmni: boolean;
    baseChassisHeatSinks?: number;
  } {
    const chassis = this.parseField(lines, 'chassis') || '';
    const model = this.parseField(lines, 'model');
    const clanname = this.parseField(lines, 'clanname');
    const config = this.parseField(lines, 'Config') || 'Biped';

    // Detect OmniMech from Config field (e.g., "Biped Omnimech", "Quad Omnimech")
    const isOmni = config.toLowerCase().includes('omnimech');

    // Parse Base Chassis Heat Sinks (only present for OmniMechs)
    const baseHSField = this.parseField(lines, 'Base Chassis Heat Sinks');
    const baseChassisHeatSinks = baseHSField
      ? parseInt(baseHSField, 10)
      : undefined;

    return {
      chassis,
      model: model || '',
      config,
      techBase: this.parseField(lines, 'techbase') || 'Inner Sphere',
      year: parseInt(this.parseField(lines, 'era') || '3025', 10),
      rulesLevel: this.parseField(lines, 'rules level') || '2',
      mulId: parseInt(this.parseField(lines, 'mul id') || '0', 10) || undefined,
      role: this.parseField(lines, 'role') || undefined,
      source: this.parseField(lines, 'source') || undefined,
      clanname,
      isOmni,
      baseChassisHeatSinks,
    };
  }

  /**
   * Parse a simple key:value field
   */
  private parseField(lines: string[], fieldName: string): string | undefined {
    const pattern = new RegExp(`^${fieldName}:(.*)$`, 'i');
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Parse engine information
   */
  private parseEngine(lines: string[]): { type: string; rating: number } {
    const engineLine = this.parseField(lines, 'engine');
    if (!engineLine) {
      return { type: 'Fusion', rating: 0 };
    }

    // Format: "280 Fusion Engine(IS)" or "300 XL Engine"
    const match = engineLine.match(/^(\d+)\s+(.+)$/);
    if (match) {
      return {
        rating: parseInt(match[1], 10),
        type: match[2].trim(),
      };
    }

    return { type: engineLine, rating: 0 };
  }

  /**
   * Parse heat sinks
   */
  private parseHeatSinks(lines: string[]): { type: string; count: number } {
    const hsLine = this.parseField(lines, 'heat sinks');
    if (!hsLine) {
      return { type: 'Single', count: 10 };
    }

    // Format: "10 Single" or "12 Double"
    const match = hsLine.match(/^(\d+)\s+(.+)$/);
    if (match) {
      return {
        count: parseInt(match[1], 10),
        type: match[2].trim(),
      };
    }

    return { type: 'Single', count: 10 };
  }

  /**
   * Parse armor values
   */
  private parseArmor(lines: string[]): {
    type: string;
    allocation: Record<string, number | { front: number; rear: number }>;
  } {
    const armorType =
      this.parseField(lines, 'armor') || 'Standard(Inner Sphere)';

    const allocation: Record<string, number | { front: number; rear: number }> =
      {};

    // Parse per-location armor values (biped and quad)
    const armorFields: Record<string, string> = {
      // Biped locations
      'LA armor': 'LEFT_ARM',
      'RA armor': 'RIGHT_ARM',
      'LT armor': 'LEFT_TORSO',
      'RT armor': 'RIGHT_TORSO',
      'CT armor': 'CENTER_TORSO',
      'HD armor': 'HEAD',
      'LL armor': 'LEFT_LEG',
      'RL armor': 'RIGHT_LEG',
      'RTL armor': 'LEFT_TORSO_REAR',
      'RTR armor': 'RIGHT_TORSO_REAR',
      'RTC armor': 'CENTER_TORSO_REAR',
      // Quad leg locations
      'FLL armor': 'FRONT_LEFT_LEG',
      'FRL armor': 'FRONT_RIGHT_LEG',
      'RLL armor': 'REAR_LEFT_LEG',
      'RRL armor': 'REAR_RIGHT_LEG',
      // Tripod center leg
      'CL armor': 'CENTER_LEG',
    };

    const frontValues: Record<string, number> = {};
    const rearValues: Record<string, number> = {};

    for (const [field, location] of Object.entries(armorFields)) {
      const value = this.parseField(lines, field);
      if (value) {
        // Handle patchwork armor format: "ArmorType:Value" or just "Value"
        let numValue: number;
        if (value.includes(':')) {
          // Patchwork format: "Reactive(Inner Sphere):26" - extract last part
          const parts = value.split(':');
          numValue = parseInt(parts[parts.length - 1], 10);
        } else {
          numValue = parseInt(value, 10);
        }
        if (location.endsWith('_REAR')) {
          const baseLocation = location.replace('_REAR', '');
          rearValues[baseLocation] = numValue;
        } else {
          frontValues[location] = numValue;
        }
      }
    }

    // Build allocation with front/rear for torsos
    for (const [location, front] of Object.entries(frontValues)) {
      if (['LEFT_TORSO', 'RIGHT_TORSO', 'CENTER_TORSO'].includes(location)) {
        allocation[location] = {
          front,
          rear: rearValues[location] || 0,
        };
      } else {
        allocation[location] = front;
      }
    }

    return { type: armorType, allocation };
  }

  /**
   * Parse weapons list
   * Handles (omnipod) suffix for OmniMech pod-mounted equipment
   */
  private parseWeapons(
    lines: string[],
  ): Array<{ id: string; location: string; isOmniPodMounted?: boolean }> {
    const weapons: Array<{
      id: string;
      location: string;
      isOmniPodMounted?: boolean;
    }> = [];

    // Find "Weapons:" section
    let inWeaponsSection = false;
    let _weaponCount = 0; // Parsed for validation but not currently used

    for (const line of lines) {
      if (line.startsWith('Weapons:')) {
        const match = line.match(/Weapons:(\d+)/);
        if (match) {
          _weaponCount = parseInt(match[1], 10);
        }
        inWeaponsSection = true;
        continue;
      }

      if (inWeaponsSection) {
        // End of weapons section - blank line or location header
        if (line.trim() === '' || line.endsWith(':')) {
          break;
        }

        // Parse weapon line: "Medium Laser, Left Arm" or "LRM 20 (omnipod), Left Torso"
        const match = line.match(/^(.+),\s*(.+)$/);
        if (match) {
          let weaponName = match[1].trim();
          const location = this.normalizeLocation(match[2].trim());

          // Check for (omnipod) suffix
          const isOmniPodMounted = weaponName
            .toLowerCase()
            .includes('(omnipod)');
          if (isOmniPodMounted) {
            weaponName = weaponName.replace(/\s*\(omnipod\)\s*/i, '').trim();
          }

          weapons.push({
            id: this.normalizeEquipmentId(weaponName),
            location,
            ...(isOmniPodMounted && { isOmniPodMounted: true }),
          });
        }
      }
    }

    return weapons;
  }

  /**
   * Parse critical slot sections
   */
  private parseCriticalSlots(
    lines: string[],
  ): Record<string, (string | null)[]> {
    const criticalSlots: Record<string, (string | null)[]> = {};

    let currentLocation: string | null = null;
    let currentSlots: (string | null)[] = [];

    for (const line of lines) {
      // Check for location header
      for (const [header, location] of Object.entries(LOCATION_HEADERS)) {
        if (line.trim() === header) {
          // Save previous location if any
          if (currentLocation) {
            criticalSlots[currentLocation] = this.padSlots(
              currentSlots,
              currentLocation,
            );
          }
          currentLocation = location;
          currentSlots = [];
          break;
        }
      }

      // If we're in a location section, parse slot entries
      if (currentLocation && !line.endsWith(':') && line.trim() !== '') {
        const slotContent = line.trim();

        // Skip comments and empty sections
        if (slotContent.startsWith('#')) {
          continue;
        }

        // Check for section breaks (like "overview:", "capabilities:", etc.)
        if (
          slotContent.includes(':') &&
          !slotContent.startsWith('-') &&
          !slotContent.includes('(')
        ) {
          // This is likely a new section, save current location and reset
          if (currentLocation) {
            criticalSlots[currentLocation] = this.padSlots(
              currentSlots,
              currentLocation,
            );
          }
          currentLocation = null;
          continue;
        }

        if (slotContent === '-Empty-') {
          currentSlots.push(null);
        } else {
          currentSlots.push(slotContent);
        }
      }
    }

    // Save final location
    if (currentLocation) {
      criticalSlots[currentLocation] = this.padSlots(
        currentSlots,
        currentLocation,
      );
    }

    return criticalSlots;
  }

  /**
   * Pad slots array to expected count for location
   */
  private padSlots(
    slots: (string | null)[],
    location: string,
  ): (string | null)[] {
    const expectedCount = SLOT_COUNTS[location] || 12;
    const result = [...slots];

    // Trim to expected count if over
    if (result.length > expectedCount) {
      return result.slice(0, expectedCount);
    }

    // Pad with nulls if under
    while (result.length < expectedCount) {
      result.push(null);
    }

    return result;
  }

  /**
   * Parse quirks
   */
  private parseQuirks(lines: string[]): string[] {
    const quirks: string[] = [];

    for (const line of lines) {
      if (line.startsWith('quirk:')) {
        const quirk = line.substring(6).trim();
        if (quirk) {
          quirks.push(quirk);
        }
      }
    }

    return quirks;
  }

  /**
   * Parse fluff text sections
   */
  private parseFluff(lines: string[]): ISerializedFluff {
    const fluff: Record<string, string | Record<string, string>> = {};

    const fluffFields = [
      'overview',
      'capabilities',
      'history',
      'deployment',
      'manufacturer',
      'primaryfactory',
    ];

    for (const field of fluffFields) {
      const value = this.parseField(lines, field);
      if (value) {
        const key = field === 'primaryfactory' ? 'primaryFactory' : field;
        fluff[key] = value;
      }
    }

    // Parse system manufacturers
    const systemManufacturer: Record<string, string> = {};
    for (const line of lines) {
      if (line.startsWith('systemmanufacturer:')) {
        const content = line.substring(19).trim();
        const match = content.match(/^([A-Z]+):(.+)$/);
        if (match) {
          systemManufacturer[match[1]] = match[2].trim();
        }
      }
    }

    if (Object.keys(systemManufacturer).length > 0) {
      fluff.systemManufacturer = systemManufacturer;
    }

    return fluff as ISerializedFluff;
  }

  /**
   * Normalize equipment name to ID format
   */
  private normalizeEquipmentId(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace(/\//g, '-');
  }

  /**
   * Normalize location name to enum format
   * Supports both biped and quad locations
   */
  private normalizeLocation(location: string): string {
    const locationMap: Record<string, string> = {
      // Biped locations
      'Left Arm': 'LEFT_ARM',
      'Right Arm': 'RIGHT_ARM',
      'Left Torso': 'LEFT_TORSO',
      'Right Torso': 'RIGHT_TORSO',
      'Center Torso': 'CENTER_TORSO',
      Head: 'HEAD',
      'Left Leg': 'LEFT_LEG',
      'Right Leg': 'RIGHT_LEG',
      // Quad locations
      'Front Left Leg': 'FRONT_LEFT_LEG',
      'Front Right Leg': 'FRONT_RIGHT_LEG',
      'Rear Left Leg': 'REAR_LEFT_LEG',
      'Rear Right Leg': 'REAR_RIGHT_LEG',
    };

    return locationMap[location] || location.toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Generate unit ID from chassis and model
   */
  private generateUnitId(chassis: string, model: string): string {
    return `${chassis}-${model}`
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace(/\//g, '-');
  }

  /**
   * Map year to era string
   */
  private mapEraFromYear(year: number): string {
    if (year < 2005) return 'EARLY_SPACEFLIGHT';
    if (year < 2570) return 'AGE_OF_WAR';
    if (year < 2781) return 'STAR_LEAGUE';
    if (year < 2901) return 'EARLY_SUCCESSION_WARS';
    if (year < 3020) return 'LATE_SUCCESSION_WARS';
    if (year < 3050) return 'RENAISSANCE';
    if (year < 3061) return 'CLAN_INVASION';
    if (year < 3068) return 'CIVIL_WAR';
    if (year < 3081) return 'JIHAD';
    if (year < 3151) return 'DARK_AGE';
    return 'IL_CLAN';
  }

  /**
   * Map tech base string
   */
  private mapTechBase(techBase: string): string {
    const lower = techBase.toLowerCase();
    // Check 'mixed' before 'clan' - "Mixed (Clan Chassis)" should be MIXED not CLAN
    if (lower.includes('mixed')) return 'MIXED';
    if (lower.includes('clan')) return 'CLAN';
    return 'INNER_SPHERE';
  }

  /**
   * Map rules level string
   */
  private mapRulesLevel(level: string): string {
    const levelMap: Record<string, string> = {
      '1': 'INTRODUCTORY',
      '2': 'STANDARD',
      '3': 'ADVANCED',
      '4': 'EXPERIMENTAL',
    };
    return levelMap[level] || 'STANDARD';
  }

  /**
   * Map engine type string
   */
  private mapEngineType(engineType: string): string {
    const lower = engineType.toLowerCase();
    // Normalize: remove periods for formats like "I.C.E." -> "ice"
    const normalized = lower.replace(/\./g, '');
    // Check XXL before XL (xxl contains xl)
    if (normalized.includes('xxl')) return 'XXL';
    if (normalized.includes('xl') && normalized.includes('clan'))
      return 'XL_CLAN';
    if (normalized.includes('xl')) return 'XL';
    if (normalized.includes('light')) return 'LIGHT';
    if (normalized.includes('compact')) return 'COMPACT';
    if (normalized.includes('ice')) return 'ICE';
    if (lower.includes('fuel cell') || lower.includes('fuel-cell'))
      return 'FUEL_CELL';
    if (normalized.includes('fission')) return 'FISSION';
    return 'FUSION';
  }

  /**
   * Map structure type string
   */
  private mapStructureType(structure: string): string {
    const lower = structure.toLowerCase();
    if (lower.includes('endo') && lower.includes('composite'))
      return 'ENDO_COMPOSITE';
    if (lower.includes('endo') && lower.includes('clan'))
      return 'ENDO_STEEL_CLAN';
    if (lower.includes('endo')) return 'ENDO_STEEL';
    if (lower.includes('reinforced')) return 'REINFORCED';
    if (lower.includes('composite')) return 'COMPOSITE';
    if (lower.includes('industrial')) return 'INDUSTRIAL';
    return 'STANDARD';
  }

  /**
   * Map armor type string
   */
  private mapArmorType(armorType: string): string {
    const lower = armorType.toLowerCase();
    if (lower.includes('stealth')) return 'STEALTH';
    if (lower.includes('reactive')) return 'REACTIVE';
    if (lower.includes('reflective')) return 'REFLECTIVE';
    if (lower.includes('hardened')) return 'HARDENED';
    if (lower.includes('heavy') && lower.includes('ferro'))
      return 'HEAVY_FERRO';
    if (lower.includes('light') && lower.includes('ferro'))
      return 'LIGHT_FERRO';
    if (lower.includes('ferro') && lower.includes('clan'))
      return 'FERRO_FIBROUS_CLAN';
    if (lower.includes('ferro')) return 'FERRO_FIBROUS';
    return 'STANDARD';
  }
}

/**
 * Get singleton instance
 */
export function getMTFParserService(): MTFParserService {
  return MTFParserService.getInstance();
}
