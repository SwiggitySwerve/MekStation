/**
 * UnitStateManager - SOLID Unit State Management Service
 * 
 * Extracted from UnitCriticalManager (2,084 lines → focused services)
 * 
 * This service demonstrates the decomposition of a massive god class into
 * focused, single-responsibility services that handle specific aspects
 * of unit state management.
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only manages unit state and critical hits
 * - Open/Closed: Extensible through state change strategies
 * - Liskov Substitution: All state managers are substitutable
 * - Interface Segregation: Depends only on state management interfaces
 * - Dependency Inversion: Depends on abstractions for persistence
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

import { IObservableService, IService } from '../../types/core/BaseTypes';

/**
 * Unit state management interfaces
 */
export interface IUnitStateManager extends IObservableService {
  getUnitState(unitId: EntityId): Promise<Result<ICompleteUnitState>>;
  saveUnitState(unitState: ICompleteUnitState): Promise<Result<boolean>>;
  applyCriticalHit(unitId: EntityId, location: string, slot: number, damage: ICriticalHit): Promise<Result<ICriticalHitResult>>;
  repairCriticalHit(unitId: EntityId, criticalHitId: EntityId): Promise<Result<boolean>>;
  getUnitHealth(unitId: EntityId): Promise<Result<IUnitHealthStatus>>;
  validateUnitIntegrity(unitState: ICompleteUnitState): Promise<Result<IIntegrityValidationResult>>;
}

export interface IStatePersistenceStrategy {
  saveState(unitState: ICompleteUnitState): Promise<Result<boolean>>;
  loadState(unitId: EntityId): Promise<Result<ICompleteUnitState>>;
  deleteState(unitId: EntityId): Promise<Result<boolean>>;
}

export interface ICriticalHitStrategy {
  applyCriticalHit(target: IEquipmentInstance, damage: ICriticalHit): Promise<ICriticalHitResult>;
  calculateDamageEffects(damage: ICriticalHit, location: string): Promise<IDamageEffect[]>;
}

/**
 * Critical hit data structures
 */
export interface ICriticalHit {
  readonly id: EntityId;
  readonly type: 'critical' | 'through_armor' | 'internal' | 'ammo_explosion';
  readonly damage: number;
  readonly location: string;
  readonly slot: number;
  readonly source: string;
  readonly timestamp: Date;
}

export interface ICriticalHitResult {
  readonly success: boolean;
  readonly criticalHit: ICriticalHit;
  readonly damageEffects: IDamageEffect[];
  readonly cascadingEffects: ICascadingEffect[];
  readonly unitStatus: IUnitHealthStatus;
}

export interface IDamageEffect {
  readonly type: 'destroyed' | 'damaged' | 'disabled' | 'reduced_efficiency';
  readonly target: EntityId;
  readonly severity: number; // 0-100
  readonly description: string;
  readonly repairable: boolean;
  readonly repairCost: number;
}

export interface ICascadingEffect {
  readonly type: 'ammo_explosion' | 'reactor_breach' | 'system_failure';
  readonly triggerLocation: string;
  readonly affectedLocations: string[];
  readonly damage: number;
  readonly description: string;
}

export interface IUnitHealthStatus {
  readonly overallHealth: number; // 0-100
  readonly structuralIntegrity: number; // 0-100
  readonly operationalStatus: 'operational' | 'damaged' | 'critical' | 'destroyed';
  readonly criticalSystems: ICriticalSystemStatus[];
  readonly armorStatus: IArmorStatus;
  readonly equipmentStatus: IEquipmentStatus[];
}

export interface ICriticalSystemStatus {
  readonly system: string;
  readonly status: 'operational' | 'damaged' | 'destroyed';
  readonly efficiency: number; // 0-100
  readonly criticalHits: number;
}

export interface IArmorStatus {
  readonly totalArmor: number;
  readonly maxArmor: number;
  readonly armorPercent: number;
  readonly locationArmor: ILocationArmorStatus[];
}

export interface ILocationArmorStatus {
  readonly location: string;
  readonly currentArmor: number;
  readonly maxArmor: number;
  readonly armorPercent: number;
  readonly breached: boolean;
}

export interface IEquipmentStatus {
  readonly equipmentId: EntityId;
  readonly name: string;
  readonly status: 'operational' | 'damaged' | 'destroyed';
  readonly efficiency: number; // 0-100
  readonly criticalHits: number;
  readonly location: string;
}

