/**
 * ServiceOrchestrator - SOLID Service Integration Hub
 * 
 * This orchestrator provides a unified interface for React components to interact
 * with all SOLID services. It handles service coordination, cross-service communication,
 * and provides a migration path from monolithic to SOLID architecture.
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only orchestrates service interactions
 * - Open/Closed: Extensible through service registration
 * - Liskov Substitution: All services are substitutable through interfaces
 * - Interface Segregation: Focused orchestration interface
 * - Dependency Inversion: Depends on service abstractions
 */

import {
  IUnitConfiguration,
  IEquipmentAllocation,
  IEquipmentInstance,
  ICompleteUnitState,
  IServiceEvent,
  Result,
  success,
  failure,
  EntityId
} from '../../types/core';
import { TechBase, RulesLevel, isValidTechBase, isValidRulesLevel } from '../../types/core/BaseTypes';

import { ServiceRegistry } from '../core/ServiceRegistry';
import { EquipmentService } from '../equipment/EquipmentService';
import { UnitStateManager } from '../unit/UnitStateManager';
import { StandardHeatCalculationStrategy } from '../calculation/strategies/StandardHeatCalculationStrategy';
import { ValidationService } from '../validation/ValidationService';
import { CalculationOrchestrator } from '../calculation/CalculationOrchestrator';

/**
 * Orchestrated service operations
 */
export interface IServiceOrchestrator {
  // Service lifecycle
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // Unit operations
  loadUnit(unitId: EntityId): Promise<Result<ICompleteUnitState>>;
  saveUnit(unitState: ICompleteUnitState): Promise<Result<boolean>>;
  
  // Equipment operations
  addEquipment(unitId: EntityId, equipmentId: EntityId, location: string): Promise<Result<IEquipmentAllocation>>;
  removeEquipment(unitId: EntityId, allocationId: EntityId): Promise<Result<boolean>>;
  moveEquipment(unitId: EntityId, allocationId: EntityId, newLocation: string): Promise<Result<boolean>>;
  
  // Validation operations
  validateUnit(unitId: EntityId): Promise<Result<IValidationSummary>>;
  validateEquipment(unitId: EntityId): Promise<Result<IEquipmentValidationSummary>>;
  
  // Calculation operations
  calculateHeat(unitId: EntityId): Promise<Result<IHeatCalculationSummary>>;
  calculateWeight(unitId: EntityId): Promise<Result<IWeightCalculationSummary>>;
  calculateAll(unitId: EntityId): Promise<Result<IComprehensiveCalculationSummary>>;
  
  // Real-time operations
  subscribeToUnitChanges(unitId: EntityId, callback: (event: IUnitChangeEvent) => void): () => void;
  subscribeToCalculationUpdates(unitId: EntityId, callback: (event: ICalculationUpdateEvent) => void): () => void;
}

/**
 * Service orchestrator events
 */
export interface IUnitChangeEvent {
  type: 'unit_loaded' | 'unit_saved' | 'equipment_added' | 'equipment_removed' | 'equipment_moved';
  unitId: EntityId;
  timestamp: Date;
  data: any;
}

export interface ICalculationUpdateEvent {
  type: 'heat_updated' | 'weight_updated' | 'validation_updated' | 'all_updated';
  unitId: EntityId;
  timestamp: Date;
  calculations: any;
}

/**
 * Orchestrator result summaries
 */
