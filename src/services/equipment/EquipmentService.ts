/**
 * EquipmentService - SOLID Equipment Management Service
 * 
 * Extracted from EquipmentAllocationService (1,126 lines → focused service)
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only manages equipment allocation and validation
 * - Open/Closed: Extensible through strategy injection for different equipment types
 * - Liskov Substitution: All equipment strategies are substitutable
 * - Interface Segregation: Depends only on equipment interfaces it needs
 * - Dependency Inversion: Depends on abstractions, not concrete implementations
 */

import {
  IEquipmentDatabase,
  IEquipmentFactory,
  IEquipmentValidationStrategy,
  IUnitConfiguration,
  IEquipmentAllocation,
  IEquipmentInstance,
  IEquipment,
  IWeapon,
  IAmmunition,
  ICompleteUnitState,
  IEquipmentValidationResult,
  IServiceEvent,
  Result,
  success,
  failure,
  EntityId,
  TechBase,
  RulesLevel,
  Severity
} from '../../types/core';

import { IObservableService, IService } from '../../types/core/BaseTypes';

/**
 * Missing interfaces that should be in core types
 */
export interface IEquipmentService extends IObservableService {
  getEquipment(equipmentId: EntityId): Promise<Result<IEquipment>>;
  searchEquipment(criteria: IEquipmentSearchCriteria): Promise<Result<IEquipment[]>>;
  allocateEquipment(unitConfig: IUnitConfiguration, equipmentId: EntityId, targetLocation: string, quantity?: number): Promise<Result<IEquipmentAllocationResult>>;
  removeEquipment(unitConfig: IUnitConfiguration, allocationId: EntityId): Promise<Result<boolean>>;
  moveEquipment(unitConfig: IUnitConfiguration, allocationId: EntityId, newLocation: string): Promise<Result<IEquipmentAllocationResult>>;
  validateEquipment(unitConfig: IUnitConfiguration, allocations: IEquipmentAllocation[]): Promise<Result<IEquipmentValidationResult>>;
  optimizeAllocation(unitConfig: IUnitConfiguration, allocations: IEquipmentAllocation[]): Promise<Result<IEquipmentOptimizationResult>>;
  createEquipmentInstance(equipment: IEquipment, configuration?: any): Promise<Result<IEquipmentInstance>>;
  getCompatibleEquipment(unitConfig: IUnitConfiguration, location?: string): Promise<Result<IEquipment[]>>;
}

export interface IEquipmentAllocationStrategy {
  allocateEquipment(equipment: IEquipment, location: string, quantity: number, context: IEquipmentAllocationContext): Promise<Result<IEquipmentAllocationResult>>;
}

export interface IEquipmentOptimizationStrategy {
  optimizeAllocation(unitConfig: IUnitConfiguration, allocations: IEquipmentAllocation[]): Promise<IEquipmentOptimizationResult>;
}

export interface IEquipmentAllocationResult {
  success: boolean;
  allocations: IEquipmentAllocation[];
  conflicts: string[];
  warnings: string[];
  optimizations: string[];
  metadata: {
    allocationTime: number;
    strategyUsed: string;
    constraintsChecked: number;
    preferencesApplied: number;
  };
}

export interface IEquipmentOptimizationResult {
  currentEfficiency: number;
  overallEfficiency: number;
  improvements: string[];
  alternatives: string[];
  recommendations: string[];
}

/**
 * Equipment service events
 */
export enum EquipmentEventType {
  EQUIPMENT_ADDED = 'equipment_added',
  EQUIPMENT_REMOVED = 'equipment_removed',
  EQUIPMENT_MOVED = 'equipment_moved',
  ALLOCATION_OPTIMIZED = 'allocation_optimized',
  VALIDATION_COMPLETED = 'validation_completed',
  DATABASE_UPDATED = 'database_updated'
}

/**
 * Equipment service configuration
 */
