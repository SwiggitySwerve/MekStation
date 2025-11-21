/**
 * StandardHeatCalculationStrategy - Concrete Heat Calculation Strategy
 * 
 * This service implements the IHeatCalculationStrategy interface,
 * demonstrating how to extract heat calculation logic from monolithic
 * services into focused, testable strategy implementations.
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles heat generation and dissipation calculations
 * - Open/Closed: Can be extended without modifying existing code
 * - Liskov Substitution: Can replace any IHeatCalculationStrategy
 * - Interface Segregation: Implements only heat calculation methods
 * - Dependency Inversion: Depends on abstractions, not concrete classes
 */

import {
  IHeatCalculationStrategy,
  IUnitConfiguration,
  IEquipmentAllocation,
  IHeatBalanceResult,
  IHeatGenerationResult,
  IHeatDissipationResult,
  ICalculationContext,
  TechBase,
  Result,
  success,
  failure
} from '../../../types/core';

/**
 * Heat calculation configuration
 */
export interface IHeatCalculationConfig {
  readonly includeMovementHeat: boolean;
  readonly includeEnvironmentalFactors: boolean;
  readonly enableOptimization: boolean;
  readonly precision: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Standard BattleTech heat generation and dissipation tables
 */
export class HeatTables {
  // Heat sink dissipation rates by type
  static readonly HEAT_SINK_DISSIPATION = new Map<string, number>([
    ['Single', 1.0],         // 1 heat point per turn
    ['Double', 2.0],         // 2 heat points per turn
    ['Compact', 0.67],       // 2/3 heat point per turn
    ['Laser', 1.0],          // 1 heat point, specialized for energy weapons
    ['Freezer', 2.0]         // 2 heat points, but rare/expensive
  ]);

  // Engine heat sink capacity (free heat sinks based on engine rating)
  static readonly ENGINE_HEAT_SINKS = new Map<number, number>([
    [10, 1], [15, 1], [20, 2], [25, 2], [30, 3], [35, 3], [40, 4], [45, 4], [50, 5],
    [55, 5], [60, 6], [65, 6], [70, 7], [75, 7], [80, 8], [85, 8], [90, 9], [95, 9], [100, 10],
    [105, 10], [110, 11], [115, 11], [120, 12], [125, 12], [130, 13], [135, 13], [140, 14], [145, 14], [150, 15],
    [155, 15], [160, 16], [165, 16], [170, 17], [175, 17], [180, 18], [185, 18], [190, 19], [195, 19], [200, 20],
    [210, 21], [220, 22], [230, 23], [240, 24], [250, 25], [260, 26], [270, 27], [280, 28], [290, 29], [300, 30],
    [310, 31], [320, 32], [330, 33], [340, 34], [350, 35], [360, 36], [370, 37], [380, 38], [390, 39], [400, 40]
  ]);

  // Movement heat generation
  static readonly MOVEMENT_HEAT = new Map<string, number>([
    ['walking', 1],          // 1 heat for walking
    ['running', 2],          // 2 heat for running
    ['jumping', 1],          // 1 heat per jump jet used
    ['sprinting', 3]         // 3 heat for sprinting (optional rule)
  ]);

  // Environmental heat modifiers
  static readonly ENVIRONMENTAL_HEAT = new Map<string, number>([
    ['vacuum', -1],          // -1 heat in vacuum
    ['temperate', 0],        // 0 heat modifier for normal conditions
    ['hot', 2],              // +2 heat in hot environments
    ['extreme_heat', 5],     // +5 heat in extreme heat
    ['arctic', -2],          // -2 heat in arctic conditions
    ['underwater', -4]       // -4 heat underwater
  ]);

  // Weapon heat generation (sample - real implementation would have full database)
  static readonly WEAPON_HEAT = new Map<string, number>([
    // Energy Weapons
    ['Small Laser', 1],
    ['Medium Laser', 3],
    ['Large Laser', 8],
    ['PPC', 10],
    ['ER Large Laser', 12],
    ['ER PPC', 15],
    
    // Ballistic Weapons (generally no heat)
    ['AC/2', 1],
    ['AC/5', 1],
    ['AC/10', 3],
    ['AC/20', 7],
    ['Gauss Rifle', 1],
    
    // Missile Weapons
    ['SRM 2', 2],
    ['SRM 4', 3],
    ['SRM 6', 4],
    ['LRM 5', 2],
    ['LRM 10', 4],
    ['LRM 15', 5],
    ['LRM 20', 6]
  ]);
}

/**
 * Heat calculation scenarios for analysis
 */
export interface IHeatScenario {
  readonly name: string;
  readonly description: string;
  readonly weaponsFired: string[];
  readonly movementType: string;
  readonly environment: string;
  readonly duration: number; // turns
}

/**
 * Standard heat calculation strategy implementation
 */
export class StandardHeatCalculationStrategy implements IHeatCalculationStrategy {
  public readonly strategyName = 'StandardHeatCalculation';
  public readonly version = '1.0.0';
  public readonly category = 'heat';
  public readonly description = 'Standard BattleTech heat calculation strategy using official rules';

