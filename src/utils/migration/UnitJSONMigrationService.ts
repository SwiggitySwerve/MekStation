/**
 * Unit JSON Migration Service
 * Converts MegaMekLab JSON format to TypeScript UnitConfiguration format
 */

import { UnitConfiguration } from '../criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration, TechBase } from '../../types/componentConfiguration';
import { EquipmentIDMappingService, EquipmentMapping } from './EquipmentIDMapping';
import { ArmorLocation } from '../../types';
import { ArmorType, ARMOR_TYPES, CriticalSlotAssignment, EquipmentPlacement } from '../../types/editor';

// Field name mapping from JSON snake_case to TypeScript camelCase
const FIELD_MAPPING: Record<string, string> = {
  'tech_base': 'techBase',
  'mass': 'tonnage',
  'walk_mp': 'walkMP',
  'jump_mp': 'jumpMP',
  'run_mp': 'runMP',
  'mul_id': 'mulId',
  'rules_level': 'rulesLevel'
};

// Tech base value normalization
const TECH_BASE_MAPPING: Record<string, TechBase> = {
  'IS': 'Inner Sphere',
  'Inner Sphere': 'Inner Sphere',
  'Clan': 'Clan'
};

// Engine type mapping
const ENGINE_TYPE_MAPPING: Record<string, string> = {
  'Fusion Engine': 'Fusion',
  'Light Engine': 'Light Fusion',
  'XL Engine': 'XL',
  'XXL Engine': 'XXL',
  'Compact Engine': 'Compact',
  'ICE Engine': 'ICE',
  'Fuel Cell Engine': 'Fuel Cell'
};

export interface EquipmentAllocationData {
  equipmentId: string;
  databaseId: string;
  name: string;
  location: string;
  techBase: TechBase;
  category: string;
  isWeapon: boolean;
  requiresAmmo?: boolean;
  isOmnipod?: boolean;
}

export interface ArmorAllocationData {
  [location: string]: {
    front: number;
    rear?: number;
    maxArmor: number;
    type: ArmorType;
  };
}

export interface ArmorMigrationData {
  armorAllocation: ArmorAllocationData;
  armorLocations: ArmorLocation[];
  armorType: ArmorType;
  totalArmorPoints: number;
}

export interface CriticalSlotMigrationData {
  criticalSlots: CriticalSlotAssignment[];
  equipmentPlacements: EquipmentPlacement[];
  systemComponents: SystemComponentMapping[];
  unallocatedEquipment: string[];
}

export interface SystemComponentMapping {
  type: 'engine' | 'gyro' | 'cockpit' | 'lifesupport' | 'sensors' | 'actuator';
  name: string;
  location: string;
  slotIndex: number;
  isFixed: boolean;
}

export interface MigrationResult {
  success: boolean;
  unitConfiguration?: Partial<UnitConfiguration>;
  equipment?: EquipmentAllocationData[];
  armor?: ArmorMigrationData;
  criticalSlots?: CriticalSlotMigrationData;
  errors: string[];
  warnings: string[];
  equipmentMappingIssues?: string[];
  armorMappingIssues?: string[];
  criticalSlotMappingIssues?: string[];
}

export interface MigrationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
  typeErrors: string[];
}

export class UnitJSONMigrationService {
  private equipmentMappingService: EquipmentIDMappingService;
  
  constructor() {
    this.equipmentMappingService = new EquipmentIDMappingService();
  }
  
  /**
   * Migrate a JSON unit to UnitConfiguration format
   */
  migrateUnit(jsonUnit: any): MigrationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const equipmentMappingIssues: string[] = [];
    const armorMappingIssues: string[] = [];
    const criticalSlotMappingIssues: string[] = [];
    
