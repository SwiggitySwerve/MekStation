/**
 * MTF Export Service
 *
 * Serializes ISerializedUnit back to MTF (MegaMek Text Format) for round-trip validation.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 * @spec openspec/specs/serialization-formats/spec.md
 */

import { ISerializedUnit, ISerializedFluff } from '@/types/unit/UnitSerialization';

/**
 * Result of exporting to MTF format
 */
export interface IMTFExportResult {
  readonly success: boolean;
  readonly content?: string;
  readonly errors: string[];
}

/**
 * Location order for MTF output by configuration (matches MegaMek convention)
 */
const BIPED_LOCATION_ORDER = [
  'LEFT_ARM',
  'RIGHT_ARM',
  'LEFT_TORSO',
  'RIGHT_TORSO',
  'CENTER_TORSO',
  'HEAD',
  'LEFT_LEG',
  'RIGHT_LEG',
];

const QUAD_LOCATION_ORDER = [
  'FRONT_LEFT_LEG',
  'FRONT_RIGHT_LEG',
  'LEFT_TORSO',
  'RIGHT_TORSO',
  'CENTER_TORSO',
  'HEAD',
  'REAR_LEFT_LEG',
  'REAR_RIGHT_LEG',
];

const TRIPOD_LOCATION_ORDER = [
  'LEFT_ARM',
  'RIGHT_ARM',
  'LEFT_TORSO',
  'RIGHT_TORSO',
  'CENTER_TORSO',
  'HEAD',
  'LEFT_LEG',
  'RIGHT_LEG',
  'CENTER_LEG',
];

/**
 * Location display names for MTF format
 */
const LOCATION_NAMES: Record<string, string> = {
  // Biped locations
  LEFT_ARM: 'Left Arm',
  RIGHT_ARM: 'Right Arm',
  LEFT_TORSO: 'Left Torso',
  RIGHT_TORSO: 'Right Torso',
  CENTER_TORSO: 'Center Torso',
  HEAD: 'Head',
  LEFT_LEG: 'Left Leg',
  RIGHT_LEG: 'Right Leg',
  // Quad locations
  FRONT_LEFT_LEG: 'Front Left Leg',
  FRONT_RIGHT_LEG: 'Front Right Leg',
  REAR_LEFT_LEG: 'Rear Left Leg',
  REAR_RIGHT_LEG: 'Rear Right Leg',
  // Tripod locations
  CENTER_LEG: 'Center Leg',
};

/**
 * MTF Export Service
 */
export class MTFExportService {
  private static instance: MTFExportService | null = null;

  private constructor() {}

  static getInstance(): MTFExportService {
    if (!MTFExportService.instance) {
      MTFExportService.instance = new MTFExportService();
    }
    return MTFExportService.instance;
  }