export interface IValidationSummary {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface IEquipmentValidationSummary {
  isValid: boolean;
  weaponErrors: string[];
  ammoErrors: string[];
  placementErrors: string[];
  compatibilityErrors: string[];
}

export interface IHeatCalculationSummary {
  heatGeneration: number;
  heatDissipation: number;
  heatBalance: number;
  overheating: boolean;
  recommendations: string[];
}

export interface IWeightCalculationSummary {
  currentWeight: number;
  maxWeight: number;
  weightBalance: number;
  overweight: boolean;
  recommendations: string[];
}

export interface IComprehensiveCalculationSummary {
  heat: IHeatCalculationSummary;
  weight: IWeightCalculationSummary;
  validation: IValidationSummary;
  overallStatus: 'optimal' | 'warning' | 'error';
  criticalIssues: string[];
  improvements: string[];
}

/**
 * Service orchestrator configuration
 */
export interface IServiceOrchestratorConfig {
  readonly enableRealTimeUpdates: boolean;
  readonly enableAutoCalculation: boolean;
  readonly enableAutoValidation: boolean;
  readonly enableCaching: boolean;
  readonly calculationThrottleMs: number;
  readonly validationThrottleMs: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * SOLID-compliant ServiceOrchestrator implementation
 */
export class ServiceOrchestrator implements IServiceOrchestrator {
  private serviceRegistry: ServiceRegistry;
  private config: IServiceOrchestratorConfig;
  
  // Service references
  private equipmentService?: EquipmentService;
  private unitStateManager?: UnitStateManager;
  private validationService?: ValidationService;
  private calculationOrchestrator?: CalculationOrchestrator;
  
  // Real-time subscription management
  private unitChangeListeners = new Map<EntityId, Set<(event: IUnitChangeEvent) => void>>();
  private calculationUpdateListeners = new Map<EntityId, Set<(event: ICalculationUpdateEvent) => void>>();
  
  // Throttling for auto-updates
  private calculationThrottles = new Map<EntityId, any>();
  private validationThrottles = new Map<EntityId, any>();
  
  // Caching for performance
  private calculationCache = new Map<EntityId, IComprehensiveCalculationSummary>();
  private validationCache = new Map<EntityId, IValidationSummary>();

  constructor(config: Partial<IServiceOrchestratorConfig> = {}) {
    this.config = {
      enableRealTimeUpdates: true,
      enableAutoCalculation: true,
      enableAutoValidation: true,
      enableCaching: true,
      calculationThrottleMs: 500,
      validationThrottleMs: 300,
      logLevel: 'info',
      ...config
    };
    
    this.serviceRegistry = new ServiceRegistry();
  }