export interface IIntegrityValidationResult {
  readonly isValid: boolean;
  readonly violations: IIntegrityViolation[];
  readonly warnings: string[];
  readonly recommendations: string[];
}

export interface IIntegrityViolation {
  readonly type: 'critical_system_destroyed' | 'impossible_state' | 'cascading_failure';
  readonly severity: 'error' | 'warning';
  readonly description: string;
  readonly affectedSystems: string[];
}

/**
 * Unit state events
 */
export enum UnitStateEventType {
  STATE_SAVED = 'state_saved',
  STATE_LOADED = 'state_loaded',
  CRITICAL_HIT_APPLIED = 'critical_hit_applied',
  CRITICAL_HIT_REPAIRED = 'critical_hit_repaired',
  UNIT_DESTROYED = 'unit_destroyed',
  SYSTEM_FAILURE = 'system_failure',
  INTEGRITY_VIOLATION = 'integrity_violation'
}

/**
 * Unit state manager configuration
 */
export interface IUnitStateConfig {
  readonly enableAutoSave: boolean;
  readonly enableIntegrityChecking: boolean;
  readonly enableCascadingDamage: boolean;
  readonly autoSaveInterval: number; // milliseconds
  readonly maxStateHistory: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * SOLID-compliant UnitStateManager implementation
 */
export class UnitStateManager implements IUnitStateManager {
  public readonly serviceName = 'UnitStateManager';
  public readonly version = '1.0.0';

  private listeners = new Set<(event: IServiceEvent) => void>();
  private unitStates = new Map<EntityId, ICompleteUnitState>();
  private stateHistory = new Map<EntityId, ICompleteUnitState[]>();
  private config: IUnitStateConfig;
  private autoSaveTimer?: any;

  // Strategy dependencies (injected)
  private persistenceStrategy?: IStatePersistenceStrategy;
  private criticalHitStrategy?: ICriticalHitStrategy;