  /**
   * Export ISerializedUnit to MTF format string
   */
  export(unit: ISerializedUnit): IMTFExportResult {
    const errors: string[] = [];

    try {
      const lines: string[] = [];

      // License header (matches MegaMek)
      lines.push('# MegaMek Data (C) 2025 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.');
      lines.push('# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/');
      lines.push('#');
      lines.push('# NOTICE: The MegaMek organization is a non-profit group of volunteers');
      lines.push('# creating free software for the BattleTech community.');
      lines.push('#');
      lines.push('# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks');
      lines.push('# of The Topps Company, Inc. All Rights Reserved.');
      lines.push('#');
      lines.push('# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of');
      lines.push('# InMediaRes Productions, LLC.');
      lines.push('#');
      lines.push('# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under');
      lines.push("# Microsoft's \"Game Content Usage Rules\"");
      lines.push('# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or');
      lines.push('# affiliated with Microsoft.');
      lines.push('');

      // Header fields
      lines.push(`chassis:${unit.chassis}`);
      lines.push(`model:${unit.model}`);

      // Extended fields (if present)
      const extendedUnit = unit as ISerializedUnit & { mulId?: number; role?: string; source?: string };
      if (extendedUnit.mulId) {
        lines.push(`mul id:${extendedUnit.mulId}`);
      }

      lines.push(`Config:${this.formatConfig(unit.configuration)}`);
      lines.push(`techbase:${this.formatTechBase(unit.techBase)}`);
      lines.push(`era:${unit.year}`);

      if (extendedUnit.source) {
        lines.push(`source:${extendedUnit.source}`);
      }

      lines.push(`rules level:${this.formatRulesLevel(unit.rulesLevel)}`);

      if (extendedUnit.role) {
        lines.push(`role:${extendedUnit.role}`);
      }

      lines.push('');
      lines.push('');

      // Quirks
      if (unit.quirks && unit.quirks.length > 0) {
        for (const quirk of unit.quirks) {
          lines.push(`quirk:${quirk}`);
        }
        lines.push('');
        lines.push('');
      }

      // Structural components
      lines.push(`mass:${unit.tonnage}`);
      lines.push(`engine:${unit.engine.rating} ${this.formatEngineType(unit.engine.type)}`);
      lines.push(`structure:${this.formatStructureType(unit.structure.type)}`);
      lines.push('myomer:Standard');
      lines.push('');

      // Heat sinks and movement
      lines.push(`heat sinks:${unit.heatSinks.count} ${this.formatHeatSinkType(unit.heatSinks.type)}`);
      lines.push(`walk mp:${unit.movement.walk}`);
      lines.push(`jump mp:${unit.movement.jump}`);
      lines.push('');

      // Armor
      lines.push(`armor:${this.formatArmorType(unit.armor.type)}`);
      this.writeArmorValues(lines, unit.armor.allocation, unit.configuration);
      lines.push('');

      // Weapons
      const weaponCount = unit.equipment.length;
      lines.push(`Weapons:${weaponCount}`);
      for (const eq of unit.equipment) {
        const name = this.formatEquipmentName(eq.id);
        const location = LOCATION_NAMES[eq.location] || eq.location;
        lines.push(`${name}, ${location}`);
      }
      lines.push('');

      // Critical slots - determine location order based on configuration
      // MegaMek pads all locations to 12 slots for consistency
      const MTF_SLOTS_PER_LOCATION = 12;
      const locationOrder = this.getLocationOrder(unit.configuration);
      for (const location of locationOrder) {
        lines.push(`${LOCATION_NAMES[location]}:`);
        const slots = unit.criticalSlots[location] || [];
        // Output actual slots
        for (const slot of slots) {
          if (slot === null) {
            lines.push('-Empty-');
          } else {
            lines.push(slot);
          }
        }
        // Pad to 12 slots for MTF format compatibility
        for (let i = slots.length; i < MTF_SLOTS_PER_LOCATION; i++) {
          lines.push('-Empty-');
        }
        lines.push('');
      }

      // Fluff
      if (unit.fluff) {
        this.writeFluff(lines, unit.fluff);
      }

      lines.push('');

      return {
        success: true,
        content: lines.join('\n'),
        errors,
      };
    } catch (e) {
      errors.push(`Export error: ${e}`);
      return { success: false, errors };
    }
  }

  /**
   * Format configuration for MTF
   */
  private formatConfig(config: string): string {
    const configMap: Record<string, string> = {
      BIPED: 'Biped',
      QUAD: 'Quad',
      TRIPOD: 'Tripod',
      LAM: 'LAM',
      QUADVEE: 'QuadVee',
    };
    return configMap[config] || config;
  }

  /**
   * Format tech base for MTF
   */
  private formatTechBase(techBase: string): string {
    if (techBase === 'CLAN') return 'Clan';
    if (techBase === 'MIXED') return 'Mixed';
    return 'Inner Sphere';
  }

  /**
   * Format rules level for MTF
   */
  private formatRulesLevel(rulesLevel: string): string {
    const levelMap: Record<string, string> = {
      INTRODUCTORY: '1',
      STANDARD: '2',
      ADVANCED: '3',
      EXPERIMENTAL: '4',
    };
    return levelMap[rulesLevel] || '2';
  }