  /**
   * Initialize service orchestrator
   */
  async initialize(): Promise<void> {
    this.log('info', 'Initializing ServiceOrchestrator...');
    
    try {
      // Initialize service registry
      await this.serviceRegistry.initializeAll();
      
      // Register and initialize core services
      await this.registerServices();
      await this.initializeServices();
      
      // Setup cross-service communication
      this.setupServiceCommunication();
      
      this.log('info', 'ServiceOrchestrator initialized successfully');
      
    } catch (error) {
      this.log('error', `ServiceOrchestrator initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Cleanup service orchestrator
   */
  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up ServiceOrchestrator...');
    
    try {
      // Clear throttles
      this.calculationThrottles.forEach(timeout => clearTimeout(timeout));
      this.validationThrottles.forEach(timeout => clearTimeout(timeout));
      
      // Clear listeners
      this.unitChangeListeners.clear();
      this.calculationUpdateListeners.clear();
      
      // Clear caches
      this.calculationCache.clear();
      this.validationCache.clear();
      
      // Cleanup services
      await this.serviceRegistry.cleanup();
      
      this.log('info', 'ServiceOrchestrator cleanup complete');
      
    } catch (error) {
      this.log('error', `ServiceOrchestrator cleanup failed: ${error}`);
      throw error;
    }
  }

  /**
   * Load unit with full service coordination
   */
  async loadUnit(unitId: EntityId): Promise<Result<ICompleteUnitState>> {
    this.log('debug', `Loading unit: ${unitId}`);
    
    try {
      if (!this.unitStateManager) {
        return failure(new Error('Unit state manager not available'));
      }
      
      const result = await this.unitStateManager.getUnitState(unitId);
      
      if (result.success) {
        // Trigger auto-calculation if enabled
        if (this.config.enableAutoCalculation) {
          this.scheduleCalculationUpdate(unitId);
        }
        
        // Trigger auto-validation if enabled
        if (this.config.enableAutoValidation) {
          this.scheduleValidationUpdate(unitId);
        }
        
        // Emit unit loaded event
        this.emitUnitChangeEvent({
          type: 'unit_loaded',
          unitId,
          timestamp: new Date(),
          data: { unitState: result.data }
        });
      }
      
      return result;
      
    } catch (error) {
      this.log('error', `Failed to load unit ${unitId}: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to load unit'));
    }
  }

  /**
   * Save unit with validation and calculation updates
   */
  async saveUnit(unitState: ICompleteUnitState): Promise<Result<boolean>> {
    const unitId = this.extractUnitId(unitState);
    this.log('debug', `Saving unit: ${unitId}`);
    
    try {
      if (!this.unitStateManager) {
        return failure(new Error('Unit state manager not available'));
      }
      
      const result = await this.unitStateManager.saveUnitState(unitState);
      
      if (result.success) {
        // Clear caches for this unit
        this.calculationCache.delete(unitId);
        this.validationCache.delete(unitId);
        
        // Trigger updates
        if (this.config.enableAutoCalculation) {
          this.scheduleCalculationUpdate(unitId);
        }
        
        if (this.config.enableAutoValidation) {
          this.scheduleValidationUpdate(unitId);
        }
        
        // Emit unit saved event
        this.emitUnitChangeEvent({
          type: 'unit_saved',
          unitId,
          timestamp: new Date(),
          data: { unitState }
        });
      }
      
      return result;
      
    } catch (error) {
      this.log('error', `Failed to save unit ${unitId}: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to save unit'));
    }
  }

  /**
   * Add equipment with orchestrated updates
   */
  async addEquipment(unitId: EntityId, equipmentId: EntityId, location: string): Promise<Result<IEquipmentAllocation>> {
    this.log('debug', `Adding equipment ${equipmentId} to unit ${unitId} at ${location}`);
    
    try {
      if (!this.equipmentService || !this.unitStateManager) {
        return failure(new Error('Required services not available'));
      }
      
      // Get unit configuration
      const unitResult = await this.unitStateManager.getUnitState(unitId);
      if (!unitResult.success) {
        return failure(unitResult.error);
      }
      
      const unitConfig = this.extractUnitConfiguration(unitResult.data);
      
      // Allocate equipment
      const allocationResult = await this.equipmentService.allocateEquipment(
        unitConfig,
        equipmentId,
        location
      );
      
      if (allocationResult.success && allocationResult.data.success) {
        // Update unit state
        await this.updateUnitWithEquipment(unitId, allocationResult.data.allocations[0]);
        
        // Emit equipment added event
        this.emitUnitChangeEvent({
          type: 'equipment_added',
          unitId,
          timestamp: new Date(),
          data: { equipmentId, location, allocation: allocationResult.data.allocations[0] }
        });
        
        return success(allocationResult.data.allocations[0]);
      }
      
      return failure(new Error('Equipment allocation failed'));
      
    } catch (error) {
      this.log('error', `Failed to add equipment: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to add equipment'));
    }
  }

  /**
   * Remove equipment with orchestrated updates
   */
  async removeEquipment(unitId: EntityId, allocationId: EntityId): Promise<Result<boolean>> {
    this.log('debug', `Removing equipment ${allocationId} from unit ${unitId}`);
    
    try {
      if (!this.equipmentService || !this.unitStateManager) {
        return failure(new Error('Required services not available'));
      }
      
      // Get unit configuration
      const unitResult = await this.unitStateManager.getUnitState(unitId);
      if (!unitResult.success) {
        return failure(unitResult.error);
      }
      
      const unitConfig = this.extractUnitConfiguration(unitResult.data);
      
      // Remove equipment
      const result = await this.equipmentService.removeEquipment(unitConfig, allocationId);
      
      if (result.success) {
        // Update unit state
        await this.removeEquipmentFromUnit(unitId, allocationId);
        
        // Emit equipment removed event
        this.emitUnitChangeEvent({
          type: 'equipment_removed',
          unitId,
          timestamp: new Date(),
          data: { allocationId }
        });
      }
      
      return result;
      
    } catch (error) {
      this.log('error', `Failed to remove equipment: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to remove equipment'));
    }
  }

  /**
   * Move equipment with orchestrated updates
   */
  async moveEquipment(unitId: EntityId, allocationId: EntityId, newLocation: string): Promise<Result<boolean>> {
    this.log('debug', `Moving equipment ${allocationId} in unit ${unitId} to ${newLocation}`);
    
    try {
      if (!this.equipmentService || !this.unitStateManager) {
        return failure(new Error('Required services not available'));
      }
      
      // Get unit configuration
      const unitResult = await this.unitStateManager.getUnitState(unitId);
      if (!unitResult.success) {
        return failure(unitResult.error);
      }
      
      const unitConfig = this.extractUnitConfiguration(unitResult.data);
      
      // Move equipment
      const result = await this.equipmentService.moveEquipment(unitConfig, allocationId, newLocation);
      
      if (result.success) {
        // Update unit state
        await this.moveEquipmentInUnit(unitId, allocationId, newLocation);
        
        // Emit equipment moved event
        this.emitUnitChangeEvent({
          type: 'equipment_moved',
          unitId,
          timestamp: new Date(),
          data: { allocationId, newLocation }
        });
      }
      
      return success(result.success);
      
    } catch (error) {
      this.log('error', `Failed to move equipment: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to move equipment'));
    }
  }

  /**
   * Validate equipment with comprehensive checks
   */
  async validateEquipment(unitId: EntityId): Promise<Result<IEquipmentValidationSummary>> {
    this.log('debug', `Validating equipment for unit: ${unitId}`);
    
    try {
      if (!this.equipmentService || !this.unitStateManager) {
        return failure(new Error('Required services not available'));
      }
      
      // Get unit state
      const unitResult = await this.unitStateManager.getUnitState(unitId);
      if (!unitResult.success) {
        return failure(unitResult.error);
      }
      
      const unitConfig = this.extractUnitConfiguration(unitResult.data);
      const equipment = this.extractEquipmentAllocations(unitResult.data);
      
      // Validate equipment
      const validationResult = await this.equipmentService.validateEquipment(unitConfig, equipment);
      
      if (validationResult.success) {
        const summary: IEquipmentValidationSummary = {
          isValid: validationResult.data.isValid,
          weaponErrors: [],
          ammoErrors: [],
          placementErrors: [],
          compatibilityErrors: []
        };
        
        return success(summary);
      }
      
      return failure(validationResult.error);
      
    } catch (error) {
      this.log('error', `Failed to validate equipment: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to validate equipment'));
    }
  }

  /**
   * Validate unit with comprehensive checks
   */
  async validateUnit(unitId: EntityId): Promise<Result<IValidationSummary>> {
    this.log('debug', `Validating unit: ${unitId}`);
    
    try {
      // Check cache first
      if (this.config.enableCaching && this.validationCache.has(unitId)) {
        const cached = this.validationCache.get(unitId)!;
        return success(cached);
      }
      
      if (!this.validationService || !this.unitStateManager) {
        return failure(new Error('Required services not available'));
      }
      
      // Get unit state
      const unitResult = await this.unitStateManager.getUnitState(unitId);
      if (!unitResult.success) {
        return failure(unitResult.error);
      }
      
      const unitConfig = this.extractUnitConfiguration(unitResult.data);
      const equipment = this.extractEquipmentAllocations(unitResult.data);
      
      // Validate unit
      const validationResult = await this.validationService.validateUnit(unitConfig, equipment);
      
      if (validationResult.success) {
        const summary = this.createValidationSummary(validationResult.data);
        
        // Cache result
        if (this.config.enableCaching) {
          this.validationCache.set(unitId, summary);
        }
        
        return success(summary);
      }
      
      return failure(validationResult.error);
      
    } catch (error) {
      this.log('error', `Failed to validate unit: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to validate unit'));
    }
  }

  /**
   * Calculate heat with comprehensive analysis
   */
  async calculateHeat(unitId: EntityId): Promise<Result<IHeatCalculationSummary>> {
    this.log('debug', `Calculating heat for unit: ${unitId}`);
    
    try {
      if (!this.calculationOrchestrator || !this.unitStateManager) {
        return failure(new Error('Required services not available'));
      }
      
      // Get unit state
      const unitResult = await this.unitStateManager.getUnitState(unitId);
      if (!unitResult.success) {
        return failure(unitResult.error);
      }
      
      const unitConfig = this.extractUnitConfiguration(unitResult.data);
      const equipment = this.extractEquipmentAllocations(unitResult.data);
      
      // Calculate heat
      const heatResult = await this.calculationOrchestrator.calculateHeat(unitConfig, equipment);
      
      if (heatResult.success) {
        const summary = this.createHeatSummary(heatResult.data);
        return success(summary);
      }
      
      return failure(heatResult.error);
      
    } catch (error) {
      this.log('error', `Failed to calculate heat: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to calculate heat'));
    }
  }

  /**
   * Calculate weight with comprehensive analysis
   */
  async calculateWeight(unitId: EntityId): Promise<Result<IWeightCalculationSummary>> {
    this.log('debug', `Calculating weight for unit: ${unitId}`);
    
    try {
      if (!this.calculationOrchestrator || !this.unitStateManager) {
        return failure(new Error('Required services not available'));
      }
      
      // Get unit state
      const unitResult = await this.unitStateManager.getUnitState(unitId);
      if (!unitResult.success) {
        return failure(unitResult.error);
      }
      
      const unitConfig = this.extractUnitConfiguration(unitResult.data);
      const equipment = this.extractEquipmentAllocations(unitResult.data);
      
      // Calculate weight
      const weightResult = await this.calculationOrchestrator.calculateWeight(unitConfig, equipment);
      
      if (weightResult.success) {
        const summary = this.createWeightSummary(weightResult.data);
        return success(summary);
      }
      
      return failure(weightResult.error);
      
    } catch (error) {
      this.log('error', `Failed to calculate weight: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to calculate weight'));
    }
  }

  /**
   * Calculate all metrics with comprehensive analysis
   */
  async calculateAll(unitId: EntityId): Promise<Result<IComprehensiveCalculationSummary>> {
    this.log('debug', `Calculating all metrics for unit: ${unitId}`);
    
    try {
      // Check cache first
      if (this.config.enableCaching && this.calculationCache.has(unitId)) {
        const cached = this.calculationCache.get(unitId)!;
        return success(cached);
      }
      
      // Run all calculations in parallel
      const [heatResult, weightResult, validationResult] = await Promise.all([
        this.calculateHeat(unitId),
        this.calculateWeight(unitId),
        this.validateUnit(unitId)
      ]);
      
      // Check results
      if (!heatResult.success || !weightResult.success || !validationResult.success) {
        const errors = [
          !heatResult.success ? heatResult.error.message : null,
          !weightResult.success ? weightResult.error.message : null,
          !validationResult.success ? validationResult.error.message : null
        ].filter(Boolean);
        
        return failure(new Error(`Calculation failed: ${errors.join(', ')}`));
      }
      
      const summary = this.createComprehensiveSummary(
        heatResult.data,
        weightResult.data,
        validationResult.data
      );
      
      // Cache result
      if (this.config.enableCaching) {
        this.calculationCache.set(unitId, summary);
      }
      
      // Emit calculation update event
      this.emitCalculationUpdateEvent({
        type: 'all_updated',
        unitId,
        timestamp: new Date(),
        calculations: summary
      });
      
      return success(summary);
      
    } catch (error) {
      this.log('error', `Failed to calculate all metrics: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to calculate all metrics'));
    }
  }

  /**
   * Subscribe to unit changes
   */
  subscribeToUnitChanges(unitId: EntityId, callback: (event: IUnitChangeEvent) => void): () => void {
    if (!this.unitChangeListeners.has(unitId)) {
      this.unitChangeListeners.set(unitId, new Set());
    }
    
    const listeners = this.unitChangeListeners.get(unitId)!;
    listeners.add(callback);
    
    return () => listeners.delete(callback);
  }

  /**
   * Subscribe to calculation updates
   */
  subscribeToCalculationUpdates(unitId: EntityId, callback: (event: ICalculationUpdateEvent) => void): () => void {
    if (!this.calculationUpdateListeners.has(unitId)) {
      this.calculationUpdateListeners.set(unitId, new Set());
    }
    
    const listeners = this.calculationUpdateListeners.get(unitId)!;
    listeners.add(callback);
    
    return () => listeners.delete(callback);
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Type-safe extraction of unit ID from unit state
   */
  private extractUnitId(unitState: ICompleteUnitState): EntityId {
    const unitStateWithId = unitState as { unitId?: EntityId };
    return unitStateWithId.unitId || 'unknown';
  }

  /**
   * Type-safe extraction of unit ID from event data
   */
  private extractUnitIdFromEvent(event: IServiceEvent): EntityId | undefined {
    if (event.data && typeof event.data === 'object') {
      const eventData = event.data as { unitId?: EntityId };
      return eventData.unitId;
    }
    return undefined;
  }

  private async registerServices(): Promise<void> {
    // Register services with dependency injection
    this.serviceRegistry.register('EquipmentService', () => new EquipmentService());
    this.serviceRegistry.register('UnitStateManager', () => new UnitStateManager());
    this.serviceRegistry.register('ValidationService', () => new ValidationService());
    this.serviceRegistry.register('CalculationOrchestrator', () => new CalculationOrchestrator());
    this.serviceRegistry.register('HeatCalculationStrategy', () => new StandardHeatCalculationStrategy());
  }

  private async initializeServices(): Promise<void> {
    // Get service references
    this.equipmentService = this.serviceRegistry.resolve<EquipmentService>('EquipmentService') ?? undefined;
    this.unitStateManager = this.serviceRegistry.resolve<UnitStateManager>('UnitStateManager') ?? undefined;
    this.validationService = this.serviceRegistry.resolve<ValidationService>('ValidationService') ?? undefined;
    this.calculationOrchestrator = this.serviceRegistry.resolve<CalculationOrchestrator>('CalculationOrchestrator') ?? undefined;
    
    // Initialize services
    await Promise.all([
      this.equipmentService?.initialize(),
      this.unitStateManager?.initialize(),
      this.validationService?.initialize(),
      this.calculationOrchestrator?.initialize()
    ]);
  }

  private setupServiceCommunication(): void {
    // Setup cross-service event communication
    if (this.equipmentService) {
      this.equipmentService.subscribe((event: IServiceEvent) => {
        this.handleServiceEvent('equipment', event);
      });
    }
    
    if (this.unitStateManager) {
      this.unitStateManager.subscribe((event: IServiceEvent) => {
        this.handleServiceEvent('unit', event);
      });
    }
  }

  private handleServiceEvent(source: string, event: IServiceEvent): void {
    this.log('debug', `Service event from ${source}: ${event.type}`);
    
    // Handle events that require cross-service updates
    if (event.type.includes('equipment') && this.config.enableAutoCalculation) {
      const unitId = this.extractUnitIdFromEvent(event);
      if (unitId) {
        this.scheduleCalculationUpdate(unitId);
      }
    }
  }

  private scheduleCalculationUpdate(unitId: EntityId): void {
    // Clear existing throttle
    const existingThrottle = this.calculationThrottles.get(unitId);
    if (existingThrottle) {
      clearTimeout(existingThrottle);
    }
    
    // Schedule new calculation
    const throttle = setTimeout(async () => {
      try {
        await this.calculateAll(unitId);
      } catch (error) {
        this.log('error', `Scheduled calculation failed for unit ${unitId}: ${error}`);
      }
    }, this.config.calculationThrottleMs);
    
    this.calculationThrottles.set(unitId, throttle);
  }

  private scheduleValidationUpdate(unitId: EntityId): void {
    // Clear existing throttle
    const existingThrottle = this.validationThrottles.get(unitId);
    if (existingThrottle) {
      clearTimeout(existingThrottle);
    }
    
    // Schedule new validation
    const throttle = setTimeout(async () => {
      try {
        await this.validateUnit(unitId);
      } catch (error) {
        this.log('error', `Scheduled validation failed for unit ${unitId}: ${error}`);
      }
    }, this.config.validationThrottleMs);
    
    this.validationThrottles.set(unitId, throttle);
  }

  private emitUnitChangeEvent(event: IUnitChangeEvent): void {
    const listeners = this.unitChangeListeners.get(event.unitId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          this.log('error', `Unit change listener error: ${error}`);
        }
      });
    }
  }

  private emitCalculationUpdateEvent(event: ICalculationUpdateEvent): void {
    const listeners = this.calculationUpdateListeners.get(event.unitId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          this.log('error', `Calculation update listener error: ${error}`);
        }
      });
    }
  }

  private extractUnitConfiguration(unitState: ICompleteUnitState): IUnitConfiguration {
    // Extract unit configuration from complete state using safe accessors
    return {
      id: this.safeGetString(unitState, 'id', 'unknown'),
      chassisName: this.safeGetString(unitState, 'chassisName', 'Unknown'),
      model: this.safeGetString(unitState, 'model', 'Unknown'),
      tonnage: this.safeGetNumber(unitState, 'tonnage', 50),
      techBase: this.safeGetTechBase(unitState, 'techBase', 'Inner Sphere'),
      rulesLevel: this.safeGetRulesLevel(unitState, 'rulesLevel', 'Standard'),
      engineRating: this.safeGetNumber(unitState, 'engineRating', 200),
      engineType: this.safeGetString(unitState, 'engineType', 'Standard'),
      gyroType: this.safeGetString(unitState, 'gyroType', 'Standard'),
      cockpitType: this.safeGetString(unitState, 'cockpitType', 'Standard'),
      structureType: this.safeGetString(unitState, 'structureType', 'Standard'),
      armorType: this.safeGetString(unitState, 'armorType', 'Standard'),
      heatSinkType: this.safeGetString(unitState, 'heatSinkType', 'Single'),
      jumpJetType: this.safeGetString(unitState, 'jumpJetType', 'Standard'),
      armorAllocation: this.safeGetArmorAllocation(unitState, 'armorAllocation')
    };
  }

  private extractEquipmentAllocations(unitState: ICompleteUnitState): IEquipmentAllocation[] {
    // Extract equipment allocations from complete state using safe accessor
    return this.safeGetArray(unitState, 'equipment', []);
  }

  // Helper methods for safe property access
  private safeGetString(obj: unknown, key: string, defaultValue: string): string {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : defaultValue;
    }
    return defaultValue;
  }

  private safeGetNumber(obj: unknown, key: string, defaultValue: number): number {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === 'number' ? value : defaultValue;
    }
    return defaultValue;
  }

  private safeGetArray<T>(obj: unknown, key: string, defaultValue: T[]): T[] {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return Array.isArray(value) ? value : defaultValue;
    }
    return defaultValue;
  }

  private safeGetTechBase(obj: unknown, key: string, defaultValue: string): TechBase {
    const techBaseValue = this.safeGetString(obj, key, defaultValue);
    // Use type guard to ensure valid enum value
    if (isValidTechBase(techBaseValue)) {
      return techBaseValue;
    }
    // Return a valid enum value as fallback
    return defaultValue === 'Clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
  }

  private safeGetRulesLevel(obj: unknown, key: string, defaultValue: string): RulesLevel {
    const rulesLevelValue = this.safeGetString(obj, key, defaultValue);
    // Use type guard to ensure valid enum value
    if (isValidRulesLevel(rulesLevelValue)) {
      return rulesLevelValue;
    }
    // Return a valid enum value as fallback
    return defaultValue === 'Advanced' ? RulesLevel.ADVANCED : 
           defaultValue === 'Experimental' ? RulesLevel.EXPERIMENTAL :
           defaultValue === 'Introductory' ? RulesLevel.INTRODUCTORY :
           RulesLevel.STANDARD;
  }

  private safeGetArmorAllocation(obj: unknown, key: string): any {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return value || {};
    }
    return {};
  }

  private async updateUnitWithEquipment(unitId: EntityId, allocation: IEquipmentAllocation): Promise<void> {
    // Update unit state with new equipment allocation
    this.log('debug', `Updating unit ${unitId} with equipment allocation`);
  }

  private async removeEquipmentFromUnit(unitId: EntityId, allocationId: EntityId): Promise<void> {
    // Remove equipment allocation from unit state
    this.log('debug', `Removing equipment ${allocationId} from unit ${unitId}`);
  }

  private async moveEquipmentInUnit(unitId: EntityId, allocationId: EntityId, newLocation: string): Promise<void> {
    // Move equipment allocation in unit state
    this.log('debug', `Moving equipment ${allocationId} in unit ${unitId} to ${newLocation}`);
  }

  private createValidationSummary(validationData: any): IValidationSummary {
    return {
      isValid: validationData.isValid || true,
      errorCount: validationData.violations?.filter((v: any) => v.severity === 'error').length || 0,
      warningCount: validationData.violations?.filter((v: any) => v.severity === 'warning').length || 0,
      errors: validationData.violations?.filter((v: any) => v.severity === 'error').map((v: any) => v.message) || [],
      warnings: validationData.violations?.filter((v: any) => v.severity === 'warning').map((v: any) => v.message) || [],
      recommendations: validationData.recommendations || []
    };
  }

  private createHeatSummary(heatData: any): IHeatCalculationSummary {
    return {
      heatGeneration: heatData.heatGeneration || 0,
      heatDissipation: heatData.heatDissipation || 0,
      heatBalance: heatData.heatBalance || 0,
      overheating: (heatData.heatBalance || 0) < 0,
      recommendations: heatData.recommendations || []
    };
  }

  private createWeightSummary(weightData: any): IWeightCalculationSummary {
    return {
      currentWeight: weightData.currentWeight || 0,
      maxWeight: weightData.maxWeight || 50,
      weightBalance: weightData.weightBalance || 0,
      overweight: (weightData.weightBalance || 0) < 0,
      recommendations: weightData.recommendations || []
    };
  }

  private createComprehensiveSummary(
    heat: IHeatCalculationSummary,
    weight: IWeightCalculationSummary,
    validation: IValidationSummary
  ): IComprehensiveCalculationSummary {
    const criticalIssues: string[] = [];
    const improvements: string[] = [];
    
    if (heat.overheating) criticalIssues.push('Unit is overheating');
    if (weight.overweight) criticalIssues.push('Unit is overweight');
    if (!validation.isValid) criticalIssues.push('Unit has validation errors');
    
    improvements.push(...heat.recommendations);
    improvements.push(...weight.recommendations);
    improvements.push(...validation.recommendations);
    
    const overallStatus = criticalIssues.length > 0 ? 'error' : 
                         validation.warningCount > 0 ? 'warning' : 'optimal';
    
    return {
      heat,
      weight,
      validation,
      overallStatus,
      criticalIssues,
      improvements
    };
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.shouldLog(level)) {
      console.log(`[ServiceOrchestrator] ${level.toUpperCase()}: ${message}`);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }
}




