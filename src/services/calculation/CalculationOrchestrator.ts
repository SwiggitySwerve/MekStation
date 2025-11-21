/**
 * CalculationOrchestrator - SOLID Calculation Service
 * 
 * Extracted from multiple monolithic services:
 * - WeightBalanceService.ts (995 lines)
 * - EquipmentAllocationService.ts (1,126 lines)
 * - Various calculation methods scattered throughout
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only orchestrates calculations, doesn't perform them
 * - Open/Closed: Extensible through calculation strategy injection
 * - Liskov Substitution: All calculation strategies are substitutable
 * - Interface Segregation: Depends only on calculation interfaces it needs
 * - Dependency Inversion: Depends on abstractions, not concrete implementations
 */

import {
  ICalculationOrchestrator,
  IWeightCalculationStrategy,
  IHeatCalculationStrategy,
  IArmorCalculationStrategy,
  ICriticalSlotsCalculationStrategy,
  IMovementCalculationStrategy,
  IUnitConfiguration,
  IEquipmentAllocation,
  ICompleteCalculationResult,
  IWeightCalculationResult,
  IHeatBalanceResult,
  IArmorEfficiencyResult,
  ISlotUtilizationResult,
  IMovementPointsResult,
  ICalculationMetrics,
  IOptimizationSummary,
  IServiceEvent,
  Result,
  success,
  failure,
  EntityId
} from '../../types/core';

import { IOptimizationImprovement } from '../../types/core/CalculationInterfaces';

import { IObservableService, IService } from '../../types/core/BaseTypes';

/**
 * Calculation event types
 */
export enum CalculationEventType {
  CALCULATION_STARTED = 'calculation_started',
  CALCULATION_COMPLETED = 'calculation_completed',
  CALCULATION_FAILED = 'calculation_failed',
  STRATEGY_CHANGED = 'strategy_changed',
  OPTIMIZATION_FOUND = 'optimization_found',
  CACHE_CLEARED = 'cache_cleared'
}

/**
 * Calculation configuration
 */
export interface ICalculationConfiguration {
  readonly enableCaching: boolean;
  readonly enableParallelCalculation: boolean;
  readonly enableOptimization: boolean;
  readonly precisionDigits: number;
  readonly timeoutMs: number;
  readonly maxCacheSize: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Calculation cache entry
 */
interface CalculationCacheEntry {
  readonly result: ICompleteCalculationResult;
  readonly timestamp: Date;
  readonly configHash: string;
  readonly equipmentHash: string;
}

/**
 * Calculation performance tracker
 */
interface CalculationPerformanceTracker {
  readonly startTime: number;
  readonly strategy: string;
  readonly inputSize: number;
}

/**
 * SOLID-compliant CalculationOrchestrator implementation
 * 
 * This service orchestrates all calculations by delegating to specialized
 * calculation strategies, eliminating scattered calculation logic.
 */
export class CalculationOrchestrator implements ICalculationOrchestrator {
  public readonly serviceName = 'CalculationOrchestrator';
  public readonly version = '1.0.0';

  private listeners = new Set<(event: IServiceEvent) => void>();
  private calculationCache = new Map<string, CalculationCacheEntry>();
  private performanceTrackers = new Map<string, CalculationPerformanceTracker>();
  private config: ICalculationConfiguration;
  private metrics: ICalculationMetrics;

  // Strategy dependencies (injected)
  private weightCalculator?: IWeightCalculationStrategy;
  private heatCalculator?: IHeatCalculationStrategy;
  private armorCalculator?: IArmorCalculationStrategy;
  private slotsCalculator?: ICriticalSlotsCalculationStrategy;
  private movementCalculator?: IMovementCalculationStrategy;

  constructor(
    config: Partial<ICalculationConfiguration> = {}
  ) {
    this.config = {
      enableCaching: true,
      enableParallelCalculation: true,
      enableOptimization: true,
      precisionDigits: 2,
      timeoutMs: 30000,
      maxCacheSize: 50,
      logLevel: 'info',
      ...config
    };

    this.metrics = {
      totalCalculationTime: 0,
      strategyMetrics: [],
      cacheHitRate: 0,
      memoryUsage: 0,
      bottlenecks: []
    };
  }