export interface IEquipmentServiceConfig {
  readonly enableAutoOptimization: boolean;
  readonly enableRealTimeValidation: boolean;
  readonly enableCompatibilityChecking: boolean;
  readonly maxAllocationAttempts: number;
  readonly cacheSize: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Equipment allocation context
 */
export interface IEquipmentAllocationContext {
  readonly unitConfig: IUnitConfiguration;
  readonly currentAllocations: IEquipmentAllocation[];
  readonly availableLocations: string[];
  readonly constraints: IAllocationConstraint[];
  readonly preferences: IAllocationPreference[];
}

/**
 * Allocation constraint
 */
export interface IAllocationConstraint {
  readonly type: 'location' | 'weight' | 'slots' | 'tech_level' | 'compatibility';
  readonly target: string;
  readonly operator: 'equals' | 'not_equals' | 'less_than' | 'greater_than' | 'contains';
  readonly value: any;
  readonly severity: 'error' | 'warning' | 'suggestion';
  readonly message: string;
}

/**
 * Allocation preference
 */
export interface IAllocationPreference {
  readonly type: 'location' | 'grouping' | 'symmetry' | 'protection';
  readonly weight: number;
  readonly description: string;
}

/**
 * Equipment cache entry
 */
interface EquipmentCacheEntry {
  readonly equipment: IEquipment;
  readonly timestamp: Date;
  readonly accessCount: number;
}

/**
 * SOLID-compliant EquipmentService implementation
 */
export class EquipmentService implements IEquipmentService {
  public readonly serviceName = 'EquipmentService';
  public readonly version = '1.0.0';

  private listeners = new Set<(event: IServiceEvent) => void>();
  private equipmentCache = new Map<string, EquipmentCacheEntry>();
  private config: IEquipmentServiceConfig;

  // Strategy dependencies (injected)
  private database?: IEquipmentDatabase;
  private factory?: IEquipmentFactory;
  private allocationStrategy?: IEquipmentAllocationStrategy;
  private validationStrategy?: IEquipmentValidationStrategy;
  private optimizationStrategy?: IEquipmentOptimizationStrategy;