    try {
      // Step 1: Basic field normalization
      const normalizedFields = this.normalizeFields(jsonUnit);
      
      // Step 2: Extract and convert basic properties
      const baseConfig = this.extractBaseConfiguration(normalizedFields, errors, warnings);
      
      // Step 3: Convert engine configuration
      const engineConfig = this.convertEngineConfiguration(jsonUnit, errors, warnings);
      
      // Step 4: Convert component configurations (basic for now)
      const componentConfig = this.convertBasicComponents(jsonUnit, baseConfig.techBase || 'Inner Sphere', errors, warnings);
      
      // Step 5: Convert equipment
      const equipment = this.convertEquipment(jsonUnit, baseConfig.techBase || 'Inner Sphere', equipmentMappingIssues, warnings);
      
      // Step 6: Convert armor
      const armor = this.convertArmor(jsonUnit, baseConfig.techBase || 'Inner Sphere', armorMappingIssues, warnings);
      
      // Step 7: Convert critical slots
      const criticalSlots = this.convertCriticalSlots(jsonUnit, equipment || [], baseConfig.techBase || 'Inner Sphere', criticalSlotMappingIssues, warnings);
      
      // Combine all configurations
      const unitConfiguration: Partial<UnitConfiguration> = {
        ...baseConfig,
        ...engineConfig,
        ...componentConfig
      };
      
      return {
        success: errors.length === 0,
        unitConfiguration,
        equipment,
        armor,
        criticalSlots,
        errors,
        warnings,
        equipmentMappingIssues,
        armorMappingIssues,
        criticalSlotMappingIssues
      };
      
    } catch (error) {
      errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings,
        equipmentMappingIssues,
        armorMappingIssues,
        criticalSlotMappingIssues
      };
    }
  }
  
  /**
   * Normalize field names from snake_case to camelCase
   */
  private normalizeFields(jsonUnit: any): any {
    const normalized: any = {};
    
    for (const [key, value] of Object.entries(jsonUnit)) {
      const normalizedKey = FIELD_MAPPING[key] || key;
      normalized[normalizedKey] = value;
    }
    
    return normalized;
  }
  
  /**
   * Extract basic configuration properties
   */
  private extractBaseConfiguration(
    normalizedFields: any, 
    errors: string[], 
    warnings: string[]
  ): Partial<UnitConfiguration> {
    const config: Partial<UnitConfiguration> = {};
    
    // Required fields
    if (normalizedFields.chassis) {
      config.chassis = normalizedFields.chassis;
    } else {
      errors.push('Missing required field: chassis');
    }
    
    if (normalizedFields.model) {
      config.model = normalizedFields.model;
    } else {
      errors.push('Missing required field: model');
    }
    
    // Tonnage (from mass field)
    if (typeof normalizedFields.tonnage === 'number') {
      config.tonnage = normalizedFields.tonnage;
      config.mass = normalizedFields.tonnage; // Legacy compatibility
    } else {
      errors.push('Missing or invalid tonnage/mass field');
    }
    
    // Tech base
    if (normalizedFields.techBase) {
      const mappedTechBase = TECH_BASE_MAPPING[normalizedFields.techBase];
      if (mappedTechBase) {
        config.techBase = mappedTechBase;
      } else {
        errors.push(`Unknown tech base: ${normalizedFields.techBase}`);
      }
    } else {
      warnings.push('Missing tech base, defaulting to Inner Sphere');
      config.techBase = 'Inner Sphere';
    }
    
    // Unit type (default to BattleMech for now)
    config.unitType = 'BattleMech';
    
    // Movement points
    if (typeof normalizedFields.walkMP === 'string') {
      config.walkMP = parseInt(normalizedFields.walkMP, 10);
    } else if (typeof normalizedFields.walkMP === 'number') {
      config.walkMP = normalizedFields.walkMP;
    }
    
    if (typeof normalizedFields.jumpMP === 'string') {
      config.jumpMP = parseInt(normalizedFields.jumpMP, 10);
    } else if (typeof normalizedFields.jumpMP === 'number') {
      config.jumpMP = normalizedFields.jumpMP;
    } else {
      config.jumpMP = 0; // Default to no jump capability
    }
    
    return config;
  }
  
  /**
   * Convert engine configuration
   */
  private convertEngineConfiguration(
    jsonUnit: any,
    errors: string[],
    warnings: string[]
  ): Partial<UnitConfiguration> {
    const config: Partial<UnitConfiguration> = {};
    
    if (jsonUnit.engine) {
      // Engine rating
      if (typeof jsonUnit.engine.rating === 'number') {
        config.engineRating = jsonUnit.engine.rating;
      } else {
        errors.push('Missing or invalid engine rating');
      }
      
      // Engine type
      if (jsonUnit.engine.type) {
        const mappedEngineType = ENGINE_TYPE_MAPPING[jsonUnit.engine.type] || jsonUnit.engine.type;
        config.engineType = mappedEngineType as any; // Will need proper typing later
      } else {
        warnings.push('Missing engine type, defaulting to Fusion');
        config.engineType = 'Fusion' as any;
      }
      
      // Calculate movement if we have engine rating and tonnage
      if (config.engineRating && config.tonnage) {
        config.walkMP = Math.floor(config.engineRating / config.tonnage);
        config.runMP = Math.floor(config.walkMP * 1.5);
      }
    } else {
      errors.push('Missing engine configuration');
    }
    
    return config;
  }
  
  /**
   * Convert basic component configurations
   */
  private convertBasicComponents(
    jsonUnit: any,
    techBase: TechBase,
    errors: string[],
    warnings: string[]
  ): Partial<UnitConfiguration> {
    const config: Partial<UnitConfiguration> = {};
    
    // Structure
    if (jsonUnit.structure?.type) {
      config.structureType = this.createComponentConfiguration(
        jsonUnit.structure.type,
        techBase
      );
    } else {
      warnings.push('Missing structure type, defaulting to Standard');
      config.structureType = this.createComponentConfiguration('Standard', techBase);
    }
    
    // Armor (basic conversion)
    if (jsonUnit.armor?.type) {
      config.armorType = this.createComponentConfiguration(
        jsonUnit.armor.type,
        techBase
      );
    } else {
      warnings.push('Missing armor type, defaulting to Standard');
      config.armorType = this.createComponentConfiguration('Standard', techBase);
    }
    
    // Heat sinks (basic conversion)
    if (jsonUnit.heat_sinks?.type) {
      config.heatSinkType = this.createComponentConfiguration(
        jsonUnit.heat_sinks.type,
        techBase
      );
      
      if (typeof jsonUnit.heat_sinks.count === 'number') {
        config.totalHeatSinks = jsonUnit.heat_sinks.count;
      }
    } else {
      warnings.push('Missing heat sink configuration');
    }
    
    return config;
  }
  
  /**
   * Create a ComponentConfiguration object
   */
  private createComponentConfiguration(
    type: string,
    techBase: TechBase
  ): ComponentConfiguration {
    return {
      type,
      techBase
    };
  }
  
  /**
   * Convert equipment from JSON weapons_and_equipment array
   */
  private convertEquipment(
    jsonUnit: any,
    unitTechBase: TechBase,
    mappingIssues: string[],
    warnings: string[]
  ): EquipmentAllocationData[] {
    const equipment: EquipmentAllocationData[] = [];
    
    if (!jsonUnit.weapons_and_equipment || !Array.isArray(jsonUnit.weapons_and_equipment)) {
      warnings.push('No weapons_and_equipment array found');
      return equipment;
    }
    
    jsonUnit.weapons_and_equipment.forEach((item: any, index: number) => {
      try {
        if (!item.item_type) {
          mappingIssues.push(`Equipment ${index}: Missing item_type`);
          return;
        }
        
        // Get equipment mapping
        const mappingResult = this.equipmentMappingService.getMapping(item.item_type);
        
        if (!mappingResult.found) {
          mappingIssues.push(`Equipment ${index}: No mapping found for '${item.item_type}'${mappingResult.suggestions ? ` (suggestions: ${mappingResult.suggestions.join(', ')})` : ''}`);
          return;
        }
        
        const mapping = mappingResult.mapping!;
        
        // Determine tech base for this equipment
        let equipmentTechBase: TechBase;
        if (mapping.techBase) {
          equipmentTechBase = mapping.techBase;
        } else if (item.tech_base) {
          // Map JSON tech base values
          if (item.tech_base === 'IS') {
            equipmentTechBase = 'Inner Sphere';
          } else if (item.tech_base === 'Clan') {
            equipmentTechBase = 'Clan';
          } else {
            equipmentTechBase = unitTechBase;
          }
        } else {
          // Infer from equipment name
          equipmentTechBase = this.equipmentMappingService.inferTechBase(item.item_type, unitTechBase);
        }
        
        // Create equipment allocation data
        const equipmentData: EquipmentAllocationData = {
          equipmentId: `${mapping.databaseId}_${equipment.length}`, // Unique ID for this instance
          databaseId: mapping.databaseId,
          name: item.item_name || mapping.databaseId,
          location: this.normalizeLocation(item.location || ''),
          techBase: equipmentTechBase,
          category: mapping.category,
          isWeapon: mapping.isWeapon,
          requiresAmmo: mapping.requiresAmmo,
          isOmnipod: item.is_omnipod || false
        };
        
        equipment.push(equipmentData);
        
      } catch (error) {
        mappingIssues.push(`Equipment ${index}: Error processing - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    return equipment;
  }
  
  /**
   * Normalize location names from JSON to our format
   */
  private normalizeLocation(location: string): string {
    const locationMapping: Record<string, string> = {
      'Head': 'Head',
      'Center Torso': 'Center Torso',
      'Left Torso': 'Left Torso',
      'Right Torso': 'Right Torso',
      'Left Arm': 'Left Arm',
      'Right Arm': 'Right Arm',
      'Left Leg': 'Left Leg',
      'Right Leg': 'Right Leg',
      // Handle abbreviations
      'HD': 'Head',
      'CT': 'Center Torso',
      'LT': 'Left Torso',
      'RT': 'Right Torso',
      'LA': 'Left Arm',
      'RA': 'Right Arm',
      'LL': 'Left Leg',
      'RL': 'Right Leg'
    };
    
    return locationMapping[location] || location;
  }
  
  /**
   * Convert armor from JSON format to our armor allocation format
   */
  private convertArmor(
    jsonUnit: any,
    unitTechBase: TechBase,
    mappingIssues: string[],
    warnings: string[]
  ): ArmorMigrationData {
    // Default armor type
    const defaultArmorType = ARMOR_TYPES.find(t => t.id === 'standard') || ARMOR_TYPES[0];
    
    // Initialize result
    const result: ArmorMigrationData = {
      armorAllocation: {},
      armorLocations: [],
      armorType: defaultArmorType,
      totalArmorPoints: 0
    };
    
    if (!jsonUnit.armor) {
      warnings.push('No armor data found');
      return result;
    }
    
    // Get armor type
    const armorType = this.getArmorType(jsonUnit.armor.type, unitTechBase);
    result.armorType = armorType;
    
    // Get unit mass for max armor calculations
    const unitMass = jsonUnit.mass || 50;
    
    // Process armor locations
    if (jsonUnit.armor.locations && Array.isArray(jsonUnit.armor.locations)) {
      // Create location mapping for abbreviations to full names
      const locationMapping: Record<string, string> = {
        'HD': 'Head',
        'CT': 'Center Torso',
        'LT': 'Left Torso',
        'RT': 'Right Torso',
        'LA': 'Left Arm',
        'RA': 'Right Arm',
        'LL': 'Left Leg',
        'RL': 'Right Leg',
        'Left Torso (Rear)': 'Left Torso',
        'Right Torso (Rear)': 'Right Torso',
        'Center Torso (Rear)': 'Center Torso'
      };
      
      // Process each armor location
      jsonUnit.armor.locations.forEach((loc: any, index: number) => {
        try {
          if (!loc.location) {
            mappingIssues.push(`Armor location ${index}: Missing location field`);
            return;
          }
          
          const locationName = locationMapping[loc.location] || loc.location;
          const armorPoints = loc.armor_points || 0;
          
          // Determine if this is rear armor
          const isRearArmor = loc.location.includes('(Rear)');
          
          // Initialize location in armor allocation if not exists
          if (!result.armorAllocation[locationName]) {
            result.armorAllocation[locationName] = {
              front: 0,
              rear: 0,
              maxArmor: this.getMaxArmorForLocation(locationName, unitMass),
              type: armorType
            };
          }
          
          // Set armor points
          if (isRearArmor) {
            result.armorAllocation[locationName].rear = armorPoints;
          } else {
            result.armorAllocation[locationName].front = armorPoints;
          }
          
          // Add to armor locations array (for compatibility with existing systems)
          result.armorLocations.push({
            location: locationName,
            armor_points: armorPoints,
            rear_armor_points: isRearArmor ? armorPoints : (loc.rear_armor_points || 0)
          });
          
        } catch (error) {
          mappingIssues.push(`Armor location ${index}: Error processing - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
      
      // Calculate total armor points
      result.totalArmorPoints = Object.values(result.armorAllocation).reduce((total, loc) => {
        return total + loc.front + (loc.rear || 0);
      }, 0);
      
      // Validate armor allocation
      this.validateArmorAllocation(result.armorAllocation, mappingIssues);
      
    } else {
      warnings.push('No armor locations found in armor data');
    }
    
    return result;
  }
  
  /**
   * Get armor type from JSON armor type string
   */
  private getArmorType(armorTypeName: string, unitTechBase: TechBase): ArmorType {
    if (!armorTypeName) {
      return ARMOR_TYPES.find(t => t.id === 'standard') || ARMOR_TYPES[0];
    }
    
    // Normalize armor type name
    const normalizedName = armorTypeName.toLowerCase().replace(/[\s\-]/g, '_');
    
    // Mapping from JSON armor type names to our armor type IDs
    const armorTypeMapping: Record<string, string> = {
      'standard': 'standard',
      'ferro_fibrous': unitTechBase === 'Clan' ? 'ferro_fibrous_clan' : 'ferro_fibrous',
      'ferro-fibrous': unitTechBase === 'Clan' ? 'ferro_fibrous_clan' : 'ferro_fibrous',
      'ferrofibrous': unitTechBase === 'Clan' ? 'ferro_fibrous_clan' : 'ferro_fibrous',
      'stealth': 'stealth',
      'light_ferro_fibrous': 'light_ferro_fibrous',
      'light_ferro-fibrous': 'light_ferro_fibrous',
      'heavy_ferro_fibrous': 'heavy_ferro_fibrous',
      'heavy_ferro-fibrous': 'heavy_ferro_fibrous',
      'ferro_lamellor': 'ferro_lamellor',
      'ferro-lamellor': 'ferro_lamellor',
      'hardened': 'hardened',
      'reactive': 'reactive',
      'reflective': 'reflective'
    };
    
    const armorTypeId = armorTypeMapping[normalizedName];
    if (armorTypeId) {
      const armorType = ARMOR_TYPES.find(t => t.id === armorTypeId);
      if (armorType) {
        return armorType;
      }
    }
    
    // If not found, return standard armor
    return ARMOR_TYPES.find(t => t.id === 'standard') || ARMOR_TYPES[0];
  }
  
  /**
   * Get maximum armor for a location based on unit mass
   */
  private getMaxArmorForLocation(location: string, mass: number): number {
    switch (location) {
      case 'Head':
        return mass > 100 ? 12 : 9;
      case 'Center Torso':
        return Math.floor(mass * 2 * 0.4);
      case 'Left Torso':
      case 'Right Torso':
        return Math.floor(mass * 2 * 0.3);
      case 'Left Arm':
      case 'Right Arm':
      case 'Left Leg':
      case 'Right Leg':
        return Math.floor(mass * 2 * 0.25);
      default:
        return Math.floor(mass * 2 * 0.2);
    }
  }
  
  /**
   * Validate armor allocation for errors
   */
  private validateArmorAllocation(armorAllocation: ArmorAllocationData, mappingIssues: string[]): void {
    Object.entries(armorAllocation).forEach(([location, armor]) => {
      const totalArmor = armor.front + (armor.rear || 0);
      
      if (totalArmor > armor.maxArmor) {
        mappingIssues.push(`${location}: Armor total (${totalArmor}) exceeds maximum (${armor.maxArmor})`);
      }
      
      if (armor.front < 0) {
        mappingIssues.push(`${location}: Front armor cannot be negative`);
      }
      
      if (armor.rear && armor.rear < 0) {
        mappingIssues.push(`${location}: Rear armor cannot be negative`);
      }
      
      // Check if location should have rear armor
      const hasRearArmor = ['Center Torso', 'Left Torso', 'Right Torso'].includes(location);
      if (!hasRearArmor && armor.rear && armor.rear > 0) {
        mappingIssues.push(`${location}: Location should not have rear armor`);
      }
    });
  }
  
  /**
   * Convert critical slots from JSON format to our critical slot system
   */
  private convertCriticalSlots(
    jsonUnit: any,
    equipment: EquipmentAllocationData[],
    unitTechBase: TechBase,
    mappingIssues: string[],
    warnings: string[]
  ): CriticalSlotMigrationData {
    const result: CriticalSlotMigrationData = {
      criticalSlots: [],
      equipmentPlacements: [],
      systemComponents: [],
      unallocatedEquipment: []
    };
    
    if (!jsonUnit.criticals || !Array.isArray(jsonUnit.criticals)) {
      warnings.push('No critical slots data found');
      return result;
    }
    
    // Process each location's critical slots
    jsonUnit.criticals.forEach((location: any, locationIndex: number) => {
      try {
        if (!location.location || !Array.isArray(location.slots)) {
          mappingIssues.push(`Critical location ${locationIndex}: Missing location or slots data`);
          return;
        }
        
        const locationName = this.normalizeLocation(location.location);
        
        // Process each slot in the location
        location.slots.forEach((slotName: string, slotIndex: number) => {
          try {
            if (!slotName || slotName === '-Empty-') {
              // Empty slot
              result.criticalSlots.push({
                location: locationName,
                slotIndex,
                isFixed: false,
                isEmpty: true
              });
              return;
            }
            
            // Determine slot type and content
            const slotMapping = this.mapCriticalSlot(slotName, locationName, slotIndex, equipment);
            
            if (slotMapping.type === 'system') {
              // Core system component
              result.criticalSlots.push({
                location: locationName,
                slotIndex,
                systemType: slotMapping.systemType,
                isFixed: true,
                isEmpty: false
              });
              
              result.systemComponents.push({
                type: slotMapping.systemType!,
                name: slotName,
                location: locationName,
                slotIndex,
                isFixed: true
              });
              
            } else if (slotMapping.type === 'special') {
              // Special component (heat sinks, ferro-fibrous, endo steel)
              result.criticalSlots.push({
                location: locationName,
                slotIndex,
                // No systemType for special components
                isFixed: slotMapping.specialType === 'ferro-fibrous' || slotMapping.specialType === 'endo-steel',
                isEmpty: false
              });
              
              // Note: Special components are tracked differently than core systems
              // They might be handled as equipment in some systems
              
            } else if (slotMapping.type === 'equipment') {
              // Equipment
              result.criticalSlots.push({
                location: locationName,
                slotIndex,
                equipment: slotMapping.equipment,
                isFixed: false,
                isEmpty: false
              });
              
              // Create equipment placement if not already exists
              const existingPlacement = result.equipmentPlacements.find(p => 
                p.equipment?.id === slotMapping.equipment?.id && p.location === locationName
              );
              
              if (!existingPlacement) {
                result.equipmentPlacements.push({
                  id: `${slotMapping.equipment?.id}_${locationName}`,
                  equipment: slotMapping.equipment!,
                  location: locationName,
                  criticalSlots: [slotIndex]
                });
              } else {
                existingPlacement.criticalSlots.push(slotIndex);
              }
              
            } else {
              // Unknown slot type
              mappingIssues.push(`${locationName} slot ${slotIndex}: Unknown slot type '${slotName}'`);
              result.criticalSlots.push({
                location: locationName,
                slotIndex,
                isFixed: false,
                isEmpty: true
              });
            }
            
          } catch (error) {
            mappingIssues.push(`${locationName} slot ${slotIndex}: Error processing - ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
        
      } catch (error) {
        mappingIssues.push(`Critical location ${locationIndex}: Error processing - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    // Find equipment that wasn't placed in critical slots
    equipment.forEach(eq => {
      const isPlaced = result.equipmentPlacements.some(p => p.equipment?.name === eq.name);
      if (!isPlaced) {
        result.unallocatedEquipment.push(eq.equipmentId);
      }
    });
    
    return result;
  }
  
  /**
   * Map a critical slot name to its type and content
   */
  private mapCriticalSlot(
    slotName: string,
    location: string,
    slotIndex: number,
    equipment: EquipmentAllocationData[]
  ): {
    type: 'system' | 'equipment' | 'special' | 'unknown';
    systemType?: 'engine' | 'gyro' | 'cockpit' | 'lifesupport' | 'sensors' | 'actuator';
    specialType?: 'heat-sink' | 'ferro-fibrous' | 'endo-steel';
    equipment?: any;
  } {
    // Core system component mappings (for systemType)
    const systemMappings: Record<string, 'engine' | 'gyro' | 'cockpit' | 'lifesupport' | 'sensors' | 'actuator'> = {
      'Engine': 'engine',
      'Fusion Engine': 'engine',
      'Light Engine': 'engine',
      'XL Engine': 'engine',
      'XXL Engine': 'engine',
      'Compact Engine': 'engine',
      'ICE Engine': 'engine',
      'Fuel Cell Engine': 'engine',
      'Fission Engine': 'engine',
      'Gyro': 'gyro',
      'Standard Gyro': 'gyro',
      'Compact Gyro': 'gyro',
      'Heavy Duty Gyro': 'gyro',
      'XL Gyro': 'gyro',
      'Cockpit': 'cockpit',
      'Standard Cockpit': 'cockpit',
      'Small Cockpit': 'cockpit',
      'Command Console': 'cockpit',
      'Life Support': 'lifesupport',
      'Sensors': 'sensors',
      'Shoulder': 'actuator',
      'Upper Arm Actuator': 'actuator',
      'Lower Arm Actuator': 'actuator',
      'Hand Actuator': 'actuator',
      'Hip': 'actuator',
      'Upper Leg Actuator': 'actuator',
      'Lower Leg Actuator': 'actuator',
      'Foot Actuator': 'actuator'
    };
    
    // Special components that don't fit the standard system types
    const specialMappings: Record<string, 'heat-sink' | 'ferro-fibrous' | 'endo-steel'> = {
      'Heat Sink': 'heat-sink',
      'Double Heat Sink': 'heat-sink',
      'Single Heat Sink': 'heat-sink',
      'Ferro-Fibrous': 'ferro-fibrous',
      'Endo Steel': 'endo-steel',
      'Endo-Steel': 'endo-steel'
    };
    
    // Check if it's a core system component
    if (systemMappings[slotName]) {
      return {
        type: 'system',
        systemType: systemMappings[slotName]
      };
    }
    
    // Check if it's a special component
    if (specialMappings[slotName]) {
      return {
        type: 'special',
        specialType: specialMappings[slotName]
      };
    }
    
    // Check if it's equipment by name matching
    const matchingEquipment = equipment.find(eq => 
      eq.name.includes(slotName) || slotName.includes(eq.name) ||
      eq.databaseId.includes(slotName.toLowerCase().replace(/\s+/g, '_'))
    );
    
    if (matchingEquipment) {
      return {
        type: 'equipment',
        equipment: matchingEquipment
      };
    }
    
    return { type: 'unknown' };
  }
  
  /**
   * Validate the migration result
   */
  validateMigration(
    originalJson: any,
    migratedConfig: Partial<UnitConfiguration>
  ): MigrationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const typeErrors: string[] = [];
    
    // Check required fields
    const requiredFields: (keyof UnitConfiguration)[] = [
      'chassis', 'model', 'tonnage', 'techBase', 'walkMP', 'engineRating'
    ];
    
    requiredFields.forEach(field => {
      if (!migratedConfig[field]) {
        missingFields.push(field);
      }
    });
    
    // Type validation
    if (migratedConfig.tonnage && typeof migratedConfig.tonnage !== 'number') {
      typeErrors.push('tonnage must be a number');
    }
    
    if (migratedConfig.walkMP && typeof migratedConfig.walkMP !== 'number') {
      typeErrors.push('walkMP must be a number');
    }
    
    // Validation summary
    errors.push(...missingFields.map(field => `Missing required field: ${field}`));
    errors.push(...typeErrors);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingFields,
      typeErrors
    };
  }
}

export default UnitJSONMigrationService;