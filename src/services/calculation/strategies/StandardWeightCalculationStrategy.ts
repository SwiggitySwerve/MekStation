/**
 * StandardWeightCalculationStrategy - Concrete Weight Calculation Strategy
 * 
 * This service implements the IWeightCalculationStrategy interface,
 * demonstrating how to replace monolithic calculation logic with
 * focused, testable strategy implementations.
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles weight calculations
 * - Open/Closed: Can be extended without modifying existing code
 * - Liskov Substitution: Can replace any IWeightCalculationStrategy
 * - Interface Segregation: Implements only weight calculation methods
 * - Dependency Inversion: Depends on abstractions, not concrete classes
 */

import {
  IWeightCalculationStrategy,
  IUnitConfiguration,
  IEquipmentAllocation,
  IWeightCalculationResult,
  IComponentWeightResult,
  IWeightDistributionResult,
  ICalculationContext,
  TechBase,
  Result,
  success,
  failure
} from '../../../types/core';

/**
 * Weight calculation configuration
 */
export interface IWeightCalculationConfig {
  readonly precision: number;
  readonly enableOptimization: boolean;
  readonly includeTechBaseModifiers: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Standard BattleTech weight calculation tables
 */
export class WeightTables {
  // Engine weight table (rating -> weight)
  static readonly ENGINE_WEIGHTS = new Map<number, number>([
    [10, 0.5], [15, 0.5], [20, 1.0], [25, 1.5], [30, 2.0], [35, 2.5], [40, 3.0], [45, 3.5], [50, 4.0],
    [55, 4.5], [60, 5.0], [65, 5.5], [70, 6.0], [75, 6.5], [80, 7.0], [85, 7.5], [90, 8.0], [95, 8.5], [100, 10.0],
    [105, 10.5], [110, 11.0], [115, 11.5], [120, 12.0], [125, 12.5], [130, 13.0], [135, 13.5], [140, 14.0], [145, 14.5], [150, 15.5],
    [155, 16.0], [160, 16.5], [165, 17.0], [170, 17.5], [175, 18.0], [180, 18.5], [185, 19.0], [190, 19.5], [195, 20.0], [200, 21.5],
    [210, 22.5], [220, 24.0], [230, 25.5], [240, 27.0], [250, 28.5], [260, 30.0], [270, 31.5], [280, 33.0], [290, 34.5], [300, 36.5],
    [310, 38.0], [320, 39.5], [330, 41.0], [340, 42.5], [350, 44.5], [360, 46.0], [370, 47.5], [380, 49.0], [390, 50.5], [400, 52.5]
  ]);

  // Internal structure weight as percentage of tonnage
  static readonly STRUCTURE_WEIGHTS = new Map<string, number>([
    ['Standard', 0.1],        // 10% of tonnage
    ['EndoSteel', 0.05],      // 5% of tonnage
    ['Composite', 0.075]      // 7.5% of tonnage
  ]);

  // Armor weight (tons per 16 points)
  static readonly ARMOR_WEIGHTS = new Map<string, number>([
    ['Standard', 1.0],        // 1 ton per 16 points
    ['FerroFibrous', 0.89],   // 0.89 tons per 16 points
    ['LightFerroFibrous', 0.84], // 0.84 tons per 16 points
    ['HeavyFerroFibrous', 0.95], // 0.95 tons per 16 points
    ['Stealth', 1.0],         // 1 ton per 16 points (same as standard)
    ['Reactive', 1.3],        // 1.3 tons per 16 points
    ['Reflective', 1.0]       // 1 ton per 16 points
  ]);

  // Gyro weight multipliers
  static readonly GYRO_WEIGHTS = new Map<string, number>([
    ['Standard', 0.25],       // Engine rating / 100 * 1, rounded up to 0.5 ton increments
    ['Compact', 0.15],        // 1.5 tons
    ['Heavy', 0.5],           // 2 tons
    ['ExtraLight', 0.125]     // 0.5 tons
  ]);

  // Heat sink weights
  static readonly HEAT_SINK_WEIGHTS = new Map<string, number>([
    ['Single', 1.0],          // 1 ton each
    ['Double', 1.0],          // 1 ton each but dissipate 2 heat
    ['Compact', 0.5],         // 0.5 tons each
    ['Laser', 1.0]            // 1 ton each, specialized for energy weapons
  ]);
}

/**
 * Standard weight calculation strategy implementation
 */
export class StandardWeightCalculationStrategy implements IWeightCalculationStrategy {
  public readonly strategyName = 'StandardWeightCalculation';
  public readonly version = '1.0.0';
  public readonly category = 'weight';
  public readonly description = 'Standard BattleTech weight calculation strategy using official rules';

