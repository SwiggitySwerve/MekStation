/**
 * Unit Configuration Service - Manages BattleTech unit configuration and validation
 * Handles configuration building, validation, rule enforcement, and dependency calculations
 * Following SOLID principles - Single Responsibility for configuration management
 */

import { getInternalStructurePoints } from '../internalStructureTable';
import { ComponentConfiguration } from '../../types/componentConfiguration';

// Import types from the existing UnitCriticalManager
export type EngineType = 'Standard' | 'XL' | 'Clan XL' | 'Light' | 'Clan Light' | 'XXL' | 'Compact' | 'ICE' | 'Fuel Cell';
export type GyroType = 'Standard' | 'XL' | 'Compact' | 'Heavy-Duty';
export type StructureType = 'Standard' | 'Endo Steel' | 'Endo Steel (Clan)' | 'Composite' | 'Reinforced' | 'Industrial';
export type ArmorType = 'Standard' | 'Ferro-Fibrous' | 'Ferro-Fibrous (Clan)' | 'Light Ferro-Fibrous' | 'Heavy Ferro-Fibrous' | 'Stealth' | 'Reactive' | 'Reflective' | 'Hardened';
export type HeatSinkType = 'Single' | 'Double' | 'Double (Clan)' | 'Compact' | 'Laser';
export type JumpJetType = 'Standard Jump Jet' | 'Improved Jump Jet' | 'UMU' | 'Mechanical Jump Booster' | 'Partial Wing';

export interface ArmorAllocation {
  HD: { front: number; rear: number };
  CT: { front: number; rear: number };
  LT: { front: number; rear: number };
  RT: { front: number; rear: number };
  LA: { front: number; rear: number };
  RA: { front: number; rear: number };
  LL: { front: number; rear: number };
  RL: { front: number; rear: number };
}

export interface UnitConfiguration {
  // Core mech properties
  tonnage: number;
  unitType: 'BattleMech' | 'IndustrialMech';
  techBase: 'Inner Sphere' | 'Clan';
  
  // Movement and engine
  walkMP: number;
  engineRating: number;
  runMP: number;
  engineType: EngineType;
  
  // Jump jets
  jumpMP: number;
  jumpJetType: ComponentConfiguration;
  jumpJetCounts: Partial<Record<JumpJetType, number>>;
  hasPartialWing: boolean;
  
  // System components
  gyroType: ComponentConfiguration;
  structureType: ComponentConfiguration;
  armorType: ComponentConfiguration;
  
  // Armor allocation - Single Source of Truth approach
  armorAllocation: ArmorAllocation;
  armorTonnage: number;
  
  // Heat management
  heatSinkType: ComponentConfiguration;
  totalHeatSinks: number;
  internalHeatSinks: number;
  externalHeatSinks: number;
  
  // Enhancement systems
  enhancements?: ComponentConfiguration[];
  
  // Legacy compatibility
  mass: number;
}

export interface LegacyUnitConfiguration {
  engineType: EngineType;
  gyroType: GyroType;
  mass: number;
  unitType: 'BattleMech' | 'IndustrialMech';
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  adjustments: string[];
}

export interface EngineValidationResult {
  isValid: boolean;
  maxWalkMP: number;
  errors: string[];
}

export interface ConfigurationOptions {
  enforceConstructionRules: boolean;
  allowLegacyFormats: boolean;
  autoCalculateDependencies: boolean;
  validateOnBuild: boolean;
}

/**
 * Unit Configuration Service
 * Centralized management of BattleTech unit configuration with validation and rule enforcement
 */
export class UnitConfigurationService {
  
  private options: ConfigurationOptions;
  
  constructor(options?: Partial<ConfigurationOptions>) {
    this.options = {
      enforceConstructionRules: true,
      allowLegacyFormats: true,
      autoCalculateDependencies: true,
      validateOnBuild: true,
      ...options
    };
    
    console.log('[UnitConfigurationService] Initialized with options:', this.options);
  }
  