  /**
   * Format engine type for MTF
   */
  private formatEngineType(engineType: string): string {
    const typeMap: Record<string, string> = {
      FUSION: 'Fusion Engine',
      STANDARD: 'Fusion Engine',
      XL: 'XL Fusion Engine',
      XL_IS: 'XL Fusion Engine',
      XL_CLAN: 'XL Fusion Engine (Clan)',
      LIGHT: 'Light Fusion Engine',
      COMPACT: 'Compact Fusion Engine',
      XXL: 'XXL Fusion Engine',
      ICE: 'ICE Engine',
      FUEL_CELL: 'Fuel Cell Engine',
      FISSION: 'Fission Engine',
    };
    return typeMap[engineType] || 'Fusion Engine';
  }

  /**
   * Format structure type for MTF
   */
  private formatStructureType(structureType: string): string {
    const typeMap: Record<string, string> = {
      STANDARD: 'IS Standard',
      ENDO_STEEL: 'IS Endo Steel',
      ENDO_STEEL_IS: 'IS Endo Steel',
      ENDO_STEEL_CLAN: 'Clan Endo Steel',
      ENDO_COMPOSITE: 'Endo-Composite',
      REINFORCED: 'Reinforced',
      COMPOSITE: 'Composite',
      INDUSTRIAL: 'Industrial',
    };
    return typeMap[structureType] || 'IS Standard';
  }

  /**
   * Format heat sink type for MTF
   */
  private formatHeatSinkType(hsType: string): string {
    if (hsType === 'DOUBLE' || hsType === 'DOUBLE_IS') return 'Double';
    if (hsType === 'DOUBLE_CLAN') return 'Double';
    return 'Single';
  }

  /**
   * Format armor type for MTF
   */
  private formatArmorType(armorType: string): string {
    const typeMap: Record<string, string> = {
      STANDARD: 'Standard(Inner Sphere)',
      FERRO_FIBROUS: 'Ferro-Fibrous',
      FERRO_FIBROUS_IS: 'Ferro-Fibrous',
      FERRO_FIBROUS_CLAN: 'Ferro-Fibrous(Clan)',
      LIGHT_FERRO: 'Light Ferro-Fibrous',
      HEAVY_FERRO: 'Heavy Ferro-Fibrous',
      STEALTH: 'Stealth',
      REACTIVE: 'Reactive',
      REFLECTIVE: 'Reflective',
      HARDENED: 'Hardened',
    };
    return typeMap[armorType] || 'Standard(Inner Sphere)';
  }

  /**
   * Get location order based on configuration
   */
  private getLocationOrder(configuration: string): string[] {
    const config = configuration.toUpperCase();
    // Handle variations like "Quad", "Quad Omnimech", "QuadVee"
    if (config.startsWith('QUAD') || config === 'QUADVEE') {
      return QUAD_LOCATION_ORDER;
    }
    // Handle "Tripod" and variations
    if (config.startsWith('TRIPOD')) {
      return TRIPOD_LOCATION_ORDER;
    }
    // Biped, LAM, and others use biped order
    return BIPED_LOCATION_ORDER;
  }

  /**
   * Get slot count for a location
   */
  private getSlotCount(location: string): number {
    const slotCounts: Record<string, number> = {
      HEAD: 6,
      CENTER_TORSO: 12,
      LEFT_TORSO: 12,
      RIGHT_TORSO: 12,
      LEFT_ARM: 12,
      RIGHT_ARM: 12,
      LEFT_LEG: 6,
      RIGHT_LEG: 6,
      FRONT_LEFT_LEG: 6,
      FRONT_RIGHT_LEG: 6,
      REAR_LEFT_LEG: 6,
      REAR_RIGHT_LEG: 6,
      CENTER_LEG: 6,
    };
    return slotCounts[location] || 12;
  }