  constructor(config: Partial<IUnitStateConfig> = {}) {
    this.config = {
      enableAutoSave: true,
      enableIntegrityChecking: true,
      enableCascadingDamage: true,
      autoSaveInterval: 30000, // 30 seconds
      maxStateHistory: 50,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * Initialize the unit state manager
   */
  async initialize(): Promise<void> {
    this.log('info', 'Initializing UnitStateManager...');
    
    // Setup auto-save if enabled
    if (this.config.enableAutoSave) {
      this.setupAutoSave();
    }

    this.log('info', 'UnitStateManager initialized successfully');
  }

  /**
   * Cleanup the unit state manager
   */
  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up UnitStateManager...');
    
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Save any pending states
    if (this.config.enableAutoSave) {
      await this.saveAllPendingStates();
    }

    this.unitStates.clear();
    this.stateHistory.clear();
    this.listeners.clear();
    
    this.log('info', 'UnitStateManager cleanup complete');
  }

  /**
   * Get complete unit state
   */
  async getUnitState(unitId: EntityId): Promise<Result<ICompleteUnitState>> {
    try {
      this.log('debug', `Getting unit state: ${unitId}`);

      // Check in-memory cache first
      let unitState = this.unitStates.get(unitId);
      
      if (!unitState && this.persistenceStrategy) {
        // Load from persistence
        const loadResult = await this.persistenceStrategy.loadState(unitId);
        if (loadResult.success) {
          unitState = loadResult.data;
          this.unitStates.set(unitId, unitState);
          
          this.emitEvent({
            type: UnitStateEventType.STATE_LOADED,
            timestamp: new Date(),
            data: { unitId }
          });
        }
      }

      if (!unitState) {
        return failure(new Error(`Unit state not found: ${unitId}`));
      }

      // Validate integrity if enabled
      if (this.config.enableIntegrityChecking) {
        const validationResult = await this.validateUnitIntegrity(unitState);
        if (!validationResult.success || !validationResult.data.isValid) {
          this.log('warn', `Unit integrity issues detected for ${unitId}`);
        }
      }

      return success(unitState);

    } catch (error) {
      this.log('error', `Failed to get unit state ${unitId}: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to get unit state'));
    }
  }

  /**
   * Save unit state
   */
  async saveUnitState(unitState: ICompleteUnitState): Promise<Result<boolean>> {
    try {
      const unitId = this.extractUnitId(unitState);
      this.log('debug', `Saving unit state: ${unitId}`);

      // Validate state before saving
      if (this.config.enableIntegrityChecking) {
        const validationResult = await this.validateUnitIntegrity(unitState);
        if (!validationResult.success) {
          return failure(validationResult.error);
        }
        
        if (!validationResult.data.isValid) {
          this.log('warn', `Saving unit state with integrity violations: ${unitId}`);
        }
      }

      // Save to in-memory cache
      this.unitStates.set(unitId, unitState);

      // Add to history
      this.addToHistory(unitId, unitState);

      // Save to persistence if available
      if (this.persistenceStrategy) {
        const saveResult = await this.persistenceStrategy.saveState(unitState);
        if (!saveResult.success) {
          return failure(saveResult.error);
        }
      }

      this.emitEvent({
        type: UnitStateEventType.STATE_SAVED,
        timestamp: new Date(),
        data: { unitId }
      });

      return success(true);

    } catch (error) {
      this.log('error', `Failed to save unit state: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to save unit state'));
    }
  }

  /**
   * Apply critical hit to unit
   */
  async applyCriticalHit(
    unitId: EntityId,
    location: string,
    slot: number,
    damage: ICriticalHit
  ): Promise<Result<ICriticalHitResult>> {
    try {
      this.log('debug', `Applying critical hit to ${unitId} at ${location}:${slot}`);

      // Get current unit state
      const stateResult = await this.getUnitState(unitId);
      if (!stateResult.success) {
        return failure(stateResult.error);
      }

      const unitState = stateResult.data;

      // Find equipment at the target location/slot
      const targetEquipment = this.findEquipmentAtSlot(unitState, location, slot);
      if (!targetEquipment) {
        return failure(new Error(`No equipment found at ${location}:${slot}`));
      }

      // Apply critical hit using strategy
      let criticalHitResult: ICriticalHitResult;
      
      if (this.criticalHitStrategy) {
        criticalHitResult = await this.criticalHitStrategy.applyCriticalHit(targetEquipment, damage);
      } else {
        // Fallback: basic critical hit application
        criticalHitResult = this.applyBasicCriticalHit(targetEquipment, damage, location);
      }

      // Apply cascading effects if enabled
      if (this.config.enableCascadingDamage && criticalHitResult.cascadingEffects.length > 0) {
        await this.applyCascadingEffects(unitState, criticalHitResult.cascadingEffects);
      }

      // Update unit state
      this.updateUnitStateFromCriticalHit(unitState, criticalHitResult);

      // Save updated state
      const saveResult = await this.saveUnitState(unitState);
      if (!saveResult.success) {
        this.log('warn', `Failed to save state after critical hit: ${saveResult.error.message}`);
      }

      this.emitEvent({
        type: UnitStateEventType.CRITICAL_HIT_APPLIED,
        timestamp: new Date(),
        data: { 
          unitId, 
          location, 
          slot, 
          damage: damage.damage,
          type: damage.type 
        }
      });

      return success(criticalHitResult);

    } catch (error) {
      this.log('error', `Failed to apply critical hit: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to apply critical hit'));
    }
  }

  /**
   * Repair critical hit
   */
  async repairCriticalHit(unitId: EntityId, criticalHitId: EntityId): Promise<Result<boolean>> {
    try {
      this.log('debug', `Repairing critical hit ${criticalHitId} on unit ${unitId}`);

      // Get current unit state
      const stateResult = await this.getUnitState(unitId);
      if (!stateResult.success) {
        return failure(stateResult.error);
      }

      const unitState = stateResult.data;

      // Find and repair the critical hit
      const repaired = this.repairCriticalHitInState(unitState, criticalHitId);
      if (!repaired) {
        return failure(new Error(`Critical hit not found: ${criticalHitId}`));
      }

      // Save updated state
      const saveResult = await this.saveUnitState(unitState);
      if (!saveResult.success) {
        return failure(saveResult.error);
      }

      this.emitEvent({
        type: UnitStateEventType.CRITICAL_HIT_REPAIRED,
        timestamp: new Date(),
        data: { unitId, criticalHitId }
      });

      return success(true);

    } catch (error) {
      this.log('error', `Failed to repair critical hit: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to repair critical hit'));
    }
  }

  /**
   * Get unit health status
   */
  async getUnitHealth(unitId: EntityId): Promise<Result<IUnitHealthStatus>> {
    try {
      const stateResult = await this.getUnitState(unitId);
      if (!stateResult.success) {
        return failure(stateResult.error);
      }

      const healthStatus = this.calculateUnitHealth(stateResult.data);
      return success(healthStatus);

    } catch (error) {
      this.log('error', `Failed to get unit health: ${error}`);
      return failure(error instanceof Error ? error : new Error('Failed to get unit health'));
    }
  }

  /**
   * Validate unit integrity
   */
  async validateUnitIntegrity(unitState: ICompleteUnitState): Promise<Result<IIntegrityValidationResult>> {
    try {
      const unitId = this.extractUnitId(unitState);
      this.log('debug', `Validating unit integrity for ${unitId}`);

      const violations: IIntegrityViolation[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Check for critical system destruction
      const criticalSystems = ['Engine', 'Gyro', 'Cockpit', 'Life Support'];
      for (const system of criticalSystems) {
        if (this.isSystemDestroyed(unitState, system)) {
          violations.push({
            type: 'critical_system_destroyed',
            severity: 'error',
            description: `Critical system ${system} is destroyed`,
            affectedSystems: [system]
          });
        }
      }

      // Check for impossible states (e.g., equipment in destroyed locations)
      const impossibleStates = this.findImpossibleStates(unitState);
      violations.push(...impossibleStates);

      // Check for cascading failure conditions
      const cascadingFailures = this.findCascadingFailures(unitState);
      violations.push(...cascadingFailures);

      // Generate warnings and recommendations
      if (violations.length > 0) {
        warnings.push(`Unit has ${violations.length} integrity violation(s)`);
        recommendations.push('Consider repairs or replacement of critical systems');
      }

      const result: IIntegrityValidationResult = {
        isValid: violations.filter(v => v.severity === 'error').length === 0,
        violations,
        warnings,
        recommendations
      };

      if (!result.isValid) {
        this.emitEvent({
          type: UnitStateEventType.INTEGRITY_VIOLATION,
          timestamp: new Date(),
          data: { unitId, violationCount: violations.length }
        });
      }

      return success(result);

    } catch (error) {
      this.log('error', `Unit integrity validation failed: ${error}`);
      return failure(error instanceof Error ? error : new Error('Unit integrity validation failed'));
    }
  }

  /**
   * Subscribe to unit state events
   */
  subscribe(listener: (event: IServiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Unsubscribe from unit state events
   */
  unsubscribe(listener: (event: IServiceEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Inject dependencies (Dependency Injection)
   */
  setPersistenceStrategy(strategy: IStatePersistenceStrategy): void {
    this.persistenceStrategy = strategy;
  }

  setCriticalHitStrategy(strategy: ICriticalHitStrategy): void {
    this.criticalHitStrategy = strategy;
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Extract unit ID from unit state in a type-safe manner
   */
  private extractUnitId(unitState: ICompleteUnitState): string {
    return unitState.configuration.id || 'unknown';
  }

  /**
   * Create timestamped state for history
   */
  private createTimestampedState(unitState: ICompleteUnitState): ICompleteUnitState & { timestamp: Date } {
    return {
      ...unitState,
      timestamp: new Date()
    };
  }

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
      console.log(`[UnitStateManager] ${level.toUpperCase()}: ${message}`);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private setupAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      await this.saveAllPendingStates();
    }, this.config.autoSaveInterval);
  }

  private async saveAllPendingStates(): Promise<void> {
    const entries = Array.from(this.unitStates.entries());
    for (const [unitId, unitState] of entries) {
      try {
        await this.saveUnitState(unitState);
      } catch (error) {
        this.log('error', `Auto-save failed for unit ${unitId}: ${error}`);
      }
    }
  }

  private addToHistory(unitId: EntityId, unitState: ICompleteUnitState): void {
    if (!this.stateHistory.has(unitId)) {
      this.stateHistory.set(unitId, []);
    }

    const history = this.stateHistory.get(unitId)!;
    history.push(this.createTimestampedState(unitState));

    // Enforce history limit
    if (history.length > this.config.maxStateHistory) {
      history.splice(0, history.length - this.config.maxStateHistory);
    }
  }

  private findEquipmentAtSlot(unitState: ICompleteUnitState, location: string, slot: number): IEquipmentInstance | null {
    // This would search through the unit's equipment instances
    // For now, return a mock equipment instance
    return {
      id: `equipment_${location}_${slot}`,
      equipmentId: 'mock_equipment',
      equipment: {} as any, // Mock equipment data
      slotIndex: slot,
      quantity: 1,
      configuration: {},
      status: {
        operational: true,
        damaged: false,
        destroyed: false,
        criticalHits: 0
      },
      location
    } as IEquipmentInstance;
  }

  private applyBasicCriticalHit(equipment: IEquipmentInstance, damage: ICriticalHit, location: string): ICriticalHitResult {
    // Basic critical hit application
    const damageEffects: IDamageEffect[] = [];
    const cascadingEffects: ICascadingEffect[] = [];

    // Apply damage based on type
    switch (damage.type) {
      case 'critical':
        damageEffects.push({
          type: 'damaged',
          target: equipment.id,
          severity: damage.damage * 10,
          description: `Equipment critically damaged`,
          repairable: true,
          repairCost: damage.damage * 100
        });
        break;

      case 'ammo_explosion':
        damageEffects.push({
          type: 'destroyed',
          target: equipment.id,
          severity: 100,
          description: `Equipment destroyed by ammunition explosion`,
          repairable: false,
          repairCost: 0
        });

        cascadingEffects.push({
          type: 'ammo_explosion',
          triggerLocation: location,
          affectedLocations: [location],
          damage: damage.damage * 2,
          description: 'Ammunition explosion causes additional damage'
        });
        break;
    }

    const unitStatus = this.createMockHealthStatus();

    return {
      success: true,
      criticalHit: damage,
      damageEffects,
      cascadingEffects,
      unitStatus
    };
  }

  private async applyCascadingEffects(unitState: ICompleteUnitState, effects: ICascadingEffect[]): Promise<void> {
    for (const effect of effects) {
      this.log('warn', `Applying cascading effect: ${effect.description}`);
      // Apply cascading damage logic here
    }
  }

  private updateUnitStateFromCriticalHit(unitState: ICompleteUnitState, criticalHitResult: ICriticalHitResult): void {
    // Update the unit state based on critical hit results
    // This would modify equipment status, armor values, etc.
    this.log('debug', `Updating unit state from critical hit results`);
  }

  private repairCriticalHitInState(unitState: ICompleteUnitState, criticalHitId: EntityId): boolean {
    // Find and repair the critical hit in the unit state
    // This would restore equipment functionality, remove damage effects, etc.
    this.log('debug', `Repairing critical hit ${criticalHitId} in unit state`);
    return true; // Mock success
  }

  private calculateUnitHealth(unitState: ICompleteUnitState): IUnitHealthStatus {
    // Calculate comprehensive unit health status
    return {
      overallHealth: 85,
      structuralIntegrity: 90,
      operationalStatus: 'operational',
      criticalSystems: [
        { system: 'Engine', status: 'operational', efficiency: 100, criticalHits: 0 },
        { system: 'Gyro', status: 'operational', efficiency: 100, criticalHits: 0 },
        { system: 'Cockpit', status: 'operational', efficiency: 100, criticalHits: 0 }
      ],
      armorStatus: {
        totalArmor: 180,
        maxArmor: 200,
        armorPercent: 90,
        locationArmor: [
          { location: 'Head', currentArmor: 9, maxArmor: 9, armorPercent: 100, breached: false },
          { location: 'Center Torso', currentArmor: 45, maxArmor: 50, armorPercent: 90, breached: false }
        ]
      },
      equipmentStatus: []
    };
  }

  private isSystemDestroyed(unitState: ICompleteUnitState, system: string): boolean {
    // Check if a critical system is destroyed
    return false; // Mock - system is operational
  }

  private findImpossibleStates(unitState: ICompleteUnitState): IIntegrityViolation[] {
    // Find impossible states in the unit configuration
    return []; // Mock - no impossible states
  }

  private findCascadingFailures(unitState: ICompleteUnitState): IIntegrityViolation[] {
    // Find potential cascading failure conditions
    return []; // Mock - no cascading failures
  }

  private createMockHealthStatus(): IUnitHealthStatus {
    return {
      overallHealth: 75,
      structuralIntegrity: 80,
      operationalStatus: 'damaged',
      criticalSystems: [],
      armorStatus: {
        totalArmor: 150,
        maxArmor: 200,
        armorPercent: 75,
        locationArmor: []
      },
      equipmentStatus: []
    };
  }
}