  /**
   * Build complete configuration from partial or legacy input
   */
  buildConfiguration(input: Partial<UnitConfiguration> | LegacyUnitConfiguration): UnitConfiguration {
    console.log('[UnitConfigurationService] Building configuration from input');
    
    try {
      // Handle legacy configuration
      if (this.isLegacyConfiguration(input)) {
        return this.fromLegacyConfiguration(input as LegacyUnitConfiguration);
      }
      
      // Handle partial configuration
      const defaults = this.getDefaultConfiguration();
      let config = { ...defaults, ...input } as UnitConfiguration;
      
      // Calculate dependent values if enabled
      if (this.options.autoCalculateDependencies) {
        config = this.calculateDependentValues(config);
      }
      
      // Enforce construction rules if enabled
      if (this.options.enforceConstructionRules) {
        config = this.enforceConstructionRules(config);
      }
      
      // Validate if enabled
      if (this.options.validateOnBuild) {
        const validation = this.validateConfiguration(config);
        if (!validation.isValid) {
          console.warn('[UnitConfigurationService] Configuration validation warnings:', validation.errors);
        }
        
        if (validation.adjustments.length > 0) {
          console.log('[UnitConfigurationService] Configuration adjustments made:', validation.adjustments);
        }
      }
      
      console.log('[UnitConfigurationService] Configuration built successfully');
      return config;
      
    } catch (error) {
      console.error('[UnitConfigurationService] Error building configuration:', error);
      // Return safe default configuration on error
      return this.getDefaultConfiguration();
    }
  }
  
  /**
   * Validate configuration against BattleTech construction rules
   */
  validateConfiguration(config: UnitConfiguration): ConfigurationValidationResult {
    const result: ConfigurationValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      adjustments: []
    };
    
