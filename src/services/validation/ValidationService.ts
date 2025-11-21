/**
 * ValidationService - SOLID Validation Orchestrator
 * 
 * Extracted from ConstructionRulesValidator (1,950 lines → focused service)
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only orchestrates validation, doesn't do validation logic
 * - Open/Closed: Extensible through strategy injection
 * - Liskov Substitution: All validation strategies are substitutable
 * - Interface Segregation: Depends only on validation interfaces it needs
 * - Dependency Inversion: Depends on abstractions, not concrete implementations
 */

import {
  IValidationService,
  IValidationOrchestrator,
  IWeightValidationStrategy,
  IHeatValidationStrategy,
  IMovementValidationStrategy,
  IArmorValidationStrategy,
  IStructureValidationStrategy,
  ICriticalSlotsValidationStrategy,
  ITechLevelValidationStrategy,
  IEquipmentValidationStrategy,
  IUnitConfiguration,
  IEquipmentAllocation,
  ICompleteValidationResult,
  IConfigurationValidationResult,
  IEquipmentValidationResult,
  IComplianceValidationResult,
  IValidationMetrics,
  IServiceEvent,
  Result,
  success,
  failure,
  EntityId
} from '../../types/core';

import { IObservableService, IService, Severity } from '../../types/core/BaseTypes';

/**
 * Validation event types
 */
export enum ValidationEventType {
  VALIDATION_STARTED = 'validation_started',
  VALIDATION_COMPLETED = 'validation_completed',
  VALIDATION_FAILED = 'validation_failed',
  STRATEGY_CHANGED = 'strategy_changed',
  CACHE_CLEARED = 'cache_cleared'
}

/**
 * Validation configuration
 */
export interface IValidationConfiguration {
  readonly enableCaching: boolean;
  readonly enableParallelValidation: boolean;
  readonly timeoutMs: number;
  readonly maxCacheSize: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Validation cache entry
 */
interface ValidationCacheEntry {
  readonly result: ICompleteValidationResult;
  readonly timestamp: Date;
  readonly configHash: string;
  readonly equipmentHash: string;
}

/**
 * SOLID-compliant ValidationService implementation
 * 
 * This service orchestrates validation by delegating to specialized
 * validation strategies, eliminating the monolithic god class pattern.
 */
export class ValidationService implements IValidationService {
  public readonly serviceName = 'ValidationService';
  public readonly version = '1.0.0';

  private listeners = new Set<(event: IServiceEvent) => void>();
  private validationCache = new Map<string, ValidationCacheEntry>();
  private config: IValidationConfiguration;
  private metrics: IValidationMetrics;

  // Strategy dependencies (injected)
  private weightValidator?: IWeightValidationStrategy;
  private heatValidator?: IHeatValidationStrategy;
  private movementValidator?: IMovementValidationStrategy;
  private armorValidator?: IArmorValidationStrategy;
  private structureValidator?: IStructureValidationStrategy;
  private slotsValidator?: ICriticalSlotsValidationStrategy;
  private techLevelValidator?: ITechLevelValidationStrategy;
  private equipmentValidator?: IEquipmentValidationStrategy;

  constructor(
    config: Partial<IValidationConfiguration> = {}
  ) {
    this.config = {
      enableCaching: true,
      enableParallelValidation: true,
      timeoutMs: 30000,
      maxCacheSize: 100,
      logLevel: 'info',
      ...config
    };

    this.metrics = {
      totalValidationTime: 0,
      strategyMetrics: [],
      cacheHitRate: 0,
      bottlenecks: [],
      optimizationSuggestions: []
    };
  }

  /**
   * Type-safe era property accessor
   */
  private static getConfigEra(config: IUnitConfiguration): string {
    // Since era is not in the IUnitConfiguration interface, safely access it if present
    const configWithEra = config as { era?: string };
    return (configWithEra.era && typeof configWithEra.era === 'string') 
      ? configWithEra.era 
      : 'Succession Wars';
  }

