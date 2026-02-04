/**
 * MTF Import Service
 * 
 * Imports and validates unit data from JSON files converted from MTF format.
 * Implements the IMTFImporter interface from UnitSerialization.
 * 
 * @module services/conversion/MTFImportService
 */

import {
  ISerializedUnit,
  ISerializedArmor,
  ISerializedEquipment,
  ISerializedCriticalSlots,
  IDeserializationResult,
  IMTFImporter,
} from '@/types/unit/UnitSerialization';
import { getEquipmentRegistry, EquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getEquipmentNameMapper, EquipmentNameMapper } from '@/services/equipment/EquipmentNameMapper';
import { TechBase } from '@/types/enums/TechBase';

/**
 * MTF Import result data (extends deserialization data with MTF-specific fields)
 */
export interface IMTFImportData {
  readonly unit?: import('@/types/unit/BattleMechInterfaces').IBattleMech;
  readonly warnings: string[];
  readonly migrations: string[];
  readonly unitId: string | null;
  readonly equipmentResolutionErrors: string[];
}

export interface IMTFImportError {
  readonly errors: string[];
  readonly warnings: string[];
  readonly migrations: string[];
  readonly unitId: string | null;
  readonly equipmentResolutionErrors: string[];
}

import type { ResultType } from '@/services/core/types/BaseTypes';

export type IMTFImportResult = ResultType<IMTFImportData, IMTFImportError>;

/**
 * Validation options
 */
export interface IValidationOptions {
  readonly validateEquipment: boolean;
  readonly validateArmor: boolean;
  readonly validateCriticalSlots: boolean;
  readonly strictMode: boolean;
}

const DEFAULT_VALIDATION_OPTIONS: IValidationOptions = {
  validateEquipment: true,
  validateArmor: true,
  validateCriticalSlots: true,
  strictMode: false,
};

/**
 * MTF Import Service
 * 
 * Handles importing and validating unit data from JSON.
 */
export class MTFImportService implements IMTFImporter {
  private static instance: MTFImportService | null = null;
  
  private registry: EquipmentRegistry;
  private nameMapper: EquipmentNameMapper;
  
  private constructor() {
    this.registry = getEquipmentRegistry();
    this.nameMapper = getEquipmentNameMapper();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): MTFImportService {
    if (!MTFImportService.instance) {
      MTFImportService.instance = new MTFImportService();
    }
    return MTFImportService.instance;
  }
  
  /**
   * Import unit from MTF content (not implemented - use importFromJSON)
   */
  import(_mtfContent: string): IDeserializationResult {
    return {
      success: false,
      error: {
        errors: ['Direct MTF parsing not implemented. Use importFromJSON for pre-converted JSON.'],
        warnings: [],
        migrations: [],
      },
    };
  }
  
  /**
   * Validate MTF content (not implemented - use validateJSON)
   */
  validate(_mtfContent: string): { isValid: boolean; errors: string[] } {
    return {
      isValid: false,
      errors: ['Direct MTF validation not implemented. Use validateJSON for JSON data.'],
    };
  }
  
  /**
   * Import unit from pre-converted JSON data
   */
  importFromJSON(data: ISerializedUnit, options?: Partial<IValidationOptions>): IMTFImportResult {
    const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const migrations: string[] = [];
    const equipmentResolutionErrors: string[] = [];
    
    try {
      // Validate required fields
      const fieldErrors = this.validateRequiredFields(data);
      errors.push(...fieldErrors);
      
      if (errors.length > 0 && opts.strictMode) {
        return {
          success: false,
          error: {
            errors,
            warnings,
            migrations,
            unitId: data.id || null,
            equipmentResolutionErrors,
          },
        };
      }
      
      // Validate equipment references
      if (opts.validateEquipment && data.equipment) {
        const equipmentResults = this.validateEquipmentReferences(data.equipment, data.techBase);
        equipmentResolutionErrors.push(...equipmentResults.errors);
        warnings.push(...equipmentResults.warnings);
      }
      
      // Validate armor allocation
      if (opts.validateArmor && data.armor) {
        const armorResults = this.validateArmorAllocation(data.armor, data.tonnage);
        warnings.push(...armorResults.warnings);
        if (opts.strictMode) {
          errors.push(...armorResults.errors);
        } else {
          warnings.push(...armorResults.errors);
        }
      }
      
      // Validate critical slots
      if (opts.validateCriticalSlots && data.criticalSlots) {
        const slotResults = this.validateCriticalSlots(data.criticalSlots);
        warnings.push(...slotResults.warnings);
      }
      
      // Note: We return undefined for unit since we don't construct IBattleMech here
      // That's the job of UnitFactoryService
      if (errors.length === 0) {
        return {
          success: true,
          data: {
            unit: undefined,
            warnings,
            migrations,
            unitId: data.id,
            equipmentResolutionErrors,
          },
        };
      }
      return {
        success: false,
        error: {
          errors,
          warnings,
          migrations,
          unitId: data.id,
          equipmentResolutionErrors,
        },
      };
    } catch (e) {
      errors.push(`Import failed: ${e}`);
      return {
        success: false,
        error: {
          errors,
          warnings,
          migrations,
          unitId: data.id || null,
          equipmentResolutionErrors,
        },
      };
    }
  }
  
