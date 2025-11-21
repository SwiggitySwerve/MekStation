/**
 * IValidationManager - Interface for core validation management operations
 * 
 * Defines the contract for validation managers following SOLID principles.
 * This interface ensures consistent behavior across all validation implementations.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number;
}

export interface ValidationError {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  field: string;
}

export interface WeightValidationResult extends ValidationResult {
  totalWeight: number;
  maxWeight: number;
  overweight: number;
}

export interface HeatValidationResult extends ValidationResult {
  heatGeneration: number;
  heatDissipation: number;
  heatDeficit: number;
}

export interface MovementValidationResult extends ValidationResult {
  walkMP: number;
  runMP: number;
  jumpMP: number;
}

export interface EquipmentValidationResult extends ValidationResult {
  weapons: EquipmentItem[];
  ammunition: EquipmentItem[];
  heatSinks: EquipmentItem[];
}

export interface WeaponValidationResult extends ValidationResult {
  weaponCount: number;
  totalWeaponWeight: number;
  heatGeneration: number;
}

export interface AmmoValidationResult extends ValidationResult {
  totalAmmoWeight: number;
  ammoBalance: AmmoBalanceCheck[];
  caseProtection: string[];
}

export interface CriticalSlotValidationResult extends ValidationResult {
  usedSlots: number;
  availableSlots: number;
  slotDeficit: number;
}

export interface TechLevelValidationResult extends ValidationResult {
  unitTechLevel: string;
  unitTechBase: string;
  era: string;
}

export interface MixedTechValidationResult extends ValidationResult {
  isMixed: boolean;
  innerSphereComponents: number;
  clanComponents: number;
  allowedMixed: boolean;
}

export interface EraValidationResult extends ValidationResult {
  era: string;
  invalidComponents: EquipmentItem[];
}

export interface WeightDistributionResult extends ValidationResult {
  distribution: WeightDistribution;
  balance: number;
}

export interface HeatBalanceResult extends ValidationResult {
  heatGeneration: number;
  heatDissipation: number;
  balance: number;
}

export interface EquipmentCompatibilityResult extends ValidationResult {
  compatibleItems: number;
  incompatibleItems: EquipmentItem[];
}

export interface EquipmentItem {
  type?: string;
  weight?: number;
  heat?: number;
  criticalSlots?: number;
  era?: string;
  weapon?: string;
  explosive?: boolean;
  location?: string;
  name?: string;
}

export interface AmmoBalanceCheck {
  weapon: string;
  tons: number;
  turns: number;
  adequate: boolean;
}

export interface WeightDistribution {
  [location: string]: number;
}

export interface ComplianceReport {
  overallCompliance: number;
  ruleCompliance: ValidationResult[];
  violationSummary: ValidationError[];
  recommendationSummary: ValidationError[];
  complianceMetrics: ComplianceMetrics;
}

export interface ComplianceMetrics {
  configuration: number;
  weight: number;
  heat: number;
  movement: number;
  loadout: number;
}

export interface ValidationSummary {
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  criticalIssues: ValidationError[];
  recommendations: ValidationError[];
}

export interface ComplianceScore {
  overallScore: number;
  categoryScores: ComplianceMetrics;
  penalties: ValidationError[];
  bonuses: ValidationError[];
}

export interface MixedTechCheck {
  isMixed: boolean;
  innerSphereComponents: number;
  clanComponents: number;
  allowedMixed: boolean;
}

/**
 * Core interface for validation management operations
 */
export interface IValidationManager {
  /**
   * Validate complete unit configuration
   */
  validateConfiguration(config: UnitConfiguration): ValidationResult;

  /**
   * Validate weight limits and distribution
   */
  validateWeightLimits(config: UnitConfiguration, equipment: EquipmentItem[]): WeightValidationResult;

  /**
   * Validate heat management
   */
  validateHeatManagement(config: UnitConfiguration, equipment: EquipmentItem[]): HeatValidationResult;

  /**
   * Validate movement rules
   */
  validateMovementRules(config: UnitConfiguration): MovementValidationResult;

  /**
   * Validate equipment loadout
   */
  validateEquipmentLoadout(equipment: EquipmentItem[], config: UnitConfiguration): EquipmentValidationResult;

  /**
   * Validate weapon rules
   */
  validateWeaponRules(equipment: EquipmentItem[], config: UnitConfiguration): WeaponValidationResult;

  /**
   * Validate ammunition rules
   */
  validateAmmoRules(equipment: EquipmentItem[], config: UnitConfiguration): AmmoValidationResult;

  /**
   * Validate critical slot rules
   */
  validateCriticalSlotRules(equipment: EquipmentItem[], config: UnitConfiguration): CriticalSlotValidationResult;

  /**
   * Validate tech level compliance
   */
  validateTechLevel(config: UnitConfiguration, equipment: EquipmentItem[]): TechLevelValidationResult;

  /**
   * Validate mixed tech rules
   */
  validateMixedTech(config: UnitConfiguration, equipment: EquipmentItem[]): MixedTechValidationResult;

  /**
   * Validate era restrictions
   */
  validateEraRestrictions(config: UnitConfiguration, equipment: EquipmentItem[]): EraValidationResult;

  /**
   * Validate weight distribution
   */
  validateWeightDistribution(config: UnitConfiguration, equipment: EquipmentItem[]): WeightDistributionResult;

  /**
   * Validate heat balance
   */
  validateHeatBalance(config: UnitConfiguration, equipment: EquipmentItem[]): HeatBalanceResult;

  /**
   * Validate equipment compatibility
   */
  validateEquipmentCompatibility(equipment: EquipmentItem[], config: UnitConfiguration): EquipmentCompatibilityResult;

  /**
   * Generate compliance report
   */
  generateComplianceReport(config: UnitConfiguration, equipment: EquipmentItem[]): ComplianceReport;

  /**
   * Calculate compliance score
   */
  calculateComplianceScore(config: UnitConfiguration, equipment: EquipmentItem[]): ComplianceScore;

  /**
   * Generate validation summary
   */
  generateValidationSummary(config: UnitConfiguration, equipment: EquipmentItem[]): ValidationSummary;
}

/**
 * Type guard to check if an object is a valid UnitConfiguration
 */
export function isValidUnitConfiguration(config: unknown): config is UnitConfiguration {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  
  const configObj = config as Record<string, unknown>;
  return 'tonnage' in configObj && 
         typeof configObj.tonnage === 'number' &&
         configObj.tonnage > 0;
}

/**
 * Type guard to check if an object is a valid EquipmentItem
 */
export function isValidEquipmentItem(item: unknown): item is EquipmentItem {
  return typeof item === 'object' && item !== null;
}

/**
 * Type guard to check if an array contains valid equipment items
 */
export function isValidEquipmentArray(equipment: unknown): equipment is EquipmentItem[] {
  return Array.isArray(equipment) && equipment.every(isValidEquipmentItem);
}




