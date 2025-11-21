/**
 * RuleManagementManager
 * Handles BattleTech rules definition, management, and rule compliance checking.
 * Extracted from ConstructionRulesValidator for modularity and SOLID compliance.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { calculateInternalHeatSinks } from '../../utils/heatSinkCalculations';
import { getMaxArmorPoints } from '../../utils/internalStructureTable';

export interface BattleTechRule {
  id: string;
  name: string;
  description: string;
  category: 'weight' | 'heat' | 'movement' | 'armor' | 'structure' | 'engine' | 'weapons' | 'equipment' | 'tech_level';
  severity: 'critical' | 'major' | 'minor';
  mandatory: boolean;
  validator: (config: UnitConfiguration, equipment?: any[]) => RuleComplianceResult;
}

export interface RuleComplianceResult {
  rule: BattleTechRule;
  compliant: boolean;
  score: number;
  violations: RuleViolation[];
  notes: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  component?: string;
  location?: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  impact: string;
  suggestedFix: string;
}

export interface RuleScore {
  overallScore: number;
  categoryScores: { [category: string]: number };
  componentScores: { [component: string]: number };
  penalties: ScorePenalty[];
  bonuses: ScoreBonus[];
}

export interface ScorePenalty {
  rule: string;
  penalty: number;
  reason: string;
}

export interface ScoreBonus {
  feature: string;
  bonus: number;
  reason: string;
}

export class RuleManagementManager {
  private readonly BATTLETECH_RULES: BattleTechRule[] = [
    // Weight rules
    {
      id: 'WEIGHT_001',
      name: 'Total Weight Limit',
      description: 'Unit must not exceed maximum tonnage',
      category: 'weight',
      severity: 'critical',
      mandatory: true,
      validator: this.validateTotalWeight.bind(this)
    },
    {
      id: 'WEIGHT_002',
      name: 'Minimum Weight',
      description: 'Unit must meet minimum weight requirements',
      category: 'weight',
      severity: 'major',
      mandatory: true,
      validator: this.validateMinimumWeight.bind(this)
    },
    {
      id: 'WEIGHT_003',
      name: 'Weight Distribution',
      description: 'Weight must be properly distributed across components',
      category: 'weight',
      severity: 'minor',
      mandatory: false,
      validator: this.validateWeightDistribution.bind(this)
    },

    // Heat rules
    {
      id: 'HEAT_001',
      name: 'Heat Sink Requirements',
      description: 'Must have sufficient heat sinks for heat generation',
      category: 'heat',
      severity: 'critical',
      mandatory: true,
      validator: this.validateHeatSinks.bind(this)
    },
    {
      id: 'HEAT_002',
      name: 'Heat Sink Type Compatibility',
      description: 'Heat sink types must be compatible with engine',
      category: 'heat',
      severity: 'major',
      mandatory: true,
      validator: this.validateHeatSinkCompatibility.bind(this)
    },

    // Movement rules
    {
      id: 'MOVEMENT_001',
      name: 'Engine Rating',
      description: 'Engine rating must be appropriate for unit tonnage and desired movement',
      category: 'movement',
      severity: 'critical',
      mandatory: true,
      validator: this.validateEngineRating.bind(this)
    },
    {
      id: 'MOVEMENT_002',
      name: 'Jump Jet Limits',
      description: 'Jump jets must not exceed maximum allowed for unit type',
      category: 'movement',
      severity: 'major',
      mandatory: true,
      validator: this.validateJumpJetLimits.bind(this)
    },

    // Armor rules
    {
      id: 'ARMOR_001',
      name: 'Maximum Armor',
      description: 'Armor must not exceed maximum allowed for unit type',
      category: 'armor',
      severity: 'critical',
      mandatory: true,
      validator: this.validateMaximumArmor.bind(this)
    },
    {
      id: 'ARMOR_002',
      name: 'Armor Type Compatibility',
      description: 'Armor type must be compatible with unit configuration',
      category: 'armor',
      severity: 'major',
      mandatory: true,
      validator: this.validateArmorTypeCompatibility.bind(this)
    },

    // Structure rules
    {
      id: 'STRUCTURE_001',
      name: 'Structure Type Compatibility',
      description: 'Structure type must be compatible with unit tonnage and era',
      category: 'structure',
      severity: 'major',
      mandatory: true,
      validator: this.validateStructureType.bind(this)
    },

    // Engine rules
    {
      id: 'ENGINE_001',
      name: 'Engine Type Compatibility',
      description: 'Engine type must be compatible with unit configuration',
      category: 'engine',
      severity: 'major',
      mandatory: true,
      validator: this.validateEngineType.bind(this)
    },

    // Gyro rules
    {
      id: 'GYRO_001',
      name: 'Gyro Compatibility',
      description: 'Gyro must be compatible with engine type',
      category: 'engine',
      severity: 'major',
      mandatory: true,
      validator: this.validateGyroCompatibility.bind(this)
    },

    // Tech level rules
    {
      id: 'TECH_001',
      name: 'Tech Level Consistency',
      description: 'All components must be consistent with unit tech level',
      category: 'tech_level',
      severity: 'major',
      mandatory: true,
      validator: this.validateTechLevelConsistency.bind(this)
    },
    {
      id: 'TECH_002',
      name: 'Era Restrictions',
      description: 'Components must be available in the specified era',
      category: 'tech_level',
      severity: 'minor',
      mandatory: false,
      validator: this.validateEraRestrictions.bind(this)
    }
  ];

  /**
   * Get all BattleTech rules
   */
  getAllRules(): BattleTechRule[] {
    return [...this.BATTLETECH_RULES];
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): BattleTechRule[] {
    return this.BATTLETECH_RULES.filter(rule => rule.category === category);
  }

  /**
   * Get rules by severity
   */
  getRulesBySeverity(severity: string): BattleTechRule[] {
    return this.BATTLETECH_RULES.filter(rule => rule.severity === severity);
  }

  /**
   * Get mandatory rules
   */
  getMandatoryRules(): BattleTechRule[] {
    return this.BATTLETECH_RULES.filter(rule => rule.mandatory);
  }

  /**
   * Check rule compliance
   */
  checkRuleCompliance(rule: BattleTechRule, config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    try {
      return rule.validator(config, equipment);
    } catch (error) {
      return {
        rule,
        compliant: false,
        score: 0,
        violations: [{
          ruleId: rule.id,
          ruleName: rule.name,
          description: `Error validating rule: ${error}`,
          severity: 'critical',
          impact: 'Validation failed',
          suggestedFix: 'Check unit configuration and equipment'
        }],
        notes: `Validation error: ${error}`
      };
    }
  }

  /**
   * Check all rules compliance
   */
  checkAllRulesCompliance(config: UnitConfiguration, equipment: any[]): RuleComplianceResult[] {
    return this.BATTLETECH_RULES.map(rule => this.checkRuleCompliance(rule, config, equipment));
  }

  /**
   * Calculate rule score
   */
  calculateRuleScore(config: UnitConfiguration, equipment: any[]): RuleScore {
    const complianceResults = this.checkAllRulesCompliance(config, equipment);
    const categoryScores: { [category: string]: number } = {};
    const componentScores: { [component: string]: number } = {};
    const penalties: ScorePenalty[] = [];
    const bonuses: ScoreBonus[] = [];

    let totalScore = 100;

    // Group by category
    const categories = ['weight', 'heat', 'movement', 'armor', 'structure', 'engine', 'weapons', 'equipment', 'tech_level'];
    categories.forEach(category => {
      const categoryRules = complianceResults.filter(result => result.rule.category === category);
      const categoryScore = this.calculateCategoryScore(categoryRules);
      categoryScores[category] = categoryScore;
    });

    // Calculate penalties and bonuses
    complianceResults.forEach(result => {
      if (!result.compliant) {
        const penalty = this.getSeverityPenalty(result.rule.severity);
        penalties.push({
          rule: result.rule.name,
          penalty,
          reason: result.violations[0]?.description || 'Rule violation'
        });
      } else {
        const bonus = this.getComplianceBonus(result.rule.severity);
        bonuses.push({
          feature: result.rule.name,
          bonus,
          reason: 'Rule compliance'
        });
      }
    });

    // Apply bonuses first
    bonuses.forEach(bonus => {
      totalScore += bonus.bonus;
    });

    // Cap at 100 after bonuses
    totalScore = Math.min(100, totalScore);

    // Apply penalties after bonuses
    penalties.forEach(penalty => {
      totalScore -= penalty.penalty;
    });

    // Final cap at 0
    totalScore = Math.max(0, totalScore);

    return {
      overallScore: totalScore,
      categoryScores,
      componentScores,
      penalties,
      bonuses
    };
  }

  /**
   * Validate total weight
   */
  private validateTotalWeight(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const maxWeight = config.tonnage;
    const compliant = totalWeight <= maxWeight;
    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'WEIGHT_001')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'WEIGHT_001',
        ruleName: 'Total Weight Limit',
        description: `Total weight ${totalWeight.toFixed(1)} tons exceeds maximum ${maxWeight} tons`,
        severity: 'critical',
        impact: 'Unit is overweight',
        suggestedFix: 'Reduce equipment weight or increase tonnage'
      }],
      notes: `Total weight: ${totalWeight.toFixed(1)}/${maxWeight} tons`
    };
  }

  /**
   * Validate minimum weight
   */
  private validateMinimumWeight(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const minWeight = config.tonnage * 0.95; // 95% of tonnage
    const compliant = totalWeight >= minWeight;

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'WEIGHT_002')!,
      compliant,
      score: compliant ? 100 : 50,
      violations: compliant ? [] : [{
        ruleId: 'WEIGHT_002',
        ruleName: 'Minimum Weight',
        description: `Total weight ${totalWeight.toFixed(1)} tons is below minimum ${minWeight.toFixed(1)} tons`,
        severity: 'major',
        impact: 'Unit is underweight',
        suggestedFix: 'Add more equipment or reduce tonnage'
      }],
      notes: `Total weight: ${totalWeight.toFixed(1)}/${minWeight.toFixed(1)} tons`
    };
  }

  /**
   * Validate weight distribution
   */
  private validateWeightDistribution(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    // Simplified weight distribution validation
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const engineWeight = this.calculateEngineWeight(config.engineRating, this.extractComponentType(config.engineType));
    const enginePercentage = (engineWeight / totalWeight) * 100;
    const compliant = enginePercentage <= 50; // Engine should not exceed 50% of total weight

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'WEIGHT_003')!,
      compliant,
      score: compliant ? 100 : 75,
      violations: compliant ? [] : [{
        ruleId: 'WEIGHT_003',
        ruleName: 'Weight Distribution',
        description: `Engine weight ${enginePercentage.toFixed(1)}% is excessive`,
        severity: 'minor',
        impact: 'Poor weight distribution',
        suggestedFix: 'Consider lighter engine or larger unit'
      }],
      notes: `Engine weight: ${enginePercentage.toFixed(1)}% of total`
    };
  }

  /**
   * Validate heat sinks
   */
  private validateHeatSinks(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const heatGeneration = this.calculateHeatGeneration(equipment);
    const engineHeatSinks = this.getEngineHeatSinks(config);
    const externalHeatSinks = this.getExternalHeatSinks(equipment);
    const totalHeatSinks = engineHeatSinks + externalHeatSinks;
    const compliant = totalHeatSinks >= heatGeneration;

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'HEAT_001')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'HEAT_001',
        ruleName: 'Heat Sink Requirements',
        description: `Heat generation ${heatGeneration} exceeds heat sinks ${totalHeatSinks}`,
        severity: 'critical',
        impact: 'Insufficient heat dissipation',
        suggestedFix: 'Add more heat sinks or reduce heat-generating equipment'
      }],
      notes: `Heat: ${heatGeneration}/${totalHeatSinks}`
    };
  }

  /**
   * Validate heat sink compatibility
   */
  private validateHeatSinkCompatibility(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const engineType = this.extractComponentType(config.engineType);
    const hasDoubleHeatSinks = equipment.some(item => item.type === 'heat_sink' && item.name.includes('Double'));
    const compliant = !(engineType === 'ICE' && hasDoubleHeatSinks); // ICE engines can't use double heat sinks

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'HEAT_002')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'HEAT_002',
        ruleName: 'Heat Sink Type Compatibility',
        description: 'ICE engines cannot use double heat sinks',
        severity: 'major',
        impact: 'Invalid heat sink configuration',
        suggestedFix: 'Use single heat sinks with ICE engine'
      }],
      notes: `Engine: ${engineType}, Heat Sinks: ${hasDoubleHeatSinks ? 'Double' : 'Single'}`
    };
  }

  /**
   * Validate engine rating
   */
  private validateEngineRating(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const engineRating = config.engineRating;
    const tonnage = config.tonnage;
    const walkMP = Math.floor(engineRating / tonnage);
    const compliant = walkMP >= 1 && walkMP <= 10; // Reasonable movement range

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'MOVEMENT_001')!,
      compliant,
      score: compliant ? 100 : 50,
      violations: compliant ? [] : [{
        ruleId: 'MOVEMENT_001',
        ruleName: 'Engine Rating',
        description: `Engine rating ${engineRating} results in walk MP ${walkMP} (should be 1-10)`,
        severity: 'critical',
        impact: 'Invalid movement profile',
        suggestedFix: 'Adjust engine rating for desired movement'
      }],
      notes: `Engine: ${engineRating}, Walk MP: ${walkMP}`
    };
  }

  /**
   * Validate jump jet limits
   */
  private validateJumpJetLimits(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const jumpJets = equipment.filter(item => item.type === 'jump_jet');
    const jumpJetCount = jumpJets.length;
    const maxJumpJets = Math.floor(config.tonnage / 5); // 1 jump jet per 5 tons
    const compliant = jumpJetCount <= maxJumpJets;

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'MOVEMENT_002')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'MOVEMENT_002',
        ruleName: 'Jump Jet Limits',
        description: `Jump jets ${jumpJetCount} exceed maximum ${maxJumpJets}`,
        severity: 'major',
        impact: 'Too many jump jets',
        suggestedFix: 'Reduce number of jump jets'
      }],
      notes: `Jump Jets: ${jumpJetCount}/${maxJumpJets}`
    };
  }

  /**
   * Validate maximum armor
   */
  private validateMaximumArmor(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const maxArmor = getMaxArmorPoints(config.tonnage);
    const totalArmor = this.calculateTotalArmor(config, equipment);
    const compliant = totalArmor <= maxArmor;

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'ARMOR_001')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'ARMOR_001',
        ruleName: 'Maximum Armor',
        description: `Armor ${totalArmor} exceeds maximum ${maxArmor}`,
        severity: 'critical',
        impact: 'Too much armor',
        suggestedFix: 'Reduce armor allocation'
      }],
      notes: `Armor: ${totalArmor}/${maxArmor}`
    };
  }

  /**
   * Validate armor type compatibility
   */
  private validateArmorTypeCompatibility(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const armorType = this.extractComponentType(config.armorType);
    const validTypes = ['Standard', 'Ferro-Fibrous', 'Ferro-Fibrous (Clan)', 'Light Ferro-Fibrous', 'Heavy Ferro-Fibrous'];
    const compliant = validTypes.includes(armorType);

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'ARMOR_002')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'ARMOR_002',
        ruleName: 'Armor Type Compatibility',
        description: `Invalid armor type: ${armorType}`,
        severity: 'major',
        impact: 'Invalid armor configuration',
        suggestedFix: 'Use valid armor type'
      }],
      notes: `Armor Type: ${armorType}`
    };
  }

  /**
   * Validate structure type
   */
  private validateStructureType(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const structureType = this.extractComponentType(config.structureType);
    const validTypes = ['Standard', 'Endo Steel', 'Endo Steel (Clan)'];
    const compliant = validTypes.includes(structureType);

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'STRUCTURE_001')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'STRUCTURE_001',
        ruleName: 'Structure Type Compatibility',
        description: `Invalid structure type: ${structureType}`,
        severity: 'major',
        impact: 'Invalid structure configuration',
        suggestedFix: 'Use valid structure type'
      }],
      notes: `Structure Type: ${structureType}`
    };
  }

  /**
   * Validate engine type
   */
  private validateEngineType(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const engineType = this.extractComponentType(config.engineType);
    const validTypes = ['Standard', 'XL', 'XL (IS)', 'XL (Clan)', 'Light', 'XXL', 'Compact', 'ICE', 'Fuel Cell'];
    const compliant = validTypes.includes(engineType);

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'ENGINE_001')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'ENGINE_001',
        ruleName: 'Engine Type Compatibility',
        description: `Invalid engine type: ${engineType}`,
        severity: 'major',
        impact: 'Invalid engine configuration',
        suggestedFix: 'Use valid engine type'
      }],
      notes: `Engine Type: ${engineType}`
    };
  }

  /**
   * Validate gyro compatibility
   */
  private validateGyroCompatibility(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    const gyroType = this.extractComponentType(config.gyroType);
    const engineType = this.extractComponentType(config.engineType);
    const compliant = this.isGyroEngineCompatible(gyroType, engineType);

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'GYRO_001')!,
      compliant,
      score: compliant ? 100 : 0,
      violations: compliant ? [] : [{
        ruleId: 'GYRO_001',
        ruleName: 'Gyro Compatibility',
        description: `Gyro ${gyroType} incompatible with engine ${engineType}`,
        severity: 'major',
        impact: 'Invalid gyro configuration',
        suggestedFix: 'Use compatible gyro type'
      }],
      notes: `Gyro: ${gyroType}, Engine: ${engineType}`
    };
  }

  /**
   * Validate tech level consistency
   */
  private validateTechLevelConsistency(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    // Simplified tech level validation
    const unitTechBase = config.techBase || 'Inner Sphere';
    // Only allow 'Inner Sphere' or 'Clan' as valid tech bases
    if (unitTechBase !== 'Inner Sphere' && unitTechBase !== 'Clan') {
      return {
        rule: this.BATTLETECH_RULES.find(r => r.id === 'TECH_001')!,
        compliant: false,
        score: 50,
        violations: [{
          ruleId: 'TECH_001',
          ruleName: 'Tech Base Consistency',
          description: 'Invalid tech base',
          severity: 'major',
          impact: 'Inconsistent tech base',
          suggestedFix: 'Use a valid tech base for all components'
        }],
        notes: 'Invalid tech base detected'
      };
    }
    const hasClanEquipment = equipment.some(item => item.techBase === 'Clan');
    const hasISEquipment = equipment.some(item => item.techBase === 'IS');
    const isMixed = hasClanEquipment && hasISEquipment;
    const compliant = !isMixed;

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'TECH_001')!,
      compliant,
      score: compliant ? 100 : 50,
      violations: compliant ? [] : [{
        ruleId: 'TECH_001',
        ruleName: 'Tech Level Consistency',
        description: 'Mixed tech components are not allowed',
        severity: 'major',
        impact: 'Tech level inconsistency',
        suggestedFix: 'Use consistent tech base for all components'
      }],
      notes: `Tech Base: ${unitTechBase}, Mixed: ${isMixed}`
    };
  }

  /**
   * Validate era restrictions
   */
  private validateEraRestrictions(config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    equipment = equipment || [];
    // Simplified era validation - type-safe era property access
    const configWithEra = config as UnitConfiguration & { era?: string };
    const era = configWithEra.era || 'Succession Wars';
    const hasAdvancedEquipment = equipment.some(item => item.era && item.era !== 'Succession Wars');
    const compliant = !hasAdvancedEquipment || era !== 'Succession Wars';

    return {
      rule: this.BATTLETECH_RULES.find(r => r.id === 'TECH_002')!,
      compliant,
      score: compliant ? 100 : 75,
      violations: compliant ? [] : [{
        ruleId: 'TECH_002',
        ruleName: 'Era Restrictions',
        description: 'Advanced equipment not available in Succession Wars era',
        severity: 'minor',
        impact: 'Era restriction violation',
        suggestedFix: 'Use era-appropriate equipment or change era'
      }],
      notes: `Era: ${era}, Advanced Equipment: ${hasAdvancedEquipment}`
    };
  }

  /**
   * Calculate category score
   */
  private calculateCategoryScore(results: RuleComplianceResult[]): number {
    if (results.length === 0) return 100;
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / results.length);
  }

  /**
   * Get severity penalty
   */
  private getSeverityPenalty(severity: string): number {
    switch (severity) {
      case 'critical': return 20;
      case 'major': return 10;
      case 'minor': return 5;
      default: return 0;
    }
  }

  /**
   * Get compliance bonus
   */
  private getComplianceBonus(severity: string): number {
    switch (severity) {
      case 'critical': return 5;
      case 'major': return 3;
      case 'minor': return 1;
      default: return 0;
    }
  }

  /**
   * Extract component type
   */
  private extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') {
      return component;
    }
    return component.type;
  }

  /**
   * Calculate total weight
   */
  private calculateTotalWeight(config: UnitConfiguration, equipment?: any[]): number {
    equipment = equipment || [];
    const structureWeight = this.calculateStructureWeight(config.tonnage, this.extractComponentType(config.structureType));
    const armorWeight = this.calculateArmorWeight(this.calculateMaxArmor(config.tonnage), this.extractComponentType(config.armorType));
    const engineWeight = this.calculateEngineWeight(config.engineRating, this.extractComponentType(config.engineType));
    const gyroWeight = this.calculateGyroWeight(config.engineRating, this.extractComponentType(config.gyroType));
    // Type-safe cockpit type access
    const configWithCockpit = config as UnitConfiguration & { cockpitType?: string };
    const cockpitWeight = this.calculateCockpitWeight(this.extractComponentType(configWithCockpit.cockpitType || 'Standard'));
    const equipmentWeight = equipment.reduce((sum, item) => sum + (item.weight || 0), 0);
    const total = structureWeight + armorWeight + engineWeight + gyroWeight + cockpitWeight + equipmentWeight;
    return total;
  }

  /**
   * Calculate heat generation
   */
  private calculateHeatGeneration(equipment: any[]): number {
    return equipment.reduce((sum, item) => sum + (item.heat || 0), 0);
  }

  /**
   * Get engine heat sinks
   */
  private getEngineHeatSinks(config: UnitConfiguration): number {
    const engineRating = config.engineRating;
    const { calculateInternalHeatSinksForEngine } = require('../../utils/heatSinkCalculations');
    return calculateInternalHeatSinksForEngine(engineRating, 'Standard');
  }

  /**
   * Get external heat sinks
   */
  private getExternalHeatSinks(equipment: any[]): number {
    return equipment.filter(item => item.type === 'heat_sink').length;
  }

  /**
   * Calculate max armor
   */
  private calculateMaxArmor(tonnage: number): number {
    return getMaxArmorPoints(tonnage);
  }

  /**
   * Calculate total armor
   */
  private calculateTotalArmor(config: UnitConfiguration, equipment: any[]): number {
    // Simplified armor calculation
    return this.calculateMaxArmor(config.tonnage) * 0.8; // Assume 80% armor allocation
  }

  /**
   * Calculate structure weight
   */
  private calculateStructureWeight(tonnage: number, structureType: string): number {
    const baseWeight = tonnage * 0.1; // 10% of tonnage
    if (structureType === 'Endo Steel' || structureType === 'Endo Steel (Clan)') {
      return baseWeight * 0.5; // Endo Steel is lighter
    }
    return baseWeight;
  }

  /**
   * Calculate armor weight
   */
  private calculateArmorWeight(totalArmor: number, armorType: string): number {
    const baseWeight = totalArmor * 0.0625; // 1/16 ton per point
    if (armorType === 'Ferro-Fibrous' || armorType === 'Ferro-Fibrous (Clan)') {
      return baseWeight * 0.84; // Ferro-Fibrous is lighter
    }
    return baseWeight;
  }

  /**
   * Calculate engine weight
   */
  private calculateEngineWeight(engineRating: number, engineType: string): number {
    const { calculateEngineWeight } = require('../../types/systemComponents');
    // Type-safe engine type validation with fallback
    const validEngineTypes = ['Standard', 'XL', 'Light', 'Compact', 'XXL', 'ICE', 'Fuel Cell'];
    const safeEngineType = validEngineTypes.includes(engineType) ? engineType : 'Standard';
    return calculateEngineWeight(engineRating, 100, safeEngineType);
  }

  /**
   * Calculate gyro weight
   */
  private calculateGyroWeight(engineRating: number, gyroType: string): number {
    const baseWeight = engineRating * 0.01; // 1% of engine rating
    switch (gyroType) {
      case 'XL':
        return baseWeight * 0.5;
      case 'Compact':
        return baseWeight * 1.5;
      case 'Heavy-Duty':
        return baseWeight * 2;
      default:
        return baseWeight;
    }
  }

  /**
   * Calculate cockpit weight
   */
  private calculateCockpitWeight(cockpitType: string): number {
    switch (cockpitType) {
      case 'Small':
        return 2;
      case 'Torso-Mounted':
        return 4;
      default:
        return 3; // Standard cockpit
    }
  }

  /**
   * Check gyro-engine compatibility
   */
  private isGyroEngineCompatible(gyroType: string, engineType?: string): boolean {
    // Simplified compatibility check
    if (gyroType === 'XL' && engineType === 'ICE') {
      return false; // XL gyro not compatible with ICE engine
    }
    return true;
  }
} 