  /**
   * Validate required fields
   */
  private validateRequiredFields(data: ISerializedUnit): string[] {
    const errors: string[] = [];
    
    if (!data.id) errors.push('Missing required field: id');
    if (!data.chassis) errors.push('Missing required field: chassis');
    if (!data.model) errors.push('Missing required field: model');
    if (!data.unitType) errors.push('Missing required field: unitType');
    if (!data.configuration) errors.push('Missing required field: configuration');
    if (!data.techBase) errors.push('Missing required field: techBase');
    if (!data.rulesLevel) errors.push('Missing required field: rulesLevel');
    if (!data.era) errors.push('Missing required field: era');
    if (data.year === undefined) errors.push('Missing required field: year');
    if (data.tonnage === undefined) errors.push('Missing required field: tonnage');
    if (!data.engine) errors.push('Missing required field: engine');
    if (!data.gyro) errors.push('Missing required field: gyro');
    if (!data.cockpit) errors.push('Missing required field: cockpit');
    if (!data.structure) errors.push('Missing required field: structure');
    if (!data.armor) errors.push('Missing required field: armor');
    if (!data.heatSinks) errors.push('Missing required field: heatSinks');
    if (!data.movement) errors.push('Missing required field: movement');
    if (!data.equipment) errors.push('Missing required field: equipment');
    if (!data.criticalSlots) errors.push('Missing required field: criticalSlots');
    
    return errors;
  }
  
  /**
   * Validate equipment references
   */
  private validateEquipmentReferences(
    equipment: readonly ISerializedEquipment[],
    techBase: string
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const parsedTechBase = this.parseTechBase(techBase);
    
    for (const item of equipment) {
      const result = this.nameMapper.mapName(item.id, parsedTechBase);
      
      if (!result.success) {
        errors.push(`Unknown equipment: ${item.id}`);
        if (result.alternates && result.alternates.length > 0) {
          warnings.push(`Suggestions for "${item.id}": ${result.alternates.join(', ')}`);
        }
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate armor allocation
   */
  private validateArmorAllocation(
    armor: ISerializedArmor,
    tonnage: number
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Calculate total armor points
    let totalArmor = 0;
    
    for (const [, value] of Object.entries(armor.allocation)) {
      if (typeof value === 'number') {
        totalArmor += value;
      } else if (typeof value === 'object' && value !== null) {
        totalArmor += (value as { front: number; rear: number }).front;
        totalArmor += (value as { front: number; rear: number }).rear;
      }
    }
    
    // Maximum armor = tonnage * 16 (for standard armor)
    const maxArmor = tonnage * 16;
    if (totalArmor > maxArmor) {
      errors.push(`Armor exceeds maximum: ${totalArmor} > ${maxArmor}`);
    }
    
    // Check head armor max (9)
    const headArmor = armor.allocation['HEAD'];
    if (typeof headArmor === 'number' && headArmor > 9) {
      errors.push(`Head armor exceeds maximum: ${headArmor} > 9`);
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate critical slots
   */
  private validateCriticalSlots(
    criticalSlots: ISerializedCriticalSlots
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Expected slot counts per location
    const expectedSlots: Record<string, number> = {
      'HEAD': 6,
      'CENTER_TORSO': 12,
      'LEFT_TORSO': 12,
      'RIGHT_TORSO': 12,
      'LEFT_ARM': 12,
      'RIGHT_ARM': 12,
      'LEFT_LEG': 6,
      'RIGHT_LEG': 6,
    };
    
    for (const [location, slots] of Object.entries(criticalSlots)) {
      const expected = expectedSlots[location];
      if (expected && slots.length !== expected) {
        warnings.push(`${location} has ${slots.length} slots, expected ${expected}`);
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Parse tech base string to enum
   * Per spec VAL-ENUM-004: Components must have binary tech base (IS or Clan).
   */
  private parseTechBase(value: string): TechBase {
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
   * Load and import a unit from a URL
   */
  async loadFromUrl(url: string, options?: Partial<IValidationOptions>): Promise<IMTFImportResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as ISerializedUnit;
      return this.importFromJSON(data, options);
    } catch (e) {
      return {
        success: false,
        error: {
          errors: [`Failed to load unit from ${url}: ${e}`],
          warnings: [],
          migrations: [],
          unitId: null,
          equipmentResolutionErrors: [],
        },
      };
    }
  }
  
  /**
   * Validate JSON data without full import
   */
  validateJSON(data: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Data must be an object'] };
    }
    
    const unit = data as Record<string, unknown>;
    
    // Check required string fields
    const requiredStrings = ['id', 'chassis', 'model', 'unitType', 'configuration', 'techBase', 'rulesLevel', 'era'];
    for (const field of requiredStrings) {
      if (typeof unit[field] !== 'string') {
        errors.push(`Field "${field}" must be a string`);
      }
    }
    
    // Check required number fields
    const requiredNumbers = ['year', 'tonnage'];
    for (const field of requiredNumbers) {
      if (typeof unit[field] !== 'number') {
        errors.push(`Field "${field}" must be a number`);
      }
    }
    
    // Check required object fields
    const requiredObjects = ['engine', 'gyro', 'structure', 'armor', 'heatSinks', 'movement', 'criticalSlots'];
    for (const field of requiredObjects) {
      if (!unit[field] || typeof unit[field] !== 'object') {
        errors.push(`Field "${field}" must be an object`);
      }
    }
    
    // Check equipment array
    if (!Array.isArray(unit.equipment)) {
      errors.push('Field "equipment" must be an array');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Resolve equipment IDs for a unit
   */
  resolveEquipment(equipmentIds: string[]): {
    resolved: Map<string, string>;
    unresolved: string[];
  } {
    const resolved = new Map<string, string>();
    const unresolved: string[] = [];
    
    for (const id of equipmentIds) {
      const mappedId = this.registry.resolveEquipmentName(id);
      if (mappedId) {
        resolved.set(id, mappedId);
      } else {
        unresolved.push(id);
      }
    }
    
    return { resolved, unresolved };
  }
}

/**
 * Convenience function to get the import service instance
 */
export function getMTFImportService(): MTFImportService {
  return MTFImportService.getInstance();
}