  async calculate(context: ICalculationContext): Promise<any> {
    // Type-safe context extraction with fallbacks
    const calculationData = this.extractCalculationData(context);
    return this.calculateTotalWeight(calculationData.config, calculationData.equipment);
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
   * Type-safe accessor for armor allocation data
   */
  private static getTotalArmorPoints(config: IUnitConfiguration): number {
    const configWithArmor = config as { totalArmor?: number; armorAllocation?: any };
    
    if (configWithArmor.totalArmor && typeof configWithArmor.totalArmor === 'number') {
      return configWithArmor.totalArmor;
    }

    // Calculate from armor allocation if available
    if (configWithArmor.armorAllocation && typeof configWithArmor.armorAllocation === 'object') {
      return Object.values(configWithArmor.armorAllocation).reduce((total: number, location: any) => {
        if (location && typeof location === 'object') {
          const front = (location.front || 0);
          const rear = (location.rear || 0);
          return total + front + rear;
        }
        return total;
      }, 0);
    }

    return 0;
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
   * Type-safe accessor for jump jet data
   */
  private static getJumpJetCount(config: IUnitConfiguration): number {
    const configWithJumpJets = config as { jumpJets?: number; jumpMP?: number };
    return configWithJumpJets.jumpJets || configWithJumpJets.jumpMP || 0;
  }

  /**
   * Type-safe accessor for equipment weight
   */
  private static getEquipmentWeight(item: IEquipmentAllocation): number {
    const equipmentWithWeight = item as { weight?: number };
    return equipmentWithWeight.weight || 1.0;
  }

  /**
   * Type-safe accessor for equipment type
   */
  private static getEquipmentType(item: IEquipmentAllocation): string {
    const equipmentWithType = item as { equipmentType?: string };
    return equipmentWithType.equipmentType || 'Unknown';
  }

  private config: IWeightCalculationConfig;

  constructor(config: Partial<IWeightCalculationConfig> = {}) {
    this.config = {
      precision: 2,
      enableOptimization: true,
      includeTechBaseModifiers: true,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * Calculate total weight of unit configuration and equipment
   */
  async calculateTotalWeight(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<IWeightCalculationResult> {
    try {
      this.log('debug', `Calculating total weight for ${config.chassisName} ${config.model}`);

      // Calculate individual component weights
      const structureWeight = this.calculateStructureWeight(config);
      const engineWeight = this.calculateEngineWeight(config);
      const armorWeight = this.calculateArmorWeight(config);
      const gyroWeight = this.calculateGyroWeight(config);
      const cockpitWeight = this.calculateCockpitWeight(config);
      const heatSinkWeight = this.calculateHeatSinkWeight(config);
      const jumpJetWeight = this.calculateJumpJetWeight(config);
      const equipmentWeight = this.calculateEquipmentWeight(equipment);
      const ammunitionWeight = this.calculateAmmunitionWeight(equipment);

      const totalWeight = structureWeight + engineWeight + armorWeight + gyroWeight + 
                         cockpitWeight + heatSinkWeight + jumpJetWeight + equipmentWeight + ammunitionWeight;

      // Round to precision
      const roundedWeight = Math.round(totalWeight * Math.pow(10, this.config.precision)) / Math.pow(10, this.config.precision);

      // Create component breakdown
      const componentBreakdown = {
        structure: {
          weight: structureWeight,
          type: config.structureType || 'Standard',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('structure', structureWeight, config),
          optimization: this.generateComponentOptimization('structure', structureWeight, config)
        },
        armor: {
          weight: armorWeight,
          type: config.armorType || 'Standard',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('armor', armorWeight, config),
          optimization: this.generateComponentOptimization('armor', armorWeight, config)
        },
        engine: {
          weight: engineWeight,
          type: config.engineType || 'Standard',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('engine', engineWeight, config),
          optimization: this.generateComponentOptimization('engine', engineWeight, config)
        },
        gyro: {
          weight: gyroWeight,
          type: config.gyroType || 'Standard',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('gyro', gyroWeight, config),
          optimization: this.generateComponentOptimization('gyro', gyroWeight, config)
        },
        cockpit: {
          weight: cockpitWeight,
          type: config.cockpitType || 'Standard',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('cockpit', cockpitWeight, config),
          optimization: this.generateComponentOptimization('cockpit', cockpitWeight, config)
        },
        heatSinks: {
          weight: heatSinkWeight,
          type: config.heatSinkType || 'Single',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('heatSinks', heatSinkWeight, config),
          optimization: this.generateComponentOptimization('heatSinks', heatSinkWeight, config)
        },
        jumpJets: {
          weight: jumpJetWeight,
          type: config.jumpJetType || 'Standard',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('jumpJets', jumpJetWeight, config),
          optimization: this.generateComponentOptimization('jumpJets', jumpJetWeight, config)
        },
        equipment: {
          weight: equipmentWeight,
          type: 'Mixed',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('equipment', equipmentWeight, config),
          optimization: this.generateComponentOptimization('equipment', equipmentWeight, config)
        },
        ammunition: {
          weight: ammunitionWeight,
          type: 'Standard',
          techBase: config.techBase,
          efficiency: this.calculateComponentEfficiency('ammunition', ammunitionWeight, config),
          optimization: this.generateComponentOptimization('ammunition', ammunitionWeight, config)
        }
      };

      // Calculate location breakdown
      const locationBreakdown = this.calculateLocationBreakdown(config, equipment, componentBreakdown);

      // Generate optimization recommendations
      const optimization = this.config.enableOptimization 
        ? this.generateOptimizationRecommendations(config, componentBreakdown, totalWeight)
        : this.createDefaultOptimization();

      const result: IWeightCalculationResult = {
        calculated: roundedWeight,
        isWithinTolerance: roundedWeight <= config.tonnage,
        calculationMethod: this.strategyName,
        timestamp: new Date(),
        totalWeight: roundedWeight,
        maxTonnage: config.tonnage,
        remainingTonnage: config.tonnage - roundedWeight,
        percentageUsed: (roundedWeight / config.tonnage) * 100,
        isOverweight: roundedWeight > config.tonnage,
        componentBreakdown,
        locationBreakdown,
        optimization
      };

      this.log('info', `Weight calculation complete: ${roundedWeight}/${config.tonnage} tons (${result.percentageUsed.toFixed(1)}%)`);
      return result;

    } catch (error) {
      this.log('error', `Weight calculation failed: ${error}`);
      throw error instanceof Error ? error : new Error('Weight calculation failed');
    }
  }

  /**
   * Calculate individual component weight
   */
  async calculateComponentWeight(
    componentType: string,
    componentConfig: any,
    context: ICalculationContext
  ): Promise<IComponentWeightResult> {
    try {
      this.log('debug', `Calculating weight for component: ${componentType}`);

      let baseWeight = 0;
      let modifiers: any[] = [];

      switch (componentType.toLowerCase()) {
        case 'engine':
          baseWeight = this.calculateEngineWeight(componentConfig as IUnitConfiguration);
          break;
        case 'structure':
          baseWeight = this.calculateStructureWeight(componentConfig as IUnitConfiguration);
          break;
        case 'armor':
          baseWeight = this.calculateArmorWeight(componentConfig as IUnitConfiguration);
          break;
        case 'gyro':
          baseWeight = this.calculateGyroWeight(componentConfig as IUnitConfiguration);
          break;
        case 'cockpit':
          baseWeight = this.calculateCockpitWeight(componentConfig as IUnitConfiguration);
          break;
        case 'heatsinks':
          baseWeight = this.calculateHeatSinkWeight(componentConfig as IUnitConfiguration);
          break;
        case 'jumpjets':
          baseWeight = this.calculateJumpJetWeight(componentConfig as IUnitConfiguration);
          break;
        default:
          throw new Error(`Unknown component type: ${componentType}`);
      }

      // Apply tech base modifiers if enabled
      if (this.config.includeTechBaseModifiers && componentConfig.techBase === TechBase.CLAN) {
        const clanModifier = 0.9; // Clan tech is generally lighter
        modifiers.push({
          name: 'Clan Technology',
          type: 'multiplier' as const,
          value: clanModifier,
          reason: 'Clan technology is more advanced and lighter',
          source: 'TechBase'
        });
        baseWeight *= clanModifier;
      }

      const result: IComponentWeightResult = {
        calculated: baseWeight,
        isWithinTolerance: true,
        calculationMethod: this.strategyName,
        timestamp: new Date(),
        componentType,
        componentName: componentConfig.name || componentType,
        baseWeight,
        modifiedWeight: baseWeight,
        modifiers,
        techBase: componentConfig.techBase || TechBase.INNER_SPHERE
      };

      return result;

    } catch (error) {
      this.log('error', `Component weight calculation failed for ${componentType}: ${error}`);
      throw error instanceof Error ? error : new Error(`Component weight calculation failed for ${componentType}`);
    }
  }

  /**
   * Calculate weight distribution across locations
   */
  async calculateDistribution(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<IWeightDistributionResult> {
    try {
      this.log('debug', 'Calculating weight distribution across locations');

      const totalWeightResult = await this.calculateTotalWeight(config, equipment);
      const locationBreakdown = totalWeightResult.locationBreakdown;

      // Calculate center of gravity
      const centerOfGravity = this.calculateCenterOfGravity(locationBreakdown);

      // Perform stability analysis
      const stability = this.performStabilityAnalysis(locationBreakdown, centerOfGravity);

      const result: IWeightDistributionResult = {
        calculated: totalWeightResult.totalWeight,
        isWithinTolerance: totalWeightResult.isWithinTolerance,
        calculationMethod: this.strategyName,
        timestamp: new Date(),
        totalWeight: totalWeightResult.totalWeight,
        distribution: locationBreakdown,
        centerOfGravity,
        stability
      };

      return result;

    } catch (error) {
      this.log('error', `Weight distribution calculation failed: ${error}`);
      throw error instanceof Error ? error : new Error('Weight distribution calculation failed');
    }
  }

  // ===== PRIVATE CALCULATION METHODS =====

  private calculateStructureWeight(config: IUnitConfiguration): number {
    const structureType = config.structureType || 'Standard';
    const modifier = WeightTables.STRUCTURE_WEIGHTS.get(structureType) || 0.1;
    return config.tonnage * modifier;
  }

  private calculateEngineWeight(config: IUnitConfiguration): number {
    const engineType = config.engineType || 'Standard';
    let baseWeight = WeightTables.ENGINE_WEIGHTS.get(config.engineRating) || 0;

    // Apply engine type modifiers
    switch (engineType) {
      case 'XL':
        baseWeight *= 0.5;
        break;
      case 'Light':
        baseWeight *= 0.75;
        break;
      case 'Compact':
        baseWeight *= 1.5;
        break;
      case 'XXL':
        baseWeight *= 0.33;
        break;
    }

    return Math.max(0.5, baseWeight); // Minimum engine weight is 0.5 tons
  }

  private calculateArmorWeight(config: IUnitConfiguration): number {
    const armorType = config.armorType || 'Standard';
    const armorPoints = StandardWeightCalculationStrategy.getTotalArmorPoints(config);
    const weightPerPoint = (WeightTables.ARMOR_WEIGHTS.get(armorType) || 1.0) / 16;
    return armorPoints * weightPerPoint;
  }

  private calculateGyroWeight(config: IUnitConfiguration): number {
    const gyroType = config.gyroType || 'Standard';
    const engineRating = config.engineRating;

    if (gyroType === 'Standard') {
      return Math.ceil((engineRating / 100) / 0.5) * 0.5; // Round up to nearest 0.5 ton
    }

    const modifier = WeightTables.GYRO_WEIGHTS.get(gyroType) || 0.25;
    return Math.max(0.5, engineRating * modifier / 100);
  }

  private calculateCockpitWeight(config: IUnitConfiguration): number {
    const cockpitType = config.cockpitType || 'Standard';
    
    switch (cockpitType) {
      case 'Standard': return 3.0;
      case 'Small': return 2.0;
      case 'Torso': return 4.0;
      case 'Command': return 6.0;
      case 'Dual': return 4.0;
      default: return 3.0;
    }
  }

  private calculateHeatSinkWeight(config: IUnitConfiguration): number {
    const heatSinkData = StandardWeightCalculationStrategy.getHeatSinkData(config);
    const weightPerHeatSink = WeightTables.HEAT_SINK_WEIGHTS.get(heatSinkData.heatSinkType) || 1.0;
    return heatSinkData.externalHeatSinks * weightPerHeatSink;
  }

  private calculateJumpJetWeight(config: IUnitConfiguration): number {
    const jumpJetCount = StandardWeightCalculationStrategy.getJumpJetCount(config);
    const tonnage = config.tonnage;
    
    // Jump jet weight depends on 'Mech tonnage
    let weightPerJet: number;
    if (tonnage <= 55) {
      weightPerJet = 0.5;
    } else if (tonnage <= 85) {
      weightPerJet = 1.0;
    } else {
      weightPerJet = 2.0;
    }

    return jumpJetCount * weightPerJet;
  }

  private calculateEquipmentWeight(equipment: IEquipmentAllocation[]): number {
    return equipment.reduce((total, item) => {
      // This would normally look up equipment weights from a database
      // For now, using placeholder values
      const baseWeight = StandardWeightCalculationStrategy.getEquipmentWeight(item);
      const quantity = item.quantity || 1;
      return total + (baseWeight * quantity);
    }, 0);
  }

  private calculateAmmunitionWeight(equipment: IEquipmentAllocation[]): number {
    return equipment
      .filter(item => StandardWeightCalculationStrategy.getEquipmentType(item) === 'Ammunition')
      .reduce((total, ammo) => {
        const weight = StandardWeightCalculationStrategy.getEquipmentWeight(ammo);
        const quantity = ammo.quantity || 1;
        return total + (weight * quantity);
      }, 0);
  }

  private calculateComponentEfficiency(
    componentType: string,
    weight: number,
    config: IUnitConfiguration
  ): number {
    // Simplified efficiency calculation
    const tonnageRatio = weight / config.tonnage;
    
    switch (componentType) {
      case 'structure':
        return Math.max(0, 100 - (tonnageRatio - 0.05) * 1000); // Optimal around 5%
      case 'armor':
        return Math.max(0, 100 - Math.abs(tonnageRatio - 0.3) * 200); // Optimal around 30%
      case 'engine':
        return Math.max(0, 100 - Math.abs(tonnageRatio - 0.25) * 300); // Optimal around 25%
      default:
        return Math.max(0, 100 - tonnageRatio * 100);
    }
  }

  private generateComponentOptimization(
    componentType: string,
    weight: number,
    config: IUnitConfiguration
  ): any {
    return {
      canOptimize: true,
      potentialSavings: weight * 0.1, // Assume 10% potential savings
      alternativeOptions: [
        {
          name: `Lightweight ${componentType}`,
          type: componentType,
          weight: weight * 0.9,
          weightSavings: weight * 0.1,
          techBase: config.techBase,
          tradeoffs: ['Reduced durability'],
          feasibility: 'medium' as const
        }
      ],
      recommendations: [`Consider upgrading ${componentType} for weight savings`]
    };
  }

  private calculateLocationBreakdown(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[],
    componentBreakdown: any
  ): any {
    // Simplified location distribution
    const totalWeight = Object.values(componentBreakdown).reduce((sum: number, comp: any) => sum + comp.weight, 0);
    
    return {
      head: totalWeight * 0.05,
      centerTorso: totalWeight * 0.3,
      leftTorso: totalWeight * 0.15,
      rightTorso: totalWeight * 0.15,
      leftArm: totalWeight * 0.1,
      rightArm: totalWeight * 0.1,
      leftLeg: totalWeight * 0.075,
      rightLeg: totalWeight * 0.075,
      balance: {
        frontToRear: 0.0,
        leftToRight: 0.0,
        topToBottom: 0.5,
        stability: 'good' as const,
        recommendations: ['Weight distribution is acceptable']
      }
    };
  }

  private calculateCenterOfGravity(locationBreakdown: any): any {
    return {
      x: 0.0, // Centered
      y: 0.1, // Slightly forward
      z: 0.5, // Middle height
      offset: 0.1,
      classification: 'centered' as const
    };
  }

  private performStabilityAnalysis(locationBreakdown: any, centerOfGravity: any): any {
    return {
      overallScore: 85,
      balanceScore: 88,
      weightDistributionScore: 82,
      structuralIntegrityScore: 90,
      factors: [
        {
          name: 'Center of Gravity',
          impact: 10,
          description: 'Center of gravity is well-positioned',
          category: 'balance' as const
        }
      ],
      risks: []
    };
  }

  private generateOptimizationRecommendations(
    config: IUnitConfiguration,
    componentBreakdown: any,
    totalWeight: number
  ): any {
    const improvements: any[] = [];
    const alternatives: any[] = [];

    // Check if overweight
    if (totalWeight > config.tonnage) {
      improvements.push({
        component: 'Overall',
        currentWeight: totalWeight,
        optimizedWeight: config.tonnage,
        savings: totalWeight - config.tonnage,
        method: 'Component optimization',
        difficulty: 'moderate' as const,
        impact: 'Brings unit within tonnage limits'
      });
    }

    return {
      currentEfficiency: Math.min(100, (config.tonnage / totalWeight) * 100),
      maxEfficiency: 95,
      improvements,
      alternativeConfigurations: alternatives
    };
  }

  private createDefaultOptimization(): any {
    return {
      currentEfficiency: 85,
      maxEfficiency: 95,
      improvements: [],
      alternativeConfigurations: []
    };
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.shouldLog(level)) {
      console.log(`[StandardWeightCalculation] ${level.toUpperCase()}: ${message}`);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }
}