    try {
      // Validate basic required fields
      this.validateRequiredFields(config, result);
      
      // Validate engine rating constraints
      this.validateEngineRating(config, result);
      
      // Validate heat sink configuration
      this.validateHeatSinks(config, result);
      
      // Validate armor configuration
      this.validateArmorConfiguration(config, result);
      
      // Validate jump jet configuration
      this.validateJumpJets(config, result);
      
      // Validate tech base consistency
      this.validateTechBaseConsistency(config, result);
      
      // Set overall validity
      result.isValid = result.errors.length === 0;
      
      console.log(`[UnitConfigurationService] Configuration validation complete: ${result.isValid ? 'VALID' : 'INVALID'}`);
      
    } catch (error) {
      console.error('[UnitConfigurationService] Validation error:', error);
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Calculate dependent values (engine rating, run speed, heat sinks, armor)
   */
  calculateDependentValues(config: UnitConfiguration): UnitConfiguration {
    console.log('[UnitConfigurationService] Calculating dependent values');
    
    const updatedConfig = { ...config };
    
    // Calculate engine rating from tonnage and walk MP
    const calculatedEngineRating = updatedConfig.tonnage * updatedConfig.walkMP;
    const engineRating = Math.min(calculatedEngineRating, 400); // Cap at 400
    
    // Adjust walk MP if engine rating was capped
    const actualWalkMP = Math.floor(engineRating / updatedConfig.tonnage);
    
    // Calculate standard run MP
    const runMP = Math.floor(actualWalkMP * 1.5);
    
    // Calculate heat sinks
    const internalHeatSinks = this.calculateInternalHeatSinks(engineRating, updatedConfig.engineType);
    const minHeatSinks = Math.max(10, updatedConfig.totalHeatSinks);
    const externalHeatSinks = Math.max(0, minHeatSinks - internalHeatSinks);
    
    // Calculate armor values
    const armorValues = this.calculateArmorValues(updatedConfig);
    
    // Update configuration with calculated values
    updatedConfig.walkMP = actualWalkMP;
    updatedConfig.engineRating = engineRating;
    updatedConfig.runMP = runMP;
    updatedConfig.totalHeatSinks = minHeatSinks;
    updatedConfig.internalHeatSinks = internalHeatSinks;
    updatedConfig.externalHeatSinks = externalHeatSinks;
    updatedConfig.armorTonnage = armorValues.armorTonnage;
    updatedConfig.mass = updatedConfig.tonnage; // Keep legacy compatibility
    
    console.log('[UnitConfigurationService] Dependent values calculated:', {
      engineRating: updatedConfig.engineRating,
      walkMP: updatedConfig.walkMP,
      runMP: updatedConfig.runMP,
      totalHeatSinks: updatedConfig.totalHeatSinks,
      armorTonnage: updatedConfig.armorTonnage
    });
    
    return updatedConfig;
  }
  
  /**
   * Enforce BattleTech construction rules on configuration
   */
  enforceConstructionRules(config: UnitConfiguration): UnitConfiguration {
    console.log('[UnitConfigurationService] Enforcing construction rules');
    
    const enforcedConfig = { ...config };
    const adjustments: string[] = [];
    
    // Enforce head armor maximum (9 points)
    if (enforcedConfig.armorAllocation.HD.front > 9) {
      enforcedConfig.armorAllocation.HD.front = 9;
      adjustments.push('Head armor reduced to maximum (9 points)');
    }
    
    // Enforce no rear armor on head, arms, legs
    const noRearLocations: (keyof ArmorAllocation)[] = ['HD', 'LA', 'RA', 'LL', 'RL'];
    noRearLocations.forEach(location => {
      if (enforcedConfig.armorAllocation[location].rear > 0) {
        enforcedConfig.armorAllocation[location].rear = 0;
        adjustments.push(`Rear armor removed from ${location} (not allowed)`);
      }
    });
    
    // Enforce maximum armor points per location
    Object.keys(enforcedConfig.armorAllocation).forEach(location => {
      const maxArmor = this.getMaxArmorPointsForLocation(location, enforcedConfig.tonnage);
      const currentArmor = enforcedConfig.armorAllocation[location as keyof ArmorAllocation];
      const totalArmor = currentArmor.front + currentArmor.rear;
      
      if (totalArmor > maxArmor) {
        // Reduce proportionally
        const ratio = maxArmor / totalArmor;
        enforcedConfig.armorAllocation[location as keyof ArmorAllocation] = {
          front: Math.floor(currentArmor.front * ratio),
          rear: Math.floor(currentArmor.rear * ratio)
        };
        adjustments.push(`Armor in ${location} reduced to maximum allowed`);
      }
    });
    
    // Enforce tonnage limits
    if (enforcedConfig.tonnage < 20) {
      enforcedConfig.tonnage = 20;
      adjustments.push('Tonnage increased to minimum (20 tons)');
    } else if (enforcedConfig.tonnage > 100) {
      enforcedConfig.tonnage = 100;
      adjustments.push('Tonnage reduced to maximum (100 tons)');
    }
    
    // Enforce tonnage increments
    const remainder = enforcedConfig.tonnage % 5;
    if (remainder !== 0) {
      enforcedConfig.tonnage = Math.round(enforcedConfig.tonnage / 5) * 5;
      adjustments.push('Tonnage rounded to nearest 5-ton increment');
    }
    
    if (adjustments.length > 0) {
      console.log('[UnitConfigurationService] Construction rule adjustments:', adjustments);
    }
    
    return enforcedConfig;
  }
  
  /**
   * Validate engine rating constraints
   */
  validateEngineConstraints(tonnage: number, walkMP: number): EngineValidationResult {
    const requiredRating = tonnage * walkMP;
    const errors: string[] = [];
    let isValid = true;
    
    if (requiredRating > 400) {
      errors.push(`Engine rating ${requiredRating} exceeds maximum of 400`);
      isValid = false;
    }
    
    if (walkMP < 1) {
      errors.push('Walk MP must be at least 1');
      isValid = false;
    }
    
    const maxWalkMP = Math.floor(400 / tonnage);
    
    return { isValid, maxWalkMP, errors };
  }
  
  /**
   * Update configuration with new values and recalculate dependencies
   */
  updateConfiguration(
    currentConfig: UnitConfiguration, 
    updates: Partial<UnitConfiguration>
  ): UnitConfiguration {
    console.log('[UnitConfigurationService] Updating configuration with:', Object.keys(updates));
    
    // Merge updates with current configuration
    const updatedConfig = { ...currentConfig, ...updates };
    
    // Recalculate dependencies
    return this.buildConfiguration(updatedConfig);
  }
  
  /**
   * Clone configuration for safe manipulation
   */
  cloneConfiguration(config: UnitConfiguration): UnitConfiguration {
    return JSON.parse(JSON.stringify(config));
  }
  
  /**
   * Compare two configurations for differences
   */
  compareConfigurations(config1: UnitConfiguration, config2: UnitConfiguration): {
    identical: boolean;
    differences: string[];
    significantChanges: string[];
  } {
    const differences: string[] = [];
    const significantChanges: string[] = [];
    
    // Compare basic properties
    const basicProps = ['tonnage', 'engineType', 'engineRating', 'gyroType', 'structureType', 'armorType'];
    basicProps.forEach(prop => {
      if (config1[prop as keyof UnitConfiguration] !== config2[prop as keyof UnitConfiguration]) {
        const diff = `${prop}: ${config1[prop as keyof UnitConfiguration]} → ${config2[prop as keyof UnitConfiguration]}`;
        differences.push(diff);
        if (['tonnage', 'engineType', 'structureType', 'armorType'].includes(prop)) {
          significantChanges.push(diff);
        }
      }
    });
    
    // Compare armor allocation
    let armorChanged = false;
    Object.keys(config1.armorAllocation).forEach(location => {
      const loc = location as keyof ArmorAllocation;
      const armor1 = config1.armorAllocation[loc];
      const armor2 = config2.armorAllocation[loc];
      
      if (armor1.front !== armor2.front || armor1.rear !== armor2.rear) {
        differences.push(`${location} armor: ${armor1.front}/${armor1.rear} → ${armor2.front}/${armor2.rear}`);
        armorChanged = true;
      }
    });
    
    if (armorChanged) {
      significantChanges.push('Armor allocation changed');
    }
    
    return {
      identical: differences.length === 0,
      differences,
      significantChanges
    };
  }
  
  // Private helper methods
  
  private isLegacyConfiguration(input: any): boolean {
    return input && 
           typeof input === 'object' && 
           'mass' in input && 
           !('tonnage' in input) && 
           !('armorAllocation' in input);
  }
  
  private fromLegacyConfiguration(legacy: LegacyUnitConfiguration): UnitConfiguration {
    console.log('[UnitConfigurationService] Converting legacy configuration');
    
    const tonnage = legacy.mass;
    const walkMP = 4; // Default reasonable walk speed
    
    return this.calculateDependentValues({
      tonnage,
      unitType: legacy.unitType,
      techBase: 'Inner Sphere',
      walkMP,
      engineRating: tonnage * walkMP,
      runMP: Math.floor(walkMP * 1.5),
      engineType: legacy.engineType,
      gyroType: { type: legacy.gyroType, techBase: 'Inner Sphere' },
      structureType: { type: 'Standard', techBase: 'Inner Sphere' },
      armorType: { type: 'Standard', techBase: 'Inner Sphere' },
      // Default armor allocation (minimal)
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 15, rear: 5 },
        LT: { front: 12, rear: 4 },
        RT: { front: 12, rear: 4 },
        LA: { front: 10, rear: 0 },
        RA: { front: 10, rear: 0 },
        LL: { front: 15, rear: 0 },
        RL: { front: 15, rear: 0 }
      },
      armorTonnage: 0, // Will be calculated
      heatSinkType: { type: 'Single', techBase: 'Inner Sphere' },
      totalHeatSinks: 10,
      internalHeatSinks: 0,
      externalHeatSinks: 0,
      // Jump jet defaults
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: tonnage // Legacy compatibility
    });
  }
  
  private getDefaultConfiguration(): UnitConfiguration {
    return {
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: { type: 'Standard', techBase: 'Inner Sphere' },
      structureType: { type: 'Standard', techBase: 'Inner Sphere' },
      armorType: { type: 'Standard', techBase: 'Inner Sphere' },
      // Default armor allocation (reasonable distribution)
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 24, rear: 8 },
        RT: { front: 24, rear: 8 },
        LA: { front: 20, rear: 0 },
        RA: { front: 20, rear: 0 },
        LL: { front: 30, rear: 0 },
        RL: { front: 30, rear: 0 }
      },
      armorTonnage: 0, // User input
      heatSinkType: { type: 'Single', techBase: 'Inner Sphere' },
      totalHeatSinks: 10,
      internalHeatSinks: 0,
      externalHeatSinks: 0,
      // Enhancement systems
      enhancements: [],
      // Jump jet defaults
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50
    };
  }
  
  private calculateInternalHeatSinks(engineRating: number, engineType: EngineType): number {
    const { calculateInternalHeatSinksForEngine } = require('../heatSinkCalculations');
    return calculateInternalHeatSinksForEngine(engineRating, engineType);
  }
  
  private calculateArmorValues(config: UnitConfiguration): {
    totalArmorPoints: number;
    armorTonnage: number;
    maxArmorPoints: number;
  } {
    // Calculate total armor points from allocation
    const totalArmorPoints = Object.values(config.armorAllocation).reduce((total, location) => {
      return total + location.front + location.rear;
    }, 0);
    
    // Armor efficiency by type
    const armorEfficiency = this.getArmorEfficiency(config.armorType);
    
    // Use provided armor tonnage or calculate from points
    const armorTonnage = config.armorTonnage !== undefined 
      ? config.armorTonnage
      : Math.ceil((totalArmorPoints / armorEfficiency) * 2) / 2; // Round to 0.5 tons
    
    // Calculate maximum possible armor points
    const maxArmorTonnage = config.tonnage * 0.5; // 50% of unit tonnage max
    const maxArmorPoints = Math.floor(maxArmorTonnage * armorEfficiency);
    
    return {
      totalArmorPoints,
      armorTonnage,
      maxArmorPoints
    };
  }
  
  private getArmorEfficiency(armorType: ComponentConfiguration): number {
    const armorPointsPerTon: Record<string, number> = {
      'Standard': 16,
      // Import from centralized constants
      ...require('../../constants/BattleTechConstructionRules').ARMOR_POINTS_PER_TON,
      'Stealth': 16,
      'Reactive': 16,
      'Reflective': 16,
      'Hardened': 8
    };
    
    return armorPointsPerTon[armorType.type] || 16;
  }
  
  private getMaxArmorPointsForLocation(location: string, tonnage: number): number {
    // Get internal structure points for this location
    const internalStructure = this.getInternalStructurePoints(tonnage);
    
    if (location === 'HD') {
      return 9; // Head max is always 9
    }
    
    const structurePoints = internalStructure[location] || 0;
    return structurePoints * 2;
  }
  
  private getInternalStructurePoints(tonnage: number): Record<string, number> {
    // Use official BattleTech internal structure table
    const structure = getInternalStructurePoints(tonnage);
    
    return {
      HD: structure.HD,
      CT: structure.CT,
      LT: structure.LT,
      RT: structure.RT,
      LA: structure.LA,
      RA: structure.RA,
      LL: structure.LL,
      RL: structure.RL
    };
  }
  
  private validateRequiredFields(config: UnitConfiguration, result: ConfigurationValidationResult): void {
    const requiredFields = ['tonnage', 'engineType', 'gyroType', 'structureType', 'armorType'];
    
    requiredFields.forEach(field => {
      if (!(field in config) || config[field as keyof UnitConfiguration] === undefined) {
        result.errors.push(`Missing required field: ${field}`);
      }
    });
  }
  
  private validateEngineRating(config: UnitConfiguration, result: ConfigurationValidationResult): void {
    const engineValidation = this.validateEngineConstraints(config.tonnage, config.walkMP);
    
    if (!engineValidation.isValid) {
      result.errors.push(...engineValidation.errors);
    }
    
    if (config.walkMP > engineValidation.maxWalkMP) {
      result.warnings.push(`Walk MP ${config.walkMP} may require engine rating over 400`);
    }
  }
  
  private validateHeatSinks(config: UnitConfiguration, result: ConfigurationValidationResult): void {
    if (config.totalHeatSinks < 10) {
      result.errors.push('Total heat sinks must be at least 10');
    }
    
    const expectedInternal = this.calculateInternalHeatSinks(config.engineRating, config.engineType);
    if (config.internalHeatSinks !== expectedInternal) {
      result.warnings.push(`Internal heat sinks should be ${expectedInternal} for this engine`);
    }
    
    const expectedExternal = Math.max(0, config.totalHeatSinks - config.internalHeatSinks);
    if (config.externalHeatSinks !== expectedExternal) {
      result.warnings.push(`External heat sinks should be ${expectedExternal}`);
    }
  }
  
  private validateArmorConfiguration(config: UnitConfiguration, result: ConfigurationValidationResult): void {
    const armorValues = this.calculateArmorValues(config);
    
    // Check if armor tonnage matches allocation
    const calculatedTonnage = Math.ceil((armorValues.totalArmorPoints / this.getArmorEfficiency(config.armorType)) * 2) / 2;
    if (Math.abs(config.armorTonnage - calculatedTonnage) > 0.5) {
      result.warnings.push(`Armor tonnage (${config.armorTonnage}) doesn't match allocation (${calculatedTonnage})`);
    }
    
    // Check maximum armor limits
    if (armorValues.totalArmorPoints > armorValues.maxArmorPoints) {
      result.errors.push(`Total armor points (${armorValues.totalArmorPoints}) exceed maximum (${armorValues.maxArmorPoints})`);
    }
  }
  
  private validateJumpJets(config: UnitConfiguration, result: ConfigurationValidationResult): void {
    if (config.jumpMP > 0 && !config.jumpJetType) {
      result.errors.push('Jump MP specified but no jump jet type configured');
    }
    
    if (config.jumpMP > config.walkMP) {
      result.warnings.push('Jump MP should not exceed walk MP');
    }
  }
  
  private validateTechBaseConsistency(config: UnitConfiguration, result: ConfigurationValidationResult): void {
    const components = [
      { name: 'gyro', config: config.gyroType },
      { name: 'structure', config: config.structureType },
      { name: 'armor', config: config.armorType },
      { name: 'heatSink', config: config.heatSinkType },
      { name: 'jumpJet', config: config.jumpJetType }
    ];
    
    components.forEach(({ name, config: componentConfig }) => {
      if (componentConfig.techBase !== config.techBase) {
        result.warnings.push(`${name} tech base (${componentConfig.techBase}) doesn't match unit tech base (${config.techBase})`);
      }
    });
  }
}

// Singleton instance for global use
let globalConfigurationService: UnitConfigurationService | null = null;

/**
 * Get or create global configuration service
 */
export function getUnitConfigurationService(): UnitConfigurationService {
  if (!globalConfigurationService) {
    globalConfigurationService = new UnitConfigurationService();
  }
  return globalConfigurationService;
}

/**
 * Initialize global configuration service with specific options
 */
export function initializeUnitConfigurationService(options: Partial<ConfigurationOptions>): UnitConfigurationService {
  globalConfigurationService = new UnitConfigurationService(options);
  return globalConfigurationService;
}

/**
 * Reset global configuration service (for testing)
 */
export function resetUnitConfigurationService(): void {
  globalConfigurationService = null;
}