  /**
   * Initialize the validation service
   */
  async initialize(): Promise<void> {
    this.log('info', 'Initializing ValidationService...');
    
    // Initialize metrics
    this.resetMetrics();
    
    // Clear any existing cache
    this.clearCache();
    
    this.emitEvent({
      type: ValidationEventType.VALIDATION_STARTED,
      timestamp: new Date(),
      data: { service: this.serviceName }
    });

    this.log('info', 'ValidationService initialized successfully');
  }

  /**
   * Cleanup the validation service
   */
  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up ValidationService...');
    
    this.clearCache();
    this.listeners.clear();
    
    this.log('info', 'ValidationService cleanup complete');
  }

  /**
   * Validate complete unit configuration and equipment
   */
  async validateUnit(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<ICompleteValidationResult>> {
    const startTime = Date.now();
    
    try {
      this.log('debug', `Starting unit validation for ${config.chassisName} ${config.model}`);

      // Check cache first
      const cacheKey = this.generateCacheKey(config, equipment);
      if (this.config.enableCaching) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.log('debug', 'Returning cached validation result');
          return success(cached);
        }
      }

      // Validate configuration and equipment in parallel if enabled
      const [configResult, equipmentResult, complianceResult] = this.config.enableParallelValidation
        ? await Promise.all([
            this.validateConfiguration(config),
            this.validateEquipment(config, equipment),
            this.validateCompliance(config, equipment)
          ])
        : [
            await this.validateConfiguration(config),
            await this.validateEquipment(config, equipment),
            await this.validateCompliance(config, equipment)
          ];

      // Check if any validation failed
      if (!configResult.success) {
        return failure(configResult.error);
      }
      if (!equipmentResult.success) {
        return failure(equipmentResult.error);
      }
      if (!complianceResult.success) {
        return failure(complianceResult.error);
      }

      // Combine results
      const completeResult: ICompleteValidationResult = {
        isValid: configResult.data.isValid && equipmentResult.data.isValid && complianceResult.data.isValid,
        violations: [
          ...configResult.data.violations,
          ...equipmentResult.data.violations,
          ...complianceResult.data.violations
        ],
        warnings: [
          ...configResult.data.warnings,
          ...equipmentResult.data.warnings,
          ...complianceResult.data.warnings
        ],
        timestamp: new Date(),
        configurationValidation: configResult.data,
        equipmentValidation: equipmentResult.data,
        complianceValidation: complianceResult.data,
        optimizationValidation: {
          isValid: true,
          violations: [],
          warnings: [],
          timestamp: new Date(),
          overallScore: 85,
          improvements: [],
          alternatives: []
        },
        performanceMetrics: this.updateMetrics(Date.now() - startTime)
      };

      // Cache the result
      if (this.config.enableCaching) {
        this.addToCache(cacheKey, completeResult, config, equipment);
      }

      this.emitEvent({
        type: ValidationEventType.VALIDATION_COMPLETED,
        timestamp: new Date(),
        data: { 
          unitName: `${config.chassisName} ${config.model}`,
          isValid: completeResult.isValid,
          validationTime: Date.now() - startTime
        }
      });

      return success(completeResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      this.log('error', `Unit validation failed: ${errorMessage}`);
      
      this.emitEvent({
        type: ValidationEventType.VALIDATION_FAILED,
        timestamp: new Date(),
        data: { error: errorMessage }
      });

      return failure(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  /**
   * Validate unit configuration (structure, engine, armor, etc.)
   */
  async validateConfiguration(
    config: IUnitConfiguration
  ): Promise<Result<IConfigurationValidationResult>> {
    try {
      this.log('debug', 'Validating unit configuration...');

      // Delegate to specialized validators
      const [weight, heat, movement, armor, structure, criticalSlots] = await Promise.all([
        this.weightValidator?.validateWeight(config, []) || this.createDefaultWeightResult(),
        this.heatValidator?.validateHeat(config, []) || this.createDefaultHeatResult(),
        this.movementValidator?.validateMovement(config) || this.createDefaultMovementResult(),
        this.armorValidator?.validateArmor(config) || this.createDefaultArmorResult(),
        this.structureValidator?.validateStructure(config) || this.createDefaultStructureResult(),
        this.slotsValidator?.validateCriticalSlots(config, []) || this.createDefaultSlotsResult()
      ]);

      const configValidation: IConfigurationValidationResult = {
        isValid: weight.isValid && heat.isValid && movement.isValid && armor.isValid && structure.isValid && criticalSlots.isValid,
        violations: [
          ...weight.violations,
          ...heat.violations,
          ...movement.violations,
          ...armor.violations,
          ...structure.violations,
          ...criticalSlots.violations
        ],
        warnings: [
          ...weight.warnings,
          ...heat.warnings,
          ...movement.warnings,
          ...armor.warnings,
          ...structure.warnings,
          ...criticalSlots.warnings
        ],
        timestamp: new Date(),
        weight,
        heat,
        movement,
        armor,
        structure,
        criticalSlots
      };

      return success(configValidation);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Configuration validation failed'));
    }
  }

  /**
   * Validate equipment loadout
   */
  async validateEquipment(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IEquipmentValidationResult>> {
    try {
      this.log('debug', 'Validating equipment loadout...');

      // Use equipment validator if available
      if (this.equipmentValidator) {
        return success(await this.equipmentValidator.validateEquipment(config, equipment));
      }

      // Fallback: create default result
      const equipmentValidation: IEquipmentValidationResult = {
        isValid: true,
        violations: [],
        warnings: [],
        timestamp: new Date(),
        weaponValidation: {
          weaponCount: 0,
          totalWeaponWeight: 0,
          heatGeneration: 0,
          firepowerRating: 0,
          rangeProfile: {
            shortRange: { damage: 0, accuracy: 0, effectiveness: 0 },
            mediumRange: { damage: 0, accuracy: 0, effectiveness: 0 },
            longRange: { damage: 0, accuracy: 0, effectiveness: 0 },
            overallEffectiveness: 0
          },
          weaponCompatibility: []
        },
        ammoValidation: {
          totalAmmoWeight: 0,
          ammoBalance: [],
          caseProtection: {
            requiredLocations: [],
            protectedLocations: [],
            unprotectedLocations: [],
            isCompliant: true,
            riskLevel: Severity.WARNING
          },
          explosiveRisks: []
        },
        specialEquipmentValidation: {
          specialEquipment: [],
          synergies: [],
          conflicts: []
        },
        placementValidation: {
          locationConstraints: [],
          placementViolations: [],
          optimization: {
            currentEfficiency: 100,
            potentialEfficiency: 100,
            improvements: []
          }
        }
      };

      return success(equipmentValidation);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Equipment validation failed'));
    }
  }

  /**
   * Validate tech level compliance
   */
  async validateCompliance(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IComplianceValidationResult>> {
    try {
      this.log('debug', 'Validating tech level compliance...');

      // Use tech level validator if available
      if (this.techLevelValidator) {
        const techLevelResult = await this.techLevelValidator.validateTechLevel(config, equipment);
        
        const complianceValidation: IComplianceValidationResult = {
          isValid: techLevelResult.isValid,
          violations: techLevelResult.violations,
          warnings: techLevelResult.warnings,
          timestamp: new Date(),
          techLevel: techLevelResult,
          ruleCompliance: [],
          overallScore: techLevelResult.isValid ? 100 : 50,
          complianceGrade: techLevelResult.isValid ? 'A' : 'C'
        };

        return success(complianceValidation);
      }

      // Fallback: create default result
      const complianceValidation: IComplianceValidationResult = {
        isValid: true,
        violations: [],
        warnings: [],
        timestamp: new Date(),
        techLevel: {
          isValid: true,
          violations: [],
          warnings: [],
          timestamp: new Date(),
          unitTechLevel: config.rulesLevel,
          unitTechBase: config.techBase,
          era: ValidationService.getConfigEra(config),
          mixedTech: {
            isMixed: false,
            innerSphereComponents: 0,
            clanComponents: 0,
            allowedMixed: false,
            restrictions: []
          },
          componentCompliance: []
        },
        ruleCompliance: [],
        overallScore: 100,
        complianceGrade: 'A'
      };

      return success(complianceValidation);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Compliance validation failed'));
    }
  }

  /**
   * Get available validation strategies
   */
  getValidationStrategies(): string[] {
    const strategies: string[] = [];
    
    if (this.weightValidator) strategies.push('WeightValidation');
    if (this.heatValidator) strategies.push('HeatValidation');
    if (this.movementValidator) strategies.push('MovementValidation');
    if (this.armorValidator) strategies.push('ArmorValidation');
    if (this.structureValidator) strategies.push('StructureValidation');
    if (this.slotsValidator) strategies.push('CriticalSlotsValidation');
    if (this.techLevelValidator) strategies.push('TechLevelValidation');
    if (this.equipmentValidator) strategies.push('EquipmentValidation');

    return strategies;
  }

  /**
   * Set validation strategy (for strategy pattern implementation)
   */
  setValidationStrategy(strategyName: string): void {
    this.log('info', `Setting validation strategy: ${strategyName}`);
    
    this.emitEvent({
      type: ValidationEventType.STRATEGY_CHANGED,
      timestamp: new Date(),
      data: { strategy: strategyName }
    });
  }

  /**
   * Get validation performance metrics
   */
  getValidationMetrics(): IValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Subscribe to validation events
   */
  subscribe(listener: (event: IServiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Unsubscribe from validation events
   */
  unsubscribe(listener: (event: IServiceEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Inject validation strategies (Dependency Injection)
   */
  setWeightValidator(validator: IWeightValidationStrategy): void {
    this.weightValidator = validator;
  }

  setHeatValidator(validator: IHeatValidationStrategy): void {
    this.heatValidator = validator;
  }

  setMovementValidator(validator: IMovementValidationStrategy): void {
    this.movementValidator = validator;
  }

  setArmorValidator(validator: IArmorValidationStrategy): void {
    this.armorValidator = validator;
  }

  setStructureValidator(validator: IStructureValidationStrategy): void {
    this.structureValidator = validator;
  }

  setSlotsValidator(validator: ICriticalSlotsValidationStrategy): void {
    this.slotsValidator = validator;
  }

  setTechLevelValidator(validator: ITechLevelValidationStrategy): void {
    this.techLevelValidator = validator;
  }

  setEquipmentValidator(validator: IEquipmentValidationStrategy): void {
    this.equipmentValidator = validator;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.emitEvent({
      type: ValidationEventType.CACHE_CLEARED,
      timestamp: new Date(),
      data: {}
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  private emitEvent(event: IServiceEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.log('error', `Event listener error: ${error}`);
      }
    });
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.shouldLog(level)) {
      console.log(`[ValidationService] ${level.toUpperCase()}: ${message}`);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private generateCacheKey(config: IUnitConfiguration, equipment: IEquipmentAllocation[]): string {
    // Simple hash of configuration and equipment for caching
    const configString = JSON.stringify({
      id: config.id,
      tonnage: config.tonnage,
      engineRating: config.engineRating,
      techBase: config.techBase
    });
    const equipmentString = JSON.stringify(equipment.map(e => ({
      id: e.equipmentId,
      location: e.location,
      quantity: e.quantity
    })));
    
    return `${this.hashString(configString)}_${this.hashString(equipmentString)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private getFromCache(key: string): ICompleteValidationResult | null {
    const entry = this.validationCache.get(key);
    if (!entry) return null;

    // Check if cache entry is still valid (not older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (entry.timestamp < fiveMinutesAgo) {
      this.validationCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private addToCache(
    key: string, 
    result: ICompleteValidationResult, 
    config: IUnitConfiguration, 
    equipment: IEquipmentAllocation[]
  ): void {
    // Enforce cache size limit
    if (this.validationCache.size >= this.config.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.validationCache.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      const toRemove = entries.slice(0, Math.floor(this.config.maxCacheSize * 0.2));
      toRemove.forEach(([k]) => this.validationCache.delete(k));
    }

    const entry: ValidationCacheEntry = {
      result,
      timestamp: new Date(),
      configHash: this.hashString(JSON.stringify(config)),
      equipmentHash: this.hashString(JSON.stringify(equipment))
    };

    this.validationCache.set(key, entry);
  }

  private updateMetrics(validationTime: number): IValidationMetrics {
    const totalRequests = this.metrics.strategyMetrics.reduce((sum, m) => sum + m.validationCount, 0) + 1;
    const cacheHits = Math.floor(totalRequests * 0.7); // Estimate for now
    
    // Create new metrics object (since properties are readonly)
    this.metrics = {
      totalValidationTime: this.metrics.totalValidationTime + validationTime,
      strategyMetrics: [...this.metrics.strategyMetrics],
      cacheHitRate: cacheHits / totalRequests,
      bottlenecks: [...this.metrics.bottlenecks],
      optimizationSuggestions: [...this.metrics.optimizationSuggestions]
    };

    return this.metrics;
  }

  private resetMetrics(): void {
    this.metrics = {
      totalValidationTime: 0,
      strategyMetrics: [],
      cacheHitRate: 0,
      bottlenecks: [],
      optimizationSuggestions: []
    };
  }

  // Default result creators for when strategies aren't available
  private createDefaultWeightResult(): any {
    return {
      isValid: true,
      violations: [],
      warnings: [],
      timestamp: new Date(),
      totalWeight: 0,
      maxWeight: 0,
      overweight: 0,
      underweight: 0,
      distribution: {},
      efficiency: 100
    };
  }

  private createDefaultHeatResult(): any {
    return {
      isValid: true,
      violations: [],
      warnings: [],
      timestamp: new Date(),
      heatGeneration: 0,
      heatDissipation: 10,
      heatDeficit: 0,
      minimumHeatSinks: 10, // This is minimum TOTAL heat sinks for the mech, not engine heat sinks
      actualHeatSinks: 10,
      engineHeatSinks: 10,
      externalHeatSinks: 0,
      efficiency: 100
    };
  }

  private createDefaultMovementResult(): any {
    return {
      isValid: true,
      violations: [],
      warnings: [],
      timestamp: new Date(),
      walkMP: 0,
      runMP: 0,
      jumpMP: 0,
      engineRating: 0,
      tonnage: 0,
      engineType: 'Standard',
      movementProfile: {
        classification: 'moderate',
        walkRatio: 1,
        runRatio: 1.5,
        jumpRatio: 0
      }
    };
  }

  private createDefaultArmorResult(): any {
    return {
      isValid: true,
      violations: [],
      warnings: [],
      timestamp: new Date(),
      totalArmor: 0,
      maxArmor: 0,
      armorType: 'Standard',
      armorWeight: 0,
      armorEfficiency: 100,
      locationValidation: []
    };
  }

  private createDefaultStructureResult(): any {
    return {
      isValid: true,
      violations: [],
      warnings: [],
      timestamp: new Date(),
      structureType: 'Standard',
      structureWeight: 0,
      internalStructure: 0,
      structureEfficiency: 100,
      slotsRequired: 0,
      slotsAvailable: 0
    };
  }

  private createDefaultSlotsResult(): any {
    return {
      isValid: true,
      violations: [],
      warnings: [],
      timestamp: new Date(),
      totalSlotsUsed: 0,
      totalSlotsAvailable: 0,
      utilizationPercent: 0,
      locationUtilization: [],
      overflow: false
    };
  }
}