  /**
   * Initialize the calculation orchestrator
   */
  async initialize(): Promise<void> {
    this.log('info', 'Initializing CalculationOrchestrator...');
    
    // Initialize metrics
    this.resetMetrics();
    
    // Clear any existing cache
    this.clearCache();
    
    this.emitEvent({
      type: CalculationEventType.CALCULATION_STARTED,
      timestamp: new Date(),
      data: { service: this.serviceName }
    });

    this.log('info', 'CalculationOrchestrator initialized successfully');
  }

  /**
   * Cleanup the calculation orchestrator
   */
  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up CalculationOrchestrator...');
    
    this.clearCache();
    this.performanceTrackers.clear();
    this.listeners.clear();
    
    this.log('info', 'CalculationOrchestrator cleanup complete');
  }

  /**
   * Calculate all unit metrics (weight, heat, armor, etc.)
   */
  async calculateAll(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<ICompleteCalculationResult>> {
    const startTime = Date.now();
    
    try {
      this.log('debug', `Starting unit calculations for ${config.chassisName} ${config.model}`);

      // Check cache first
      const cacheKey = this.generateCacheKey(config, equipment);
      if (this.config.enableCaching) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.log('debug', 'Returning cached calculation result');
          return success(cached);
        }
      }

      // Perform all calculations in parallel if enabled
      const calculationPromises = this.config.enableParallelCalculation
        ? this.calculateParallel(config, equipment)
        : this.calculateSequential(config, equipment);

      const [
        weightResult,
        heatResult,
        armorResult,
        slotsResult,
        movementResult
      ] = await calculationPromises;

      // Check if any calculation failed
      if (!weightResult.success) {
        return failure(new Error(`Weight calculation failed: ${weightResult.error.message}`));
      }
      if (!heatResult.success) {
        return failure(new Error(`Heat calculation failed: ${heatResult.error.message}`));
      }
      if (!armorResult.success) {
        return failure(new Error(`Armor calculation failed: ${armorResult.error.message}`));
      }
      if (!slotsResult.success) {
        return failure(new Error(`Critical slots calculation failed: ${slotsResult.error.message}`));
      }
      if (!movementResult.success) {
        return failure(new Error(`Movement calculation failed: ${movementResult.error.message}`));
      }

      // Combine results
      const completeResult: ICompleteCalculationResult = {
        weight: weightResult.data,
        heat: heatResult.data,
        armor: armorResult.data,
        slots: slotsResult.data,
        movement: movementResult.data,
        optimization: this.config.enableOptimization
          ? this.calculateOptimizationSummary(weightResult.data, heatResult.data, armorResult.data, slotsResult.data, movementResult.data)
          : this.getEmptyOptimizationSummary(),
        performance: this.updateMetrics(Date.now() - startTime)
      };

      // Cache the result
      if (this.config.enableCaching) {
        this.addToCache(cacheKey, completeResult, config, equipment);
      }

      this.emitEvent({
        type: CalculationEventType.CALCULATION_COMPLETED,
        timestamp: new Date(),
        data: { 
          unitName: `${config.chassisName} ${config.model}`,
          calculationTime: Date.now() - startTime,
          overallScore: completeResult.optimization.overallScore
        }
      });

      return success(completeResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
      this.log('error', `Unit calculation failed: ${errorMessage}`);
      
      this.emitEvent({
        type: CalculationEventType.CALCULATION_FAILED,
        timestamp: new Date(),
        data: { error: errorMessage }
      });

      return failure(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  /**
   * Calculate weight distribution and balance
   */
  async calculateWeight(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IWeightCalculationResult>> {
    const trackerId = this.startPerformanceTracking('weight', equipment.length);
    
    try {
      this.log('debug', 'Calculating weight distribution...');

      if (this.weightCalculator) {
        const result = await this.weightCalculator.calculateTotalWeight(config, equipment);
        this.endPerformanceTracking(trackerId);
        return success(result);
      }

      // Fallback: basic weight calculation
      const basicResult = this.createBasicWeightResult(config, equipment);
      this.endPerformanceTracking(trackerId);
      return success(basicResult);

    } catch (error) {
      this.endPerformanceTracking(trackerId);
      return failure(error instanceof Error ? error : new Error('Weight calculation failed'));
    }
  }

  /**
   * Calculate heat generation and dissipation
   */
  async calculateHeat(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IHeatBalanceResult>> {
    const trackerId = this.startPerformanceTracking('heat', equipment.length);
    
    try {
      this.log('debug', 'Calculating heat balance...');

      if (this.heatCalculator) {
        const result = await this.heatCalculator.calculateHeatBalance(config, equipment);
        this.endPerformanceTracking(trackerId);
        return success(result);
      }

      // Fallback: basic heat calculation
      const basicResult = this.createBasicHeatResult(config, equipment);
      this.endPerformanceTracking(trackerId);
      return success(basicResult);

    } catch (error) {
      this.endPerformanceTracking(trackerId);
      return failure(error instanceof Error ? error : new Error('Heat calculation failed'));
    }
  }

  /**
   * Calculate armor distribution and efficiency
   */
  async calculateArmor(
    config: IUnitConfiguration
  ): Promise<Result<IArmorEfficiencyResult>> {
    const trackerId = this.startPerformanceTracking('armor', 1);
    
    try {
      this.log('debug', 'Calculating armor distribution...');

      if (this.armorCalculator) {
        const result = await this.armorCalculator.calculateArmorEfficiency(config);
        this.endPerformanceTracking(trackerId);
        return success(result);
      }

      // Fallback: basic armor calculation
      const basicResult = this.createBasicArmorResult(config);
      this.endPerformanceTracking(trackerId);
      return success(basicResult);

    } catch (error) {
      this.endPerformanceTracking(trackerId);
      return failure(error instanceof Error ? error : new Error('Armor calculation failed'));
    }
  }

  /**
   * Calculate critical slot usage
   */
  async calculateSlots(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<ISlotUtilizationResult>> {
    const trackerId = this.startPerformanceTracking('criticalSlots', equipment.length);
    
    try {
      this.log('debug', 'Calculating critical slot usage...');

      if (this.slotsCalculator) {
        const requirements = await this.slotsCalculator.calculateSlotRequirements(config, equipment);
        const availability = await this.slotsCalculator.calculateSlotAvailability(config);
        const result = await this.slotsCalculator.calculateSlotUtilization(requirements, availability);
        this.endPerformanceTracking(trackerId);
        return success(result);
      }

      // Fallback: basic slots calculation
      const basicResult = this.createBasicSlotsResult(config, equipment);
      this.endPerformanceTracking(trackerId);
      return success(basicResult);

    } catch (error) {
      this.endPerformanceTracking(trackerId);
      return failure(error instanceof Error ? error : new Error('Critical slots calculation failed'));
    }
  }

  /**
   * Calculate movement points and profiles
   */
  async calculateMovement(
    config: IUnitConfiguration
  ): Promise<Result<IMovementPointsResult>> {
    const trackerId = this.startPerformanceTracking('movement', 1);
    
    try {
      this.log('debug', 'Calculating movement profile...');

      if (this.movementCalculator) {
        const result = await this.movementCalculator.calculateMovementPoints(
          config.engineRating || 0,
          config.tonnage
        );
        this.endPerformanceTracking(trackerId);
        return success(result);
      }

      // Fallback: basic movement calculation
      const basicResult = this.createBasicMovementResult(config);
      this.endPerformanceTracking(trackerId);
      return success(basicResult);

    } catch (error) {
      this.endPerformanceTracking(trackerId);
      return failure(error instanceof Error ? error : new Error('Movement calculation failed'));
    }
  }

  /**
   * Get available calculation strategies
   */
  getCalculationStrategies(): Record<string, string[]> {
    const strategies: Record<string, string[]> = {};
    
    if (this.weightCalculator) strategies.weight = ['WeightCalculation'];
    if (this.heatCalculator) strategies.heat = ['HeatCalculation'];
    if (this.armorCalculator) strategies.armor = ['ArmorCalculation'];
    if (this.slotsCalculator) strategies.slots = ['CriticalSlotsCalculation'];
    if (this.movementCalculator) strategies.movement = ['MovementCalculation'];

    return strategies;
  }

  /**
   * Set calculation strategy (for strategy pattern implementation)
   */
  setCalculationStrategy(category: string, strategyName: string): void {
    this.log('info', `Setting calculation strategy: ${category} -> ${strategyName}`);
    
    this.emitEvent({
      type: CalculationEventType.STRATEGY_CHANGED,
      timestamp: new Date(),
      data: { category, strategy: strategyName }
    });
  }

  /**
   * Get calculation performance metrics
   */
  getCalculationMetrics(): ICalculationMetrics {
    return { ...this.metrics };
  }

  /**
   * Subscribe to calculation events
   */
  subscribe(listener: (event: IServiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Unsubscribe from calculation events
   */
  unsubscribe(listener: (event: IServiceEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Inject calculation strategies (Dependency Injection)
   */
  setWeightCalculator(calculator: IWeightCalculationStrategy): void {
    this.weightCalculator = calculator;
  }

  setHeatCalculator(calculator: IHeatCalculationStrategy): void {
    this.heatCalculator = calculator;
  }

  setArmorCalculator(calculator: IArmorCalculationStrategy): void {
    this.armorCalculator = calculator;
  }

  setSlotsCalculator(calculator: ICriticalSlotsCalculationStrategy): void {
    this.slotsCalculator = calculator;
  }

  setMovementCalculator(calculator: IMovementCalculationStrategy): void {
    this.movementCalculator = calculator;
  }

  /**
   * Clear calculation cache
   */
  clearCache(): void {
    this.calculationCache.clear();
    this.emitEvent({
      type: CalculationEventType.CACHE_CLEARED,
      timestamp: new Date(),
      data: {}
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Perform calculations in parallel
   */
  private async calculateParallel(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<[
    Result<IWeightCalculationResult>,
    Result<IHeatBalanceResult>,
    Result<IArmorEfficiencyResult>,
    Result<ISlotUtilizationResult>,
    Result<IMovementPointsResult>
  ]> {
          return Promise.all([
        this.calculateWeight(config, equipment),
        this.calculateHeat(config, equipment),
        this.calculateArmor(config),
        this.calculateSlots(config, equipment),
        this.calculateMovement(config)
      ]);
  }

  /**
   * Perform calculations sequentially
   */
  private async calculateSequential(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<[
    Result<IWeightCalculationResult>,
    Result<IHeatBalanceResult>,
    Result<IArmorEfficiencyResult>,
    Result<ISlotUtilizationResult>,
    Result<IMovementPointsResult>
  ]> {
    const weightResult = await this.calculateWeight(config, equipment);
    const heatResult = await this.calculateHeat(config, equipment);
    const armorResult = await this.calculateArmor(config);
    const slotsResult = await this.calculateSlots(config, equipment);
    const movementResult = await this.calculateMovement(config);

    return [weightResult, heatResult, armorResult, slotsResult, movementResult];
  }

  /**
   * Calculate overall unit score
   */
  private calculateOverallScore(
    weight: IWeightCalculationResult,
    heat: IHeatBalanceResult,
    armor: IArmorEfficiencyResult,
    slots: ISlotUtilizationResult,
    movement: IMovementPointsResult
  ): number {
    const weightScore = weight.optimization?.currentEfficiency || 0;
    const heatScore = heat.heatBalance >= 0 ? 100 : Math.max(0, 100 + heat.heatBalance * 10);
    const armorScore = armor.overallEfficiency || 0;
    const slotsScore = (100 - slots.overallUtilization) || 0;
    const movementScore = movement.efficiency?.overallRating === 'excellent' ? 100 : 75;

    return Math.round(
      (weightScore + heatScore + armorScore + slotsScore + movementScore) / 5
    );
  }

  /**
   * Calculate optimization suggestions
   */
  private calculateOptimizations(
    weight: IWeightCalculationResult,
    heat: IHeatBalanceResult,
    armor: IArmorEfficiencyResult,
    slots: ISlotUtilizationResult,
    movement: IMovementPointsResult
  ): any[] {
    const optimizations: any[] = [];

    // Weight optimizations
    const weightEfficiency = weight.optimization?.currentEfficiency || 0;
    if (weightEfficiency < 80) {
      optimizations.push({
        type: 'weight',
        priority: 'high',
        description: 'Consider lighter equipment variants',
        potentialImprovement: 85 - weightEfficiency
      });
    }

    // Heat optimizations
    const heatEfficiency = heat.heatBalance >= 0 ? 100 : Math.max(0, 100 + heat.heatBalance * 10);
    if (heatEfficiency < 75) {
      optimizations.push({
        type: 'heat',
        priority: 'high',
        description: 'Add more heat sinks or reduce heat generation',
        potentialImprovement: 80 - heatEfficiency
      });
    }

    // Armor optimizations
    const armorEfficiency = armor.overallEfficiency || 0;
    if (armorEfficiency < 90) {
      optimizations.push({
        type: 'armor',
        priority: 'medium',
        description: 'Consider advanced armor types',
        potentialImprovement: 95 - armorEfficiency
      });
    }

    // Slot optimizations
    const slotUtilization = slots.overallUtilization || 0;
    if (slotUtilization > 85) {
      optimizations.push({
        type: 'slots',
        priority: 'medium',
        description: 'Critical slot usage is high - consider consolidation',
        potentialImprovement: slotUtilization - 80
      });
    }

    return optimizations;
  }

  /**
   * Calculate complete optimization summary
   */
  private calculateOptimizationSummary(
    weight: IWeightCalculationResult,
    heat: IHeatBalanceResult,
    armor: IArmorEfficiencyResult,
    slots: ISlotUtilizationResult,
    movement: IMovementPointsResult
  ): IOptimizationSummary {
    const overallScore = this.calculateOverallScore(weight, heat, armor, slots, movement);
    const optimizations = this.calculateOptimizations(weight, heat, armor, slots, movement);
    
    // Calculate individual optimization scores
    const weightEfficiency = weight.optimization?.currentEfficiency || 0;
    const heatScore = heat.heatBalance >= 0 ? 100 : Math.max(0, 100 + heat.heatBalance * 10);
    const armorEfficiency = armor.overallEfficiency || 0;
    const slotUtilization = slots.overallUtilization || 0;
    const movementEfficiency = movement.walkMP > 0 ? 100 : 0;
    
    // Convert optimizations to IOptimizationImprovement format
    const topImprovements: IOptimizationImprovement[] = optimizations.slice(0, 5).map((opt: any) => ({
      category: opt.type as 'weight' | 'heat' | 'armor' | 'slots' | 'movement',
      description: opt.description,
      impact: opt.potentialImprovement || 0,
      difficulty: this.determineDifficulty(opt.potentialImprovement || 0),
      priority: opt.priority as 'high' | 'medium' | 'low'
    }));
    
    return {
      overallScore,
      weightOptimization: weightEfficiency,
      heatOptimization: heatScore,
      armorOptimization: armorEfficiency,
      slotOptimization: 100 - slotUtilization,
      movementOptimization: movementEfficiency,
      topImprovements
    };
  }

  /**
   * Get empty optimization summary when optimization is disabled
   */
  private getEmptyOptimizationSummary(): IOptimizationSummary {
    return {
      overallScore: 0,
      weightOptimization: 0,
      heatOptimization: 0,
      armorOptimization: 0,
      slotOptimization: 0,
      movementOptimization: 0,
      topImprovements: []
    };
  }

  /**
   * Determine difficulty level based on improvement magnitude
   */
  private determineDifficulty(improvement: number): 'easy' | 'moderate' | 'hard' {
    if (improvement < 10) return 'easy';
    if (improvement < 25) return 'moderate';
    return 'hard';
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
      console.log(`[CalculationOrchestrator] ${level.toUpperCase()}: ${message}`);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private startPerformanceTracking(strategy: string, inputSize: number): string {
    const trackerId = `${strategy}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.performanceTrackers.set(trackerId, {
      startTime: Date.now(),
      strategy,
      inputSize
    });
    return trackerId;
  }

  private endPerformanceTracking(trackerId: string): void {
    const tracker = this.performanceTrackers.get(trackerId);
    if (tracker) {
      const duration = Date.now() - tracker.startTime;
      this.log('debug', `${tracker.strategy} calculation completed in ${duration}ms`);
      this.performanceTrackers.delete(trackerId);
    }
  }

  private generateCacheKey(config: IUnitConfiguration, equipment: IEquipmentAllocation[]): string {
    const configString = JSON.stringify({
      id: config.id,
      tonnage: config.tonnage,
      engineRating: config.engineRating,
      techBase: config.techBase,
      armorType: config.armorType,
      structureType: config.structureType
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

  private getFromCache(key: string): ICompleteCalculationResult | null {
    const entry = this.calculationCache.get(key);
    if (!entry) return null;

    // Check if cache entry is still valid (not older than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (entry.timestamp < tenMinutesAgo) {
      this.calculationCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private addToCache(
    key: string, 
    result: ICompleteCalculationResult, 
    config: IUnitConfiguration, 
    equipment: IEquipmentAllocation[]
  ): void {
    // Enforce cache size limit
    if (this.calculationCache.size >= this.config.maxCacheSize) {
      const entries = Array.from(this.calculationCache.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      const toRemove = entries.slice(0, Math.floor(this.config.maxCacheSize * 0.2));
      toRemove.forEach(([k]) => this.calculationCache.delete(k));
    }

    const entry: CalculationCacheEntry = {
      result,
      timestamp: new Date(),
      configHash: this.hashString(JSON.stringify(config)),
      equipmentHash: this.hashString(JSON.stringify(equipment))
    };

    this.calculationCache.set(key, entry);
  }

  private updateMetrics(calculationTime: number): ICalculationMetrics {
    // Create new metrics object (since properties are readonly)
    this.metrics = {
      totalCalculationTime: this.metrics.totalCalculationTime + calculationTime,
      strategyMetrics: [...this.metrics.strategyMetrics],
      cacheHitRate: this.calculateCacheHitRate(),
      memoryUsage: this.metrics.memoryUsage,
      bottlenecks: [...this.metrics.bottlenecks]
    };

    return this.metrics;
  }

  private calculateCacheHitRate(): number {
    // Simple estimate for now - in real implementation would track actual hits
    return Math.min(0.8, this.calculationCache.size / this.config.maxCacheSize);
  }

  private resetMetrics(): void {
    this.metrics = {
      totalCalculationTime: 0,
      strategyMetrics: [],
      cacheHitRate: 0,
      memoryUsage: 0,
      bottlenecks: []
    };
  }

  // Basic calculation fallbacks
  private createBasicWeightResult(config: IUnitConfiguration, equipment: IEquipmentAllocation[]): IWeightCalculationResult {
    const chassisWeight = config.tonnage * 0.1; // 10% for chassis
    const engineWeight = config.engineRating * 0.05; // Rough engine weight
    const equipmentWeight = equipment.reduce((sum, eq) => sum + (eq.quantity || 1), 0) * 0.5; // Rough equipment weight
    const totalWeight = chassisWeight + engineWeight + equipmentWeight;
    
    return {
      calculated: totalWeight,
      isWithinTolerance: totalWeight <= config.tonnage,
      calculationMethod: 'basic',
      timestamp: new Date(),
      totalWeight: totalWeight,
      maxTonnage: config.tonnage,
      remainingTonnage: config.tonnage - totalWeight,
      percentageUsed: (totalWeight / config.tonnage) * 100,
      isOverweight: totalWeight > config.tonnage,
      componentBreakdown: {
        structure: { weight: chassisWeight, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        armor: { weight: 0, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        engine: { weight: engineWeight, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        gyro: { weight: 0, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        cockpit: { weight: 0, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        heatSinks: { weight: 0, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        jumpJets: { weight: 0, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        equipment: { weight: equipmentWeight, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } },
        ammunition: { weight: 0, type: 'Standard', techBase: config.techBase, efficiency: 100, optimization: { canOptimize: false, potentialSavings: 0, alternativeOptions: [], recommendations: [] } }
      },
      locationBreakdown: {
        head: 0,
        centerTorso: totalWeight * 0.3,
        leftTorso: totalWeight * 0.15,
        rightTorso: totalWeight * 0.15,
        leftArm: totalWeight * 0.1,
        rightArm: totalWeight * 0.1,
        leftLeg: totalWeight * 0.1,
        rightLeg: totalWeight * 0.1,
        balance: {
          frontToRear: 0,
          leftToRight: 0,
          topToBottom: 0,
          stability: 'good',
          recommendations: []
        }
      },
      optimization: {
        currentEfficiency: 85,
        maxEfficiency: 95,
        improvements: [],
        alternativeConfigurations: []
      }
    };
  }

  private createBasicHeatResult(config: IUnitConfiguration, equipment: IEquipmentAllocation[]): IHeatBalanceResult {
    const engineHeatSinks = Math.floor(config.engineRating / 25);
    const heatGeneration = equipment.length * 2; // Rough heat generation
    
    const heatDissipation = engineHeatSinks * 1;
    const heatBalance = heatDissipation - heatGeneration;
    
    return {
      calculated: heatBalance,
      isWithinTolerance: heatBalance >= 0,
      calculationMethod: 'basic',
      timestamp: new Date(),
      heatGeneration,
      heatDissipation,
      heatBalance,
      scenarios: [
        {
          name: 'Continuous Fire',
          description: 'All weapons firing continuously',
          heatGeneration,
          heatDissipation,
          balance: heatBalance,
          sustainability: heatBalance >= 0 ? 'indefinite' : 'unsustainable' as 'indefinite' | 'limited' | 'unsustainable',
          turnsToOverheat: heatBalance >= 0 ? Infinity : Math.ceil(30 / Math.abs(heatBalance))
        }
      ],
      recommendations: heatBalance < 0 ? [{
        type: 'heat_sinks' as 'heat_sinks' | 'weapons' | 'movement' | 'tactics',
        description: 'Add more heat sinks to balance heat generation',
        heatImprovement: Math.abs(heatBalance),
        difficulty: 'easy' as 'easy' | 'moderate' | 'hard',
        priority: 'high' as 'high' | 'medium' | 'low',
        cost: 'Low'
      }] : []
    };
  }

  private createBasicArmorResult(config: IUnitConfiguration): IArmorEfficiencyResult {
    const maxArmor = config.tonnage * 3.2; // Rough max armor calculation
    const currentArmor = maxArmor * 0.8; // Assume 80% of max armor
    
    return {
      calculated: currentArmor,
      isWithinTolerance: true,
      calculationMethod: 'basic',
      timestamp: new Date(),
      overallEfficiency: (currentArmor / maxArmor) * 100,
      pointsPerTon: 16, // Standard armor
      coverage: {
        totalCoverage: (currentArmor / maxArmor) * 100,
        locationCoverage: [
          { location: 'Head', coverage: Math.floor(currentArmor * 0.05), maxCoverage: Math.floor(maxArmor * 0.05), utilizationPercent: 80, priority: 'critical' },
          { location: 'Center Torso', coverage: Math.floor(currentArmor * 0.25), maxCoverage: Math.floor(maxArmor * 0.25), utilizationPercent: 80, priority: 'critical' },
          { location: 'Left Torso', coverage: Math.floor(currentArmor * 0.15), maxCoverage: Math.floor(maxArmor * 0.15), utilizationPercent: 80, priority: 'important' },
          { location: 'Right Torso', coverage: Math.floor(currentArmor * 0.15), maxCoverage: Math.floor(maxArmor * 0.15), utilizationPercent: 80, priority: 'important' },
          { location: 'Left Arm', coverage: Math.floor(currentArmor * 0.1), maxCoverage: Math.floor(maxArmor * 0.1), utilizationPercent: 80, priority: 'standard' },
          { location: 'Right Arm', coverage: Math.floor(currentArmor * 0.1), maxCoverage: Math.floor(maxArmor * 0.1), utilizationPercent: 80, priority: 'standard' },
          { location: 'Left Leg', coverage: Math.floor(currentArmor * 0.1), maxCoverage: Math.floor(maxArmor * 0.1), utilizationPercent: 80, priority: 'standard' },
          { location: 'Right Leg', coverage: Math.floor(currentArmor * 0.1), maxCoverage: Math.floor(maxArmor * 0.1), utilizationPercent: 80, priority: 'standard' }
        ],
        vulnerabilities: [],
        recommendations: ['Consider maximizing armor for better protection']
      },
      distribution: {
        balance: 'balanced',
        frontToRearRatio: 1.0,
        centerToLimbRatio: 1.5,
        efficiency: 85,
        recommendations: ['Armor distribution is balanced']
      },
      optimization: {
        currentTotal: currentArmor,
        maxPossible: maxArmor,
        utilizationPercent: (currentArmor / maxArmor) * 100,
        improvements: [],
        alternativeDistributions: []
      }
    };
  }

  private createBasicSlotsResult(config: IUnitConfiguration, equipment: IEquipmentAllocation[]): ISlotUtilizationResult {
    const totalSlots = 78; // Standard 'Mech has 78 critical slots
    const usedSlots = equipment.reduce((sum, eq) => sum + (eq.quantity || 1), 0);
    
    return {
      calculated: usedSlots,
      isWithinTolerance: usedSlots <= totalSlots,
      calculationMethod: 'basic',
      timestamp: new Date(),
      overallUtilization: (usedSlots / totalSlots) * 100,
      locationUtilization: [
        { 
          location: 'Head', 
          available: 6,
          used: Math.floor(usedSlots * 0.05), 
          utilization: (Math.floor(usedSlots * 0.05) / 6) * 100,
          efficiency: 85,
          waste: Math.max(0, 6 - Math.floor(usedSlots * 0.05)),
          overflow: Math.floor(usedSlots * 0.05) > 6
        },
        { 
          location: 'CenterTorso', 
          available: 12,
          used: Math.floor(usedSlots * 0.25), 
          utilization: (Math.floor(usedSlots * 0.25) / 12) * 100,
          efficiency: 85,
          waste: Math.max(0, 12 - Math.floor(usedSlots * 0.25)),
          overflow: Math.floor(usedSlots * 0.25) > 12
        },
        { 
          location: 'LeftTorso', 
          available: 12,
          used: Math.floor(usedSlots * 0.15), 
          utilization: (Math.floor(usedSlots * 0.15) / 12) * 100,
          efficiency: 85,
          waste: Math.max(0, 12 - Math.floor(usedSlots * 0.15)),
          overflow: Math.floor(usedSlots * 0.15) > 12
        },
        { 
          location: 'RightTorso', 
          available: 12,
          used: Math.floor(usedSlots * 0.15), 
          utilization: (Math.floor(usedSlots * 0.15) / 12) * 100,
          efficiency: 85,
          waste: Math.max(0, 12 - Math.floor(usedSlots * 0.15)),
          overflow: Math.floor(usedSlots * 0.15) > 12
        },
        { 
          location: 'LeftArm', 
          available: 12,
          used: Math.floor(usedSlots * 0.1), 
          utilization: (Math.floor(usedSlots * 0.1) / 12) * 100,
          efficiency: 85,
          waste: Math.max(0, 12 - Math.floor(usedSlots * 0.1)),
          overflow: Math.floor(usedSlots * 0.1) > 12
        },
        { 
          location: 'RightArm', 
          available: 12,
          used: Math.floor(usedSlots * 0.1), 
          utilization: (Math.floor(usedSlots * 0.1) / 12) * 100,
          efficiency: 85,
          waste: Math.max(0, 12 - Math.floor(usedSlots * 0.1)),
          overflow: Math.floor(usedSlots * 0.1) > 12
        },
        { 
          location: 'LeftLeg', 
          available: 6,
          used: Math.floor(usedSlots * 0.1), 
          utilization: (Math.floor(usedSlots * 0.1) / 6) * 100,
          efficiency: 85,
          waste: Math.max(0, 6 - Math.floor(usedSlots * 0.1)),
          overflow: Math.floor(usedSlots * 0.1) > 6
        },
        { 
          location: 'RightLeg', 
          available: 6,
          used: Math.floor(usedSlots * 0.1), 
          utilization: (Math.floor(usedSlots * 0.1) / 6) * 100,
          efficiency: 85,
          waste: Math.max(0, 6 - Math.floor(usedSlots * 0.1)),
          overflow: Math.floor(usedSlots * 0.1) > 6
        }
      ],
      efficiency: {
        overallEfficiency: Math.max(0, 100 - (usedSlots / totalSlots) * 100),
        utilizationEfficiency: (usedSlots / totalSlots) * 100,
        distributionEfficiency: 85,
        wastage: Math.max(0, totalSlots - usedSlots),
        improvements: []
      },
      optimization: {
        currentEfficiency: 80,
        maxPossibleEfficiency: 90,
        improvementPotential: 10,
        optimizations: [],
        alternativeLayouts: []
      }
    };
  }

  private createBasicMovementResult(config: IUnitConfiguration): IMovementPointsResult {
    const walkMP = Math.floor(config.engineRating / config.tonnage);
    const runMP = Math.floor(walkMP * 1.5);
    
    return {
      calculated: walkMP,
      isWithinTolerance: walkMP > 0,
      calculationMethod: 'basic',
      timestamp: new Date(),
      walkMP: walkMP,
      runMP: runMP,
      jumpMP: 0,
      sprintMP: Math.floor(runMP * 1.5),
      engineRating: config.engineRating,
      tonnage: config.tonnage,
      efficiency: {
        walkRatio: walkMP / config.tonnage,
        runRatio: runMP / config.tonnage,
        jumpRatio: 0,
        overallRating: walkMP <= 2 ? 'poor' : walkMP <= 4 ? 'average' : 'good',
        comparison: [
          {
            weightClass: 'Medium',
            averageWalk: 4,
            averageRun: 6,
            ranking: walkMP >= 4 ? 'above_average' : 'below_average'
          }
        ]
      }
    };
  }
}