  private config: IHeatCalculationConfig;

  constructor(config: Partial<IHeatCalculationConfig> = {}) {
    this.config = {
      includeMovementHeat: true,
      includeEnvironmentalFactors: false,
      enableOptimization: true,
      precision: 1,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * Generic calculation method for strategy interface
   */
  async calculate(context: ICalculationContext): Promise<any> {
    const calculationData = this.extractCalculationData(context);
    return this.calculateHeatBalance(calculationData.config, calculationData.equipment);
  }

  /**
   * Type-safe extraction of calculation data from context
   */
  private extractCalculationData(context: ICalculationContext): {
    config: IUnitConfiguration;
    equipment: IEquipmentAllocation[];
  } {
    const contextWithData = context as {
      config?: IUnitConfiguration;
      equipment?: IEquipmentAllocation[];
    };

    return {
      config: contextWithData.config || (context as unknown as IUnitConfiguration),
      equipment: contextWithData.equipment || []
    };
  }

  /**
   * Type-safe accessor for equipment name
   */
  private static getEquipmentName(item: IEquipmentAllocation): string {
    const equipmentWithName = item as { equipmentName?: string };
    return equipmentWithName.equipmentName || item.equipmentId;
  }

  /**
   * Type-safe accessor for heat sink configuration
   */
  private static getHeatSinkData(config: IUnitConfiguration): {
    heatSinkType: string;
    externalHeatSinks: number;
  } {
    const configWithHeatSinks = config as {
      heatSinkType?: string;
      externalHeatSinks?: number;
    };

    return {
      heatSinkType: configWithHeatSinks.heatSinkType || 'Single',
      externalHeatSinks: configWithHeatSinks.externalHeatSinks || 0
    };
  }

  /**
   * Calculate heat generation from equipment
   */
  async calculateHeatGeneration(
    equipment: IEquipmentAllocation[]
  ): Promise<IHeatGenerationResult> {
    try {
      this.log('debug', 'Calculating heat generation from equipment');

      let totalHeatGeneration = 0;
      const weaponHeat: any[] = [];
      const movementHeat = this.config.includeMovementHeat ? this.calculateMovementHeat() : {
        walkingHeat: 0,
        runningHeat: 0,
        jumpingHeat: 0,
        sprintingHeat: 0,
        movementType: 'walk' as const
      };

      // Calculate weapon heat
      for (const item of equipment) {
        const equipmentName = StandardHeatCalculationStrategy.getEquipmentName(item);
        const quantity = item.quantity || 1;
        
        if (this.isWeapon(equipmentName)) {
          const heatPerShot = this.getWeaponHeat(equipmentName);
          const shotsPerTurn = this.getWeaponRateOfFire(equipmentName);
          const weaponTotalHeat = heatPerShot * shotsPerTurn * quantity;
          
          totalHeatGeneration += weaponTotalHeat;
          
          weaponHeat.push({
            weaponName: equipmentName,
            weaponType: this.getWeaponType(equipmentName),
            heatPerShot,
            shotsPerTurn,
            totalHeat: weaponTotalHeat,
            location: item.location,
            modifiers: this.getWeaponHeatModifiers(equipmentName)
          });
        }
      }

      // Add movement heat if enabled
      if (this.config.includeMovementHeat) {
        totalHeatGeneration += movementHeat.runningHeat; // Assume running by default
      }

      // Environmental heat (if enabled)
      const environmentalHeat = this.config.includeEnvironmentalFactors 
        ? this.calculateEnvironmentalHeat()
        : 0;

      totalHeatGeneration += environmentalHeat;

      // Generate heat profile analysis
      const heatProfile = this.generateHeatProfile(weaponHeat, movementHeat);

      const result: IHeatGenerationResult = {
        calculated: totalHeatGeneration,
        isWithinTolerance: true,
        calculationMethod: this.strategyName,
        timestamp: new Date(),
        totalHeatGeneration,
        weaponHeat,
        movementHeat,
        environmentalHeat,
        heatProfile
      };

      this.log('info', `Heat generation calculated: ${totalHeatGeneration} points`);
      return result;

    } catch (error) {
      this.log('error', `Heat generation calculation failed: ${error}`);
      throw error instanceof Error ? error : new Error('Heat generation calculation failed');
    }
  }

  /**
   * Calculate heat dissipation capacity
   */
  async calculateHeatDissipation(
    config: IUnitConfiguration
  ): Promise<IHeatDissipationResult> {
    try {
      this.log('debug', 'Calculating heat dissipation capacity');

      const engineRating = config.engineRating;
      const heatSinkData = StandardHeatCalculationStrategy.getHeatSinkData(config);

      // Calculate engine heat sinks (free with engine)
      const maxEngineHeatSinks = Math.floor(engineRating / 25);
      const engineHeatSinks = {
        count: maxEngineHeatSinks,
        type: heatSinkData.heatSinkType,
        dissipationPerSink: HeatTables.HEAT_SINK_DISSIPATION.get(heatSinkData.heatSinkType) || 1.0,
        totalDissipation: maxEngineHeatSinks * (HeatTables.HEAT_SINK_DISSIPATION.get(heatSinkData.heatSinkType) || 1.0),
        engineRating,
        maxEngineHeatSinks
      };

      // Calculate external heat sinks
      const externalHeatSinkDetails = [{
        type: heatSinkData.heatSinkType,
        count: heatSinkData.externalHeatSinks,
        dissipationPerSink: HeatTables.HEAT_SINK_DISSIPATION.get(heatSinkData.heatSinkType) || 1.0,
        totalDissipation: heatSinkData.externalHeatSinks * (HeatTables.HEAT_SINK_DISSIPATION.get(heatSinkData.heatSinkType) || 1.0),
        location: 'Various', // External heat sinks can be placed in various locations
        weight: heatSinkData.externalHeatSinks * 1.0 // Standard weight for heat sinks
      }];

      const totalDissipation = engineHeatSinks.totalDissipation + externalHeatSinkDetails[0].totalDissipation;

      // Environmental factors affecting dissipation
      const environmentalDissipation = this.config.includeEnvironmentalFactors 
        ? this.calculateEnvironmentalDissipationModifier()
        : 0;

      // Calculate efficiency
      const efficiency = this.calculateHeatSinkEfficiency(engineHeatSinks, externalHeatSinkDetails[0]);

      const result: IHeatDissipationResult = {
        calculated: totalDissipation,
        isWithinTolerance: true,
        calculationMethod: this.strategyName,
        timestamp: new Date(),
        totalDissipation,
        engineHeatSinks,
        externalHeatSinks: externalHeatSinkDetails,
        environmentalDissipation,
        efficiency
      };

      this.log('info', `Heat dissipation calculated: ${totalDissipation} points`);
      return result;

    } catch (error) {
      this.log('error', `Heat dissipation calculation failed: ${error}`);
      throw error instanceof Error ? error : new Error('Heat dissipation calculation failed');
    }
  }

  /**
   * Calculate complete heat balance
   */
  async calculateHeatBalance(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<IHeatBalanceResult> {
    try {
      this.log('debug', `Calculating heat balance for ${config.chassisName} ${config.model}`);

      // Get heat generation and dissipation
      const generationResult = await this.calculateHeatGeneration(equipment);
      const dissipationResult = await this.calculateHeatDissipation(config);

      const heatGeneration = generationResult.totalHeatGeneration;
      const heatDissipation = dissipationResult.totalDissipation;
      const heatBalance = heatDissipation - heatGeneration;

      // Generate scenarios
      const scenarios = this.generateHeatScenarios(generationResult, dissipationResult);

      // Generate recommendations
      const recommendations = this.generateHeatRecommendations(heatBalance, generationResult, dissipationResult);

      const result: IHeatBalanceResult = {
        calculated: heatBalance,
        isWithinTolerance: heatBalance >= 0,
        calculationMethod: this.strategyName,
        timestamp: new Date(),
        heatGeneration,
        heatDissipation,
        heatBalance,
        scenarios,
        recommendations
      };

      this.log('info', `Heat balance calculated: ${heatBalance >= 0 ? 'POSITIVE' : 'NEGATIVE'} (${heatBalance})`);
      return result;

    } catch (error) {
      this.log('error', `Heat balance calculation failed: ${error}`);
      throw error instanceof Error ? error : new Error('Heat balance calculation failed');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private isWeapon(equipmentName: string): boolean {
    return HeatTables.WEAPON_HEAT.has(equipmentName) || 
           equipmentName.toLowerCase().includes('laser') ||
           equipmentName.toLowerCase().includes('ppc') ||
           equipmentName.toLowerCase().includes('ac/') ||
           equipmentName.toLowerCase().includes('srm') ||
           equipmentName.toLowerCase().includes('lrm');
  }

  private getWeaponHeat(weaponName: string): number {
    return HeatTables.WEAPON_HEAT.get(weaponName) || 0;
  }

  private getWeaponRateOfFire(weaponName: string): number {
    // Most weapons fire once per turn, some special cases
    if (weaponName.toLowerCase().includes('machine gun')) return 1; // Continuous but low heat
    if (weaponName.toLowerCase().includes('ultra')) return 2; // Ultra ACs can double-fire
    if (weaponName.toLowerCase().includes('rotary')) return 6; // Rotary ACs can fire multiple times
    return 1; // Standard rate of fire
  }

  private getWeaponType(weaponName: string): string {
    if (weaponName.toLowerCase().includes('laser') || weaponName.toLowerCase().includes('ppc')) {
      return 'Energy';
    }
    if (weaponName.toLowerCase().includes('ac/') || weaponName.toLowerCase().includes('gauss')) {
      return 'Ballistic';
    }
    if (weaponName.toLowerCase().includes('rm') || weaponName.toLowerCase().includes('missile')) {
      return 'Missile';
    }
    return 'Unknown';
  }

  private getWeaponHeatModifiers(weaponName: string): any[] {
    const modifiers: any[] = [];
    
    // Example modifiers
    if (weaponName.toLowerCase().includes('er')) {
      modifiers.push({
        name: 'Extended Range',
        type: 'additive' as const,
        value: 2,
        reason: 'ER weapons generate additional heat',
        source: 'Weapon Technology'
      });
    }

    return modifiers;
  }

  private calculateMovementHeat(): any {
    return {
      walkingHeat: HeatTables.MOVEMENT_HEAT.get('walking') || 1,
      runningHeat: HeatTables.MOVEMENT_HEAT.get('running') || 2,
      jumpingHeat: HeatTables.MOVEMENT_HEAT.get('jumping') || 1,
      sprintingHeat: HeatTables.MOVEMENT_HEAT.get('sprinting') || 3,
      movementType: 'run' as const
    };
  }

  private calculateEnvironmentalHeat(): number {
    // Default to temperate conditions
    return HeatTables.ENVIRONMENTAL_HEAT.get('temperate') || 0;
  }

  private calculateEnvironmentalDissipationModifier(): number {
    // Environmental factors can affect heat dissipation
    return 0; // Neutral modifier for standard conditions
  }

  private calculateHeatSinkEfficiency(engineHeatSinks: any, externalHeatSinks: any): any {
    const totalHeatSinks = engineHeatSinks.count + externalHeatSinks.count;
    const totalDissipation = engineHeatSinks.totalDissipation + externalHeatSinks.totalDissipation;
    
    return {
      overallEfficiency: totalHeatSinks > 0 ? (totalDissipation / totalHeatSinks) * 100 : 0,
      engineEfficiency: engineHeatSinks.dissipationPerSink * 100,
      externalEfficiency: externalHeatSinks.dissipationPerSink * 100,
      optimalConfiguration: {
        engineHeatSinks: engineHeatSinks.count,
        externalHeatSinks: Math.max(0, 20 - engineHeatSinks.count), // Recommend up to 20 total
        heatSinkType: engineHeatSinks.type,
        totalDissipation: totalDissipation,
        weightSavings: 0
      },
      improvements: this.generateHeatSinkImprovements(engineHeatSinks, externalHeatSinks)
    };
  }

  private generateHeatSinkImprovements(engineHeatSinks: any, externalHeatSinks: any): any[] {
    const improvements: any[] = [];

    // Recommend double heat sinks if using singles
    if (engineHeatSinks.type === 'Single') {
      improvements.push({
        type: 'upgrade' as const,
        description: 'Upgrade to Double Heat Sinks for better efficiency',
        dissipationImprovement: engineHeatSinks.count, // Would double the dissipation
        weightImpact: 0, // DHS don't weigh more
        cost: 'Moderate',
        feasibility: 'high' as const
      });
    }

    // Recommend adding heat sinks if running hot
    if (externalHeatSinks.count < 10) {
      improvements.push({
        type: 'add' as const,
        description: 'Add external heat sinks to increase dissipation',
        dissipationImprovement: 10 - externalHeatSinks.count,
        weightImpact: (10 - externalHeatSinks.count) * 1.0,
        cost: 'Low',
        feasibility: 'high' as const
      });
    }

    return improvements;
  }

  private generateHeatProfile(weaponHeat: any[], movementHeat: any): any {
    const sustainedFire = weaponHeat.reduce((sum, weapon) => sum + weapon.totalHeat, 0);
    const alphastrike = sustainedFire; // For now, assume all weapons fire
    
    return {
      sustainedFire,
      alphastrike,
      peakHeat: alphastrike + movementHeat.runningHeat,
      averageHeat: sustainedFire + movementHeat.walkingHeat,
      heatCurve: this.generateHeatCurve(sustainedFire, movementHeat)
    };
  }

  private generateHeatCurve(weaponHeat: number, movementHeat: any): any[] {
    const curve: any[] = [];
    let cumulativeHeat = 0;

    // Generate 10 turns of data
    for (let turn = 1; turn <= 10; turn++) {
      const turnHeat = weaponHeat + (turn % 2 === 0 ? movementHeat.runningHeat : movementHeat.walkingHeat);
      cumulativeHeat += turnHeat;
      
      curve.push({
        turn,
        heat: turnHeat,
        cumulative: cumulativeHeat,
        scenario: turn <= 5 ? 'Combat' : 'Sustained Combat'
      });
    }

    return curve;
  }

  private generateHeatScenarios(generationResult: IHeatGenerationResult, dissipationResult: IHeatDissipationResult): any[] {
    const scenarios: any[] = [];

    // Conservative scenario (walking, selective fire)
    scenarios.push({
      name: 'Conservative',
      description: 'Walking movement with selective weapon fire',
      heatGeneration: Math.floor(generationResult.totalHeatGeneration * 0.6),
      heatDissipation: dissipationResult.totalDissipation,
      balance: dissipationResult.totalDissipation - Math.floor(generationResult.totalHeatGeneration * 0.6),
      turnsToOverheat: this.calculateTurnsToOverheat(Math.floor(generationResult.totalHeatGeneration * 0.6), dissipationResult.totalDissipation)
    });

    // Aggressive scenario (running, full alpha strike)
    scenarios.push({
      name: 'Aggressive',
      description: 'Running movement with full alpha strike',
      heatGeneration: generationResult.totalHeatGeneration + 2, // Add running heat
      heatDissipation: dissipationResult.totalDissipation,
      balance: dissipationResult.totalDissipation - (generationResult.totalHeatGeneration + 2),
      turnsToOverheat: this.calculateTurnsToOverheat(generationResult.totalHeatGeneration + 2, dissipationResult.totalDissipation)
    });

    return scenarios;
  }

  private calculateTurnsToOverheat(heatGeneration: number, heatDissipation: number): number {
    const netHeat = heatGeneration - heatDissipation;
    if (netHeat <= 0) return -1; // Never overheats
    
    // Assuming shutdown at 30 heat points
    const shutdownThreshold = 30;
    return Math.ceil(shutdownThreshold / netHeat);
  }

  private generateHeatRecommendations(heatBalance: number, generationResult: IHeatGenerationResult, dissipationResult: IHeatDissipationResult): any[] {
    const recommendations: any[] = [];

    if (heatBalance < 0) {
      // Running hot - need more dissipation or less generation
      recommendations.push({
        type: 'heat_sinks' as const,
        description: 'Add more heat sinks to increase dissipation',
        heatImprovement: Math.abs(heatBalance),
        difficulty: 'easy' as const,
        priority: 'high' as const,
        cost: 'Moderate'
      });

      recommendations.push({
        type: 'weapons' as const,
        description: 'Consider reducing heat-generating weapons',
        heatImprovement: Math.abs(heatBalance),
        difficulty: 'moderate' as const,
        priority: 'medium' as const,
        cost: 'High'
      });
    } else if (heatBalance > 5) {
      // Excess dissipation - could optimize
      recommendations.push({
        type: 'weapons' as const,
        description: 'Could add more energy weapons to utilize heat capacity',
        heatImprovement: -heatBalance,
        difficulty: 'moderate' as const,
        priority: 'low' as const,
        cost: 'Moderate'
      });
    }

    return recommendations;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.shouldLog(level)) {
      console.log(`[StandardHeatCalculation] ${level.toUpperCase()}: ${message}`);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }
}