  /**
   * Write armor values in MTF format
   */
  private writeArmorValues(
    lines: string[],
    allocation: Record<string, number | { front: number; rear: number }>,
    configuration: string
  ): void {
    const config = configuration.toUpperCase();
    // Handle variations like "Quad", "Quad Omnimech", "QuadVee"
    const isQuad = config.startsWith('QUAD') || config === 'QUADVEE';

    // Define armor field mappings based on configuration
    const fieldMap: Record<string, string> = isQuad
      ? {
          FRONT_LEFT_LEG: 'FLL armor',
          FRONT_RIGHT_LEG: 'FRL armor',
          LEFT_TORSO: 'LT armor',
          RIGHT_TORSO: 'RT armor',
          CENTER_TORSO: 'CT armor',
          HEAD: 'HD armor',
          REAR_LEFT_LEG: 'RLL armor',
          REAR_RIGHT_LEG: 'RRL armor',
        }
      : {
          LEFT_ARM: 'LA armor',
          RIGHT_ARM: 'RA armor',
          LEFT_TORSO: 'LT armor',
          RIGHT_TORSO: 'RT armor',
          CENTER_TORSO: 'CT armor',
          HEAD: 'HD armor',
          LEFT_LEG: 'LL armor',
          RIGHT_LEG: 'RL armor',
        };

    // Add center leg for tripod
    if (config.startsWith('TRIPOD')) {
      fieldMap['CENTER_LEG'] = 'CL armor';
    }

    // Write front armor
    for (const [location, field] of Object.entries(fieldMap)) {
      const value = allocation[location];
      if (value !== undefined) {
        if (typeof value === 'number') {
          lines.push(`${field}:${value}`);
        } else {
          lines.push(`${field}:${value.front}`);
        }
      }
    }

    // Write rear armor for torsos
    const rearFieldMap: Record<string, string> = {
      LEFT_TORSO: 'RTL armor',
      RIGHT_TORSO: 'RTR armor',
      CENTER_TORSO: 'RTC armor',
    };

    for (const [location, field] of Object.entries(rearFieldMap)) {
      const value = allocation[location];
      if (value !== undefined && typeof value === 'object') {
        lines.push(`${field}:${value.rear}`);
      }
    }
  }

  /**
   * Format equipment name for MTF (reverse of ID normalization)
   */
  private formatEquipmentName(id: string): string {
    // Common equipment name mappings
    const nameMap: Record<string, string> = {
      'medium-laser': 'Medium Laser',
      'small-laser': 'Small Laser',
      'large-laser': 'Large Laser',
      'er-medium-laser': 'ER Medium Laser',
      'er-small-laser': 'ER Small Laser',
      'er-large-laser': 'ER Large Laser',
      'ppc': 'PPC',
      'er-ppc': 'ER PPC',
      'lrm-5': 'LRM 5',
      'lrm-10': 'LRM 10',
      'lrm-15': 'LRM 15',
      'lrm-20': 'LRM 20',
      'srm-2': 'SRM 2',
      'srm-4': 'SRM 4',
      'srm-6': 'SRM 6',
      'ac-2': 'AC/2',
      'ac-5': 'AC/5',
      'ac-10': 'AC/10',
      'ac-20': 'AC/20',
      'machine-gun': 'Machine Gun',
      'flamer': 'Flamer',
      'gauss-rifle': 'Gauss Rifle',
      // LAM Equipment
      'landing-gear': 'Landing Gear',
      'avionics': 'Avionics',
    };

    if (nameMap[id]) {
      return nameMap[id];
    }

    // Generic conversion: medium-laser -> Medium Laser
    return id
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Write fluff sections
   */
  private writeFluff(lines: string[], fluff: ISerializedFluff): void {
    if (fluff.overview) {
      lines.push(`overview:${fluff.overview}`);
      lines.push('');
    }
    if (fluff.capabilities) {
      lines.push(`capabilities:${fluff.capabilities}`);
      lines.push('');
    }
    if (fluff.deployment) {
      lines.push(`deployment:${fluff.deployment}`);
      lines.push('');
    }
    if (fluff.history) {
      lines.push(`history:${fluff.history}`);
      lines.push('');
    }
    if (fluff.manufacturer) {
      lines.push(`manufacturer:${fluff.manufacturer}`);
    }
    if (fluff.primaryFactory) {
      lines.push(`primaryfactory:${fluff.primaryFactory}`);
    }
    if (fluff.systemManufacturer) {
      for (const [system, manufacturer] of Object.entries(fluff.systemManufacturer)) {
        lines.push(`systemmanufacturer:${system}:${manufacturer}`);
      }
    }
  }
}

/**
 * Get singleton instance
 */
export function getMTFExportService(): MTFExportService {
  return MTFExportService.getInstance();
}
