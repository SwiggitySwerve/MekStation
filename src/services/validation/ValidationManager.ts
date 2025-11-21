/**
 * ValidationManager - Comprehensive validation service for BattleTech units
 * 
 * Handles validation logic, error handling, and compliance checking for BattleTech units.
 * Implements SOLID principles with proper type safety and dependency injection support.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { 
  IValidationManager,
  ValidationResult,
  ValidationError,
  WeightValidationResult,
  HeatValidationResult,
  MovementValidationResult,
  EquipmentValidationResult,
  WeaponValidationResult,
  AmmoValidationResult,
  CriticalSlotValidationResult,
  TechLevelValidationResult,
  MixedTechValidationResult,
  EraValidationResult,
  WeightDistributionResult,
  HeatBalanceResult,
  EquipmentCompatibilityResult,
  ComplianceReport,
  ComplianceScore,
  ValidationSummary,
  EquipmentItem,
  AmmoBalanceCheck,
  WeightDistribution,
  MixedTechCheck,
  isValidUnitConfiguration,
  isValidEquipmentArray
} from './IValidationManager';

export class ValidationManager implements IValidationManager {
  constructor() {}

  /**
   * Validate unit configuration
   */
  validateConfiguration(config: UnitConfiguration): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    // Validate tonnage
    if (config.tonnage <= 0) {
      errors.push({
        type: 'weight',
        message: 'Tonnage must be greater than 0',
        severity: 'error',
        field: 'tonnage'
      });
      score -= 20;
    }

    // Validate engine rating
    if (config.engineRating <= 0) {
      errors.push({
        type: 'engine',
        message: 'Engine rating must be greater than 0',
        severity: 'error',
        field: 'engineRating'
      });
      score -= 15;
    }

    // Validate movement
    if (config.walkMP <= 0) {
      errors.push({
        type: 'movement',
        message: 'Walk MP must be greater than 0',
        severity: 'error',
        field: 'walkMP'
      });
      score -= 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score)
    };
  }

  /**
   * Validate weight limits
   */
  validateWeightLimits(config: UnitConfiguration, equipment: EquipmentItem[]): WeightValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const totalWeight = this.calculateTotalWeight(config, equipment);
    const maxWeight = config.tonnage;
    const overweight = Math.max(0, totalWeight - maxWeight);

    // Add validation for tonnage being too high
    if (config.tonnage > 100) {
      errors.push({
        type: 'weight',
        message: `Tonnage ${config.tonnage} exceeds maximum allowed weight of 100 tons`,
        severity: 'error',
        field: 'tonnage'
      });
      score -= 30;
    }

    if (overweight > 0) {
      errors.push({
        type: 'weight',
        message: `Unit is ${overweight.toFixed(1)} tons overweight`,
        severity: 'error',
        field: 'totalWeight'
      });
      score -= Math.min(50, overweight * 5);
    }

    if (totalWeight < maxWeight * 0.8) {
      warnings.push({
        type: 'weight',
        message: 'Unit is significantly underweight',
        severity: 'warning',
        field: 'totalWeight'
      });
      score -= 5;
    }

    return {
      isValid: overweight === 0 && config.tonnage <= 100,
      errors,
      warnings,
      score: Math.max(0, score),
      totalWeight,
      maxWeight,
      overweight
    };
  }

  /**
   * Validate heat management
   */
  validateHeatManagement(config: UnitConfiguration, equipment: EquipmentItem[]): HeatValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const heatGeneration = this.calculateHeatGeneration(equipment);
    const heatDissipation = this.calculateHeatDissipation(config);
    const heatDeficit = Math.max(0, heatGeneration - heatDissipation);

    if (heatDeficit > 0) {
      errors.push({
        type: 'heat',
        message: `Heat deficit of ${heatDeficit} points`,
        severity: 'error',
        field: 'heatManagement'
      });
      score -= Math.min(40, heatDeficit * 4);
    }

    if (heatGeneration > heatDissipation * 0.8) {
      warnings.push({
        type: 'heat',
        message: 'Heat generation is close to dissipation limit',
        severity: 'warning',
        field: 'heatManagement'
      });
      score -= 5;
    }

    return {
      isValid: heatDeficit === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      heatGeneration,
      heatDissipation,
      heatDeficit
    };
  }

  /**
   * Validate movement rules
   */
  validateMovementRules(config: UnitConfiguration): MovementValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const walkMP = config.walkMP || 0;
    const runMP = config.runMP || 0;
    const jumpMP = config.jumpMP || 0;

    if (walkMP <= 0) {
      errors.push({
        type: 'movement',
        message: 'Walk MP must be greater than 0',
        severity: 'error',
        field: 'walkMP'
      });
      score -= 20;
    }

    if (runMP !== Math.floor(walkMP * 1.5)) {
      warnings.push({
        type: 'movement',
        message: 'Run MP should be 1.5 times Walk MP',
        severity: 'warning',
        field: 'runMP'
      });
      score -= 5;
    }

    if (jumpMP > walkMP) {
      errors.push({
        type: 'movement',
        message: 'Jump MP cannot exceed Walk MP',
        severity: 'error',
        field: 'jumpMP'
      });
      score -= 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      walkMP,
      runMP,
      jumpMP
    };
  }

  /**
   * Validate equipment loadout
   */
  validateEquipmentLoadout(equipment: EquipmentItem[], config: UnitConfiguration): EquipmentValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const weapons = equipment.filter(eq => eq.type === 'weapon');
    const ammunition = equipment.filter(eq => eq.type === 'ammunition');
    const heatSinks = equipment.filter(eq => eq.type === 'heat_sink');

    if (weapons.length === 0) {
      warnings.push({
        type: 'equipment',
        message: 'No weapons equipped',
        severity: 'warning',
        field: 'weapons'
      });
      score -= 10;
    }

    if (ammunition.length > 0 && weapons.length === 0) {
      errors.push({
        type: 'equipment',
        message: 'Ammunition without weapons',
        severity: 'error',
        field: 'ammunition'
      });
      score -= 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      weapons,
      ammunition,
      heatSinks
    };
  }

  /**
   * Validate weapon rules
   */
  validateWeaponRules(equipment: EquipmentItem[], config: UnitConfiguration): WeaponValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const weapons = equipment.filter(eq => eq.type === 'weapon');
    const weaponCount = weapons.length;
    const totalWeaponWeight = weapons.reduce((sum, w) => sum + (w.weight || 0), 0);
    const heatGeneration = weapons.reduce((sum, w) => sum + (w.heat || 0), 0);

    if (weaponCount === 0) {
      warnings.push({
        type: 'weapons',
        message: 'No weapons equipped',
        severity: 'warning',
        field: 'weapons'
      });
      score -= 10;
    }

    if (totalWeaponWeight > config.tonnage * 0.5) {
      warnings.push({
        type: 'weapons',
        message: 'Weapons take up more than 50% of unit weight',
        severity: 'warning',
        field: 'weaponWeight'
      });
      score -= 5;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      weaponCount,
      totalWeaponWeight,
      heatGeneration
    };
  }

  /**
   * Validate ammunition rules
   */
  validateAmmoRules(equipment: EquipmentItem[], config: UnitConfiguration): AmmoValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const ammunition = equipment.filter(eq => eq.type === 'ammunition');
    const totalAmmoWeight = ammunition.reduce((sum, ammo) => sum + (ammo.weight || 0), 0);
    const ammoBalance = ammunition.map(ammo => ({
      weapon: ammo.weapon || 'Unknown',
      tons: ammo.weight || 0,
      turns: 10,
      adequate: true
    }));
    const caseProtection = ammunition.filter(ammo => ammo.explosive).map(ammo => ammo.location || 'Unknown');

    if (totalAmmoWeight > config.tonnage * 0.1) {
      warnings.push({
        type: 'ammunition',
        message: 'Ammunition takes up more than 10% of unit weight',
        severity: 'warning',
        field: 'ammoWeight'
      });
      score -= 5;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      totalAmmoWeight,
      ammoBalance,
      caseProtection
    };
  }

  /**
   * Validate critical slot rules
   */
  validateCriticalSlotRules(equipment: EquipmentItem[], config: UnitConfiguration): CriticalSlotValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const usedSlots = equipment.reduce((sum, eq) => sum + (eq.criticalSlots || 0), 0);
    const availableSlots = this.getTotalAvailableSlots(config);
    const slotDeficit = Math.max(0, usedSlots - availableSlots);

    if (slotDeficit > 0) {
      errors.push({
        type: 'criticalSlots',
        message: `Critical slot deficit of ${slotDeficit} slots`,
        severity: 'error',
        field: 'criticalSlots'
      });
      score -= Math.min(30, slotDeficit * 3);
    }

    if (usedSlots > availableSlots * 0.8) {
      warnings.push({
        type: 'criticalSlots',
        message: 'Critical slots are nearly full',
        severity: 'warning',
        field: 'criticalSlots'
      });
      score -= 5;
    }

    return {
      isValid: slotDeficit === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      usedSlots,
      availableSlots,
      slotDeficit
    };
  }

  /**
   * Validate tech level
   */
  validateTechLevel(config: UnitConfiguration, equipment: EquipmentItem[]): TechLevelValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const unitTechLevel = config.techBase || 'Inner Sphere';
    const unitTechBase = config.techBase || 'Inner Sphere';
    const era = 'Succession Wars';
    const mixedTech = this.checkMixedTech(equipment);

    if (mixedTech.isMixed && !mixedTech.allowedMixed) {
      errors.push({
        type: 'techLevel',
        message: 'Mixed tech not allowed in this era',
        severity: 'error',
        field: 'techBase'
      });
      score -= 20;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      unitTechLevel,
      unitTechBase,
      era
    };
  }

  /**
   * Validate mixed tech
   */
  validateMixedTech(config: UnitConfiguration, equipment: EquipmentItem[]): MixedTechValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const mixedTech = this.checkMixedTech(equipment);
    const isMixed = mixedTech.isMixed;
    const innerSphereComponents = mixedTech.innerSphereComponents;
    const clanComponents = mixedTech.clanComponents;
    const allowedMixed = mixedTech.allowedMixed;

    if (isMixed && !allowedMixed) {
      errors.push({
        type: 'mixedTech',
        message: 'Mixed tech not allowed',
        severity: 'error',
        field: 'techBase'
      });
      score -= 25;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      isMixed,
      innerSphereComponents,
      clanComponents,
      allowedMixed
    };
  }

  /**
   * Validate era restrictions
   */
  validateEraRestrictions(config: UnitConfiguration, equipment: EquipmentItem[]): EraValidationResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const era = 'Succession Wars';
    const invalidComponents = equipment.filter(eq => eq.era && eq.era !== era);

    if (invalidComponents.length > 0) {
      errors.push({
        type: 'eraRestrictions',
        message: `${invalidComponents.length} components not available in ${era}`,
        severity: 'error',
        field: 'era'
      });
      score -= invalidComponents.length * 5;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      era,
      invalidComponents
    };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(config: UnitConfiguration, equipment: any[]): ComplianceReport {
    const configuration = this.validateConfiguration(config);
    const weight = this.validateWeightLimits(config, equipment);
    const heat = this.validateHeatManagement(config, equipment);
    const movement = this.validateMovementRules(config);
    const loadout = this.validateEquipmentLoadout(equipment, config);

    const overallCompliance = Math.round(
      (configuration.score + weight.score + heat.score + movement.score + loadout.score) / 5
    );

    return {
      overallCompliance,
      ruleCompliance: [configuration, weight, heat, movement, loadout],
      violationSummary: [
        ...configuration.errors,
        ...weight.errors,
        ...heat.errors,
        ...movement.errors,
        ...loadout.errors
      ],
      recommendationSummary: [
        ...configuration.warnings,
        ...weight.warnings,
        ...heat.warnings,
        ...movement.warnings,
        ...loadout.warnings
      ],
      complianceMetrics: {
        configuration: configuration.score,
        weight: weight.score,
        heat: heat.score,
        movement: movement.score,
        loadout: loadout.score
      }
    };
  }

  /**
   * Calculate compliance score
   */
  calculateComplianceScore(config: UnitConfiguration, equipment: any[]): any {
    const configuration = this.validateConfiguration(config);
    const weight = this.validateWeightLimits(config, equipment);
    const heat = this.validateHeatManagement(config, equipment);
    const movement = this.validateMovementRules(config);
    const loadout = this.validateEquipmentLoadout(equipment, config);

    const overallScore = Math.round(
      (configuration.score + weight.score + heat.score + movement.score + loadout.score) / 5
    );

    return {
      overallScore,
      categoryScores: {
        configuration: configuration.score,
        weight: weight.score,
        heat: heat.score,
        movement: movement.score,
        loadout: loadout.score
      },
      penalties: [
        ...configuration.errors,
        ...weight.errors,
        ...heat.errors,
        ...movement.errors,
        ...loadout.errors
      ],
      bonuses: [
        ...configuration.warnings,
        ...weight.warnings,
        ...heat.warnings,
        ...movement.warnings,
        ...loadout.warnings
      ]
    };
  }

  /**
   * Generate validation summary
   */
  generateValidationSummary(config: UnitConfiguration, equipment: any[]): any {
    const configuration = this.validateConfiguration(config);
    const weight = this.validateWeightLimits(config, equipment);
    const heat = this.validateHeatManagement(config, equipment);
    const movement = this.validateMovementRules(config);
    const loadout = this.validateEquipmentLoadout(equipment, config);

    const allErrors = [
      ...configuration.errors,
      ...weight.errors,
      ...heat.errors,
      ...movement.errors,
      ...loadout.errors
    ];

    const allWarnings = [
      ...configuration.warnings,
      ...weight.warnings,
      ...heat.warnings,
      ...movement.warnings,
      ...loadout.warnings
    ];

    return {
      isValid: allErrors.length === 0,
      totalErrors: allErrors.length,
      totalWarnings: allWarnings.length,
      criticalIssues: allErrors.filter(e => e.severity === 'error'),
      recommendations: allWarnings.filter(w => w.severity === 'warning')
    };
  }

  /**
   * Validate weight distribution
   */
  validateWeightDistribution(config: UnitConfiguration, equipment: EquipmentItem[]): WeightDistributionResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const distribution = this.calculateWeightDistribution(config, equipment);
    const balance = this.calculateWeightBalance(distribution);

    if (balance < 0.7) {
      warnings.push({
        type: 'weightDistribution',
        message: 'Poor weight distribution',
        severity: 'warning',
        field: 'weightDistribution'
      });
      score -= 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      distribution,
      balance
    };
  }

  /**
   * Validate heat balance
   */
  validateHeatBalance(config: UnitConfiguration, equipment: EquipmentItem[]): HeatBalanceResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const heatGeneration = this.calculateHeatGeneration(equipment);
    const heatDissipation = this.calculateHeatDissipation(config);
    const balance = heatDissipation - heatGeneration;

    if (balance < 0) {
      errors.push({
        type: 'heatBalance',
        message: `Heat deficit of ${Math.abs(balance)} points`,
        severity: 'error',
        field: 'heatBalance'
      });
      score -= Math.min(40, Math.abs(balance) * 4);
    }

    return {
      isValid: balance >= 0,
      errors,
      warnings,
      score: Math.max(0, score),
      heatGeneration,
      heatDissipation,
      balance
    };
  }

  /**
   * Validate equipment compatibility
   */
  validateEquipmentCompatibility(equipment: EquipmentItem[], config: UnitConfiguration): EquipmentCompatibilityResult {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;

    const compatibleItems = equipment.filter(eq => this.isCompatible(eq, config));
    const incompatibleItems = equipment.filter(eq => !this.isCompatible(eq, config));

    if (incompatibleItems.length > 0) {
      errors.push({
        type: 'compatibility',
        message: `${incompatibleItems.length} incompatible components`,
        severity: 'error',
        field: 'compatibility'
      });
      score -= incompatibleItems.length * 5;
    }

    return {
      isValid: incompatibleItems.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      compatibleItems: compatibleItems.length,
      incompatibleItems
    };
  }

  // Helper methods
  private calculateTotalWeight(config: UnitConfiguration, equipment: EquipmentItem[]): number {
    const componentWeight = config.tonnage * 0.6; // Simplified
    const equipmentWeight = equipment.reduce((sum, eq) => {
      if (typeof eq.weight === 'number') return sum + eq.weight;
      return sum + (eq.tonnage || 0);
    }, 0);
    return componentWeight + equipmentWeight;
  }

  private calculateHeatGeneration(equipment: EquipmentItem[]): number {
    return equipment.reduce((sum, eq) => {
      if (typeof eq.heat === 'number') return sum + eq.heat;
      return sum + (eq.data?.heat || 0);
    }, 0);
  }

  private calculateHeatDissipation(config: UnitConfiguration): number {
    return (config.totalHeatSinks || 0) * 1; // Simplified
  }

  private getTotalAvailableSlots(config: UnitConfiguration): number {
    return config.tonnage * 2; // Simplified calculation
  }

  private checkMixedTech(equipment: EquipmentItem[]): {
    isMixed: boolean;
    innerSphereComponents: number;
    clanComponents: number;
    allowedMixed: boolean;
  } {
    const innerSphereComponents = equipment.filter(eq => {
      // Use safe property access
      return eq.techBase === 'Inner Sphere';
    }).length;
    
    const clanComponents = equipment.filter(eq => {
      return eq.techBase === 'Clan';
    }).length;
    
    const isMixed = innerSphereComponents > 0 && clanComponents > 0;
    const allowedMixed = false; // Simplified

    return {
      isMixed,
      innerSphereComponents,
      clanComponents,
      allowedMixed
    };
  }

  private calculateWeightDistribution(config: UnitConfiguration, equipment: EquipmentItem[]): WeightDistribution {
    return {
      engine: config.tonnage * 0.3,
      structure: config.tonnage * 0.1,
      armor: config.tonnage * 0.2,
      equipment: equipment.reduce((sum, eq) => {
        if (typeof eq.weight === 'number') return sum + eq.weight;
        return sum + (eq.tonnage || 0);
      }, 0)
    };
  }

  private calculateWeightBalance(distribution: WeightDistribution): number {
    const total = Object.values(distribution).reduce((sum: number, val: number) => sum + val, 0);
    return total > 0 ? Math.min(...Object.values(distribution)) / total : 0;
  }

  private isCompatible(equipment: EquipmentItem, config: UnitConfiguration): boolean {
    // Safe property access
    return equipment.techBase === config.techBase || !equipment.techBase;
  }
} 