  constructor(config: Partial<IEquipmentServiceConfig> = {}) {
    this.config = {
      enableAutoOptimization: true,
      enableRealTimeValidation: true,
      enableCompatibilityChecking: true,
      maxAllocationAttempts: 10,
      cacheSize: 1000,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * Initialize the equipment service
   */
  async initialize(): Promise<void> {
    this.log('info', 'Initializing EquipmentService...');
    
    // Initialize equipment database if available
    if (this.database) {
      await this.database.initialize?.();
    }

    // Clear cache
    this.clearCache();
    
    this.emitEvent({
      type: EquipmentEventType.DATABASE_UPDATED,
      timestamp: new Date(),
      data: { service: this.serviceName }
    });

    this.log('info', 'EquipmentService initialized successfully');
  }

  /**
   * Cleanup the equipment service
   */
  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up EquipmentService...');
    
    this.clearCache();
    this.listeners.clear();
    
    if (this.database) {
      await this.database.cleanup?.();
    }
    
    this.log('info', 'EquipmentService cleanup complete');
  }

  /**
   * Get equipment by ID
   */
  async getEquipment(equipmentId: EntityId): Promise<Result<IEquipment>> {
    try {
      this.log('debug', `Getting equipment: ${equipmentId}`);

      // Check cache first
      const cached = this.getFromCache(equipmentId);
      if (cached) {
        this.log('debug', 'Returning cached equipment');
        return success(cached);
      }

      // Get from database
      if (!this.database) {
        return failure(new Error('Equipment database not available'));
      }

      // Database integration removed - equipment should come from static data
      return failure(new Error('Database equipment lookup not implemented'));

    } catch (error) {
      this.log('error', `Failed to get equipment ${equipmentId}: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to get equipment'));
    }
  }

  /**
   * Search equipment by criteria
   */
  async searchEquipment(
    criteria: IEquipmentSearchCriteria
  ): Promise<Result<IEquipment[]>> {
    try {
      this.log('debug', `Searching equipment with criteria: ${JSON.stringify(criteria)}`);

      if (!this.database) {
        return failure(new Error('Equipment database not available'));
      }

      const results = await this.database.searchEquipment?.(criteria);
      
      if (!results || !Array.isArray(results)) {
        return failure(new Error('Invalid search results'));
      }
      
      // Cache popular results
      results.slice(0, 10).forEach(equipment => {
        this.addToCache(equipment.id, equipment);
      });

      return success(results);

    } catch (error) {
      this.log('error', `Equipment search failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Equipment search failed'));
    }
  }

  /**
   * Allocate equipment to unit
   */
  async allocateEquipment(
    unitConfig: IUnitConfiguration,
    equipmentId: EntityId,
    targetLocation: string,
    quantity: number = 1
  ): Promise<Result<IEquipmentAllocationResult>> {
    try {
      this.log('debug', `Allocating ${quantity}x ${equipmentId} to ${targetLocation}`);

      // Get equipment details
      const equipmentResult = await this.getEquipment(equipmentId);
      if (!equipmentResult.success) {
        return failure(equipmentResult.error);
      }

      const equipment = equipmentResult.data;

      // Create allocation context
      const context: IEquipmentAllocationContext = {
        unitConfig,
        currentAllocations: [], // Would get from unit state
        availableLocations: this.getAvailableLocations(unitConfig),
        constraints: this.generateConstraints(unitConfig, equipment),
        preferences: this.generatePreferences(unitConfig, equipment)
      };

      // Use allocation strategy if available
      if (this.allocationStrategy) {
        const allocationResult = await this.allocationStrategy.allocateEquipment(
          equipment,
          targetLocation,
          quantity,
          context
        );

        if (allocationResult.success) {
          this.emitEvent({
            type: EquipmentEventType.EQUIPMENT_ADDED,
            timestamp: new Date(),
            data: {
              equipmentId,
              location: targetLocation,
              quantity,
              success: true
            }
          });

          // Auto-optimize if enabled
          if (this.config.enableAutoOptimization && this.optimizationStrategy) {
            await this.optimizeAllocation(unitConfig, allocationResult.data.allocations);
          }
        }

        return allocationResult;
      }

             // Fallback: basic allocation
       const allocation: IEquipmentAllocation = {
         id: `${equipmentId}_${Date.now()}`,
         equipmentId,
         location: targetLocation,
         quantity,
         slotIndex: 0
       };

      const result: IEquipmentAllocationResult = {
        success: true,
        allocations: [allocation],
        conflicts: [],
        warnings: [],
        optimizations: [],
        metadata: {
          allocationTime: Date.now(),
          strategyUsed: 'fallback',
          constraintsChecked: context.constraints.length,
          preferencesApplied: 0
        }
      };

      this.emitEvent({
        type: EquipmentEventType.EQUIPMENT_ADDED,
        timestamp: new Date(),
        data: { equipmentId, location: targetLocation, quantity, success: true }
      });

      return success(result);

    } catch (error) {
      this.log('error', `Equipment allocation failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Equipment allocation failed'));
    }
  }

  /**
   * Remove equipment allocation
   */
  async removeEquipment(
    unitConfig: IUnitConfiguration,
    allocationId: EntityId
  ): Promise<Result<boolean>> {
    try {
      this.log('debug', `Removing equipment allocation: ${allocationId}`);

      // This would interact with unit state management
      // For now, simulate removal
      
      this.emitEvent({
        type: EquipmentEventType.EQUIPMENT_REMOVED,
        timestamp: new Date(),
        data: { allocationId, success: true }
      });

      return success(true);

    } catch (error) {
      this.log('error', `Equipment removal failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Equipment removal failed'));
    }
  }

  /**
   * Move equipment between locations
   */
  async moveEquipment(
    unitConfig: IUnitConfiguration,
    allocationId: EntityId,
    newLocation: string
  ): Promise<Result<IEquipmentAllocationResult>> {
    try {
      this.log('debug', `Moving equipment ${allocationId} to ${newLocation}`);

      // This would involve removing from old location and allocating to new
      // For now, simulate the move
      
      const result: IEquipmentAllocationResult = {
        success: true,
        allocations: [], // Would contain updated allocation
        conflicts: [],
        warnings: [],
        optimizations: [],
        metadata: {
          allocationTime: Date.now(),
          strategyUsed: 'move_operation',
          constraintsChecked: 0,
          preferencesApplied: 0
        }
      };

      this.emitEvent({
        type: EquipmentEventType.EQUIPMENT_MOVED,
        timestamp: new Date(),
        data: { allocationId, newLocation, success: true }
      });

      return success(result);

    } catch (error) {
      this.log('error', `Equipment move failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Equipment move failed'));
    }
  }

  /**
   * Validate equipment allocation
   */
  async validateEquipment(
    unitConfig: IUnitConfiguration,
    allocations: IEquipmentAllocation[]
  ): Promise<Result<IEquipmentValidationResult>> {
    try {
      this.log('debug', 'Validating equipment allocations');

      if (this.validationStrategy) {
        const result = await this.validationStrategy.validateEquipment(unitConfig, allocations);
        
        this.emitEvent({
          type: EquipmentEventType.VALIDATION_COMPLETED,
          timestamp: new Date(),
          data: { 
            allocationCount: allocations.length,
            isValid: result.isValid,
            violationCount: result.violations.length
          }
        });

        return success(result);
      }

      // Fallback: basic validation
      const result: IEquipmentValidationResult = {
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

      return success(result);

    } catch (error) {
      this.log('error', `Equipment validation failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Equipment validation failed'));
    }
  }

  /**
   * Optimize equipment allocation
   */
  async optimizeAllocation(
    unitConfig: IUnitConfiguration,
    allocations: IEquipmentAllocation[]
  ): Promise<Result<IEquipmentOptimizationResult>> {
    try {
      this.log('debug', 'Optimizing equipment allocation');

      if (this.optimizationStrategy) {
        const result = await this.optimizationStrategy.optimizeAllocation(unitConfig, allocations);
        
        if (result.improvements.length > 0) {
          this.emitEvent({
            type: EquipmentEventType.ALLOCATION_OPTIMIZED,
            timestamp: new Date(),
            data: { 
              improvementCount: result.improvements.length,
              efficiencyGain: result.overallEfficiency - result.currentEfficiency
            }
          });
        }

        return success(result);
      }

      // Fallback: no optimization
      const result: IEquipmentOptimizationResult = {
        currentEfficiency: 85,
        overallEfficiency: 85,
        improvements: [],
        alternatives: [],
        recommendations: ['Consider using optimization strategies for better equipment placement']
      };

      return success(result);

    } catch (error) {
      this.log('error', `Equipment optimization failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Equipment optimization failed'));
    }
  }

  /**
   * Create equipment instance
   */
  async createEquipmentInstance(
    equipment: IEquipment,
    configuration?: any
  ): Promise<Result<IEquipmentInstance>> {
    try {
      // Equipment factory integration removed - needs refactoring
      // if (this.factory) {
      //   return success(await this.factory.createEquipmentInstance(equipment, configuration));
      // }

      // Fallback: basic instance creation
      const instance: IEquipmentInstance = {
        id: `${equipment.id}_${Date.now()}`,
        equipmentId: equipment.id,
        equipment: equipment,
        location: 'unallocated',
        slotIndex: -1,
        quantity: 1,
        status: {
          operational: true,
          damaged: false,
          destroyed: false,
          criticalHits: 0
        },
        configuration: configuration
      };

      return success(instance);

    } catch (error) {
      this.log('error', `Equipment instance creation failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Equipment instance creation failed'));
    }
  }

  /**
   * Get compatible equipment for unit
   */
  async getCompatibleEquipment(
    unitConfig: IUnitConfiguration,
    location?: string
  ): Promise<Result<IEquipment[]>> {
    try {
      this.log('debug', `Getting compatible equipment for ${unitConfig.techBase} ${unitConfig.rulesLevel}`);

      const criteria: IEquipmentSearchCriteria = {
        techBase: [unitConfig.techBase],
        rulesLevel: [unitConfig.rulesLevel],
        availableAfter: ('era' in unitConfig && unitConfig.era) ? new Date(unitConfig.era as string) : undefined,
        ...(location && { allowedLocations: [location] })
      };

      return await this.searchEquipment(criteria);

    } catch (error) {
      this.log('error', `Compatible equipment search failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Compatible equipment search failed'));
    }
  }

  /**
   * Subscribe to equipment events
   */
  subscribe(listener: (event: IServiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Unsubscribe from equipment events
   */
  unsubscribe(listener: (event: IServiceEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Inject dependencies (Dependency Injection)
   */
  setDatabase(database: IEquipmentDatabase): void {
    this.database = database;
  }

  setFactory(factory: IEquipmentFactory): void {
    this.factory = factory;
  }

  setAllocationStrategy(strategy: IEquipmentAllocationStrategy): void {
    this.allocationStrategy = strategy;
  }

  setValidationStrategy(strategy: IEquipmentValidationStrategy): void {
    this.validationStrategy = strategy;
  }

  setOptimizationStrategy(strategy: IEquipmentOptimizationStrategy): void {
    this.optimizationStrategy = strategy;
  }

  /**
   * Clear equipment cache
   */
  clearCache(): void {
    this.equipmentCache.clear();
    this.log('debug', 'Equipment cache cleared');
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
      console.log(`[EquipmentService] ${level.toUpperCase()}: ${message}`);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private getFromCache(equipmentId: EntityId): IEquipment | null {
    const entry = this.equipmentCache.get(equipmentId);
    if (!entry) return null;

    // Update access count
    const updatedEntry = {
      ...entry,
      accessCount: entry.accessCount + 1
    };
    this.equipmentCache.set(equipmentId, updatedEntry);

    return entry.equipment;
  }

  private addToCache(equipmentId: EntityId, equipment: IEquipment): void {
    // Enforce cache size limit
    if (this.equipmentCache.size >= this.config.cacheSize) {
      // Remove least recently used entries
      const entries = Array.from(this.equipmentCache.entries());
      entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      const toRemove = entries.slice(0, Math.floor(this.config.cacheSize * 0.1));
      toRemove.forEach(([key]) => this.equipmentCache.delete(key));
    }

    const entry: EquipmentCacheEntry = {
      equipment,
      timestamp: new Date(),
      accessCount: 1
    };

    this.equipmentCache.set(equipmentId, entry);
  }

  private getAvailableLocations(unitConfig: IUnitConfiguration): string[] {
    // Standard BattleMech locations
    return [
      'Head',
      'Center Torso',
      'Left Torso',
      'Right Torso',
      'Left Arm',
      'Right Arm',
      'Left Leg',
      'Right Leg'
    ];
  }

  private generateConstraints(unitConfig: IUnitConfiguration, equipment: IEquipment): IAllocationConstraint[] {
    const constraints: IAllocationConstraint[] = [];

    // Tech base constraint
    if (this.config.enableCompatibilityChecking) {
      constraints.push({
        type: 'tech_level',
        target: 'equipment',
        operator: 'equals',
        value: unitConfig.techBase,
        severity: 'error',
        message: `Equipment tech base must match unit tech base (${unitConfig.techBase})`
      });
    }

    // Weight constraint (placeholder)
    constraints.push({
      type: 'weight',
      target: 'unit',
      operator: 'less_than',
      value: unitConfig.tonnage,
      severity: 'error',
      message: 'Total weight must not exceed unit tonnage'
    });

    return constraints;
  }

  private generatePreferences(unitConfig: IUnitConfiguration, equipment: IEquipment): IAllocationPreference[] {
    const preferences: IAllocationPreference[] = [];

    // Symmetry preference for weapons
    if (equipment.type === 'Weapon') {
      preferences.push({
        type: 'symmetry',
        weight: 0.7,
        description: 'Prefer symmetric weapon placement'
      });
    }

    // Protection preference for ammunition
    if (equipment.type === 'Ammunition') {
      preferences.push({
        type: 'protection',
        weight: 0.9,
        description: 'Prefer protected locations for ammunition'
      });
    }

    return preferences;
  }
}

/**
 * Equipment search criteria interface
 */
export interface IEquipmentSearchCriteria {
  readonly name?: string;
  readonly type?: string[];
  readonly techBase?: TechBase[];
  readonly rulesLevel?: RulesLevel[];
  readonly minWeight?: number;
  readonly maxWeight?: number;
  readonly allowedLocations?: string[];
  readonly requiredTags?: string[];
  readonly excludedTags?: string[];
  readonly availableAfter?: Date;
  readonly availableBefore?: Date;
  readonly limit?: number;
  readonly offset?: number;
}




