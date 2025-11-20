/**
 * Validation Manager
 * Handles equipment placement validation, tech level validation, and BattleTech rule compliance
 * Extracted from EquipmentAllocationService.ts for better organization
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentPlacement, EquipmentConstraints } from '../../types/core/EquipmentPlacement';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  compliance: {
    battleTechRules: boolean;
    techLevel: boolean;
    mountingRules: boolean;
    weightLimits: boolean;
  };
  suggestions: string[];
}

export interface ValidationError {
  equipmentId: string;
  type: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  location?: string;
  suggestedFix: string;
}

export interface ValidationWarning {
  equipmentId: string;
  type: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface RuleComplianceResult {
  compliant: boolean;
  violations: RuleViolation[];
  techLevelIssues: TechLevelIssue[];
  mountingIssues: MountingIssue[];
  suggestions: ComplianceSuggestion[];
}

export interface RuleViolation {
  rule: string;
  description: string;
  affectedEquipment: string[];
  severity: 'critical' | 'major' | 'minor';
  resolution: string;
}

export interface TechLevelIssue {
  equipment: string;
  requiredTechLevel: string;
  currentTechLevel: string;
  era: string;
  canBeResolved: boolean;
  suggestion: string;
}

export interface MountingIssue {
  equipment: string;
  location: string;
  issue: string;
  restriction: string;
  alternatives: string[];
}

export interface ComplianceSuggestion {
  type: 'tech_level' | 'mounting' | 'rule_compliance';
  equipment: string;
  suggestion: string;
  impact: string;
}

export interface TechLevelValidation {
  isValid: boolean;
  issues: TechLevelIssue[];
  summary: {
    innerSphere: number;
    clan: number;
    mixed: boolean;
    era: string;
    techLevel: string;
  };
  recommendations: string[];
}

export interface MountingValidation {
  canMount: boolean;
  restrictions: MountingRestriction[];
  requirements: MountingRequirement[];
  alternatives: string[];
  warnings: string[];
}

export interface MountingRestriction {
  type: 'location' | 'tonnage' | 'heat' | 'ammunition' | 'special';
  description: string;
  severity: 'blocking' | 'warning';
}

export interface MountingRequirement {
  type: 'case' | 'artemis' | 'targeting_computer' | 'special';
  description: string;
  satisfied: boolean;
  suggestion?: string;
}

export class ValidationManager {
  /**
   * Validate equipment placement for BattleTech rules
   */
  validateEquipmentPlacement(config: UnitConfiguration, allocations: EquipmentPlacement[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    for (const allocation of allocations) {
      const validation = this.validatePlacement(allocation.equipment, allocation.location, config);
      
      if (!validation.isValid) {
        errors.push(...validation.errors.map((error) => ({
          equipmentId: allocation.equipmentId,
          type: error.type,
          message: error.message,
          severity: error.severity,
          location: allocation.location,
          suggestedFix: error.suggestedFix
        })));
      }
      
      warnings.push(...validation.warnings.map((warning) => ({
        equipmentId: allocation.equipmentId,
        type: warning.type,
        message: warning.message,
        impact: warning.impact,
        recommendation: warning.recommendation
      })));
    }
    
    const compliance = {
      battleTechRules: errors.filter(e => e.severity === 'critical').length === 0,
      techLevel: true, // Will be checked separately
      mountingRules: errors.filter(e => e.type === 'location_invalid').length === 0,
      weightLimits: errors.filter(e => e.type === 'weight_exceeded').length === 0
    };
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      compliance,
      suggestions
    };
  }
  
  /**
   * Check BattleTech rule compliance
   */
  checkBattleTechRules(config: UnitConfiguration, allocations: EquipmentPlacement[]): RuleComplianceResult {
    const violations: RuleViolation[] = [];
    const techLevelIssues: TechLevelIssue[] = [];
    const mountingIssues: MountingIssue[] = [];
    const suggestions: ComplianceSuggestion[] = [];
    
    // Check for explosive ammo in head
    const headAmmo = allocations.filter(a => 
      a.location === 'head' && a.equipment.equipmentData?.explosive
    );
    
    if (headAmmo.length > 0) {
      violations.push({
        rule: 'Head Ammunition Restriction',
        description: 'Explosive ammunition cannot be placed in head',
        affectedEquipment: headAmmo.map(a => a.equipment.equipmentData?.name || 'Unknown'),
        severity: 'critical',
        resolution: 'Move explosive ammunition to torso locations'
      });
    }
    
    // Check for CASE protection
    const explosiveAmmo = allocations.filter(a => a.equipment.equipmentData?.explosive);
    const caseEquipment = allocations.filter(a => a.equipment.equipmentData?.name === 'CASE');
    
    if (explosiveAmmo.length > 0 && caseEquipment.length === 0) {
      violations.push({
        rule: 'CASE Protection',
        description: 'Explosive ammunition should have CASE protection',
        affectedEquipment: explosiveAmmo.map(a => a.equipment.equipmentData?.name || 'Unknown'),
        severity: 'major',
        resolution: 'Add CASE to locations with explosive ammunition'
      });
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      techLevelIssues,
      mountingIssues,
      suggestions
    };
  }
  
  /**
   * Validate tech level compatibility
   */
  validateTechLevel(equipment: EquipmentAllocation[], config: UnitConfiguration): TechLevelValidation {
    const issues: TechLevelIssue[] = [];
    const recommendations: string[] = [];
    
    let innerSphereCount = 0;
    let clanCount = 0;
    
    for (const item of equipment) {
      const techBase = item.equipmentData?.techBase || 'Inner Sphere';
      const unitTechBase = config.techBase || 'Inner Sphere';
      
      if (techBase === 'Inner Sphere') {
        innerSphereCount++;
      } else if (techBase === 'Clan') {
        clanCount++;
      }
      
      // Check for tech base mismatches
      if (unitTechBase === 'Inner Sphere' && techBase === 'Clan') {
        issues.push({
          equipment: item.equipmentData?.name || 'Unknown',
          requiredTechLevel: 'Clan',
          currentTechLevel: 'Inner Sphere',
          era: 'Clan Invasion',
          canBeResolved: true,
          suggestion: 'Use Inner Sphere equivalent or change unit tech base'
        });
      }
    }
    
    const mixed = innerSphereCount > 0 && clanCount > 0;
    
    if (mixed && config.techBase !== 'Inner Sphere' && config.techBase !== 'Clan') {
      recommendations.push('Consider using Mixed tech base for Inner Sphere/Clan combinations');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      summary: {
        innerSphere: innerSphereCount,
        clan: clanCount,
        mixed,
        era: 'Clan Invasion', // Simplified
        techLevel: config.techBase || 'Inner Sphere'
      },
      recommendations
    };
  }
  
  /**
   * Validate mounting restrictions for equipment
   */
  validateMountingRestrictions(equipment: EquipmentAllocation, location: string, config: UnitConfiguration): MountingValidation {
    const restrictions: MountingRestriction[] = [];
    const requirements: MountingRequirement[] = [];
    const alternatives: string[] = [];
    const warnings: string[] = [];
    
    const constraints = this.getEquipmentConstraints(equipment);
    
    // Check location restrictions
    if (constraints.forbiddenLocations.includes(location)) {
      restrictions.push({
        type: 'location',
        description: `${equipment.equipmentData?.name} cannot be mounted in ${location}`,
        severity: 'blocking'
      });
    }
    
    // Check weight restrictions
    if (location === 'head' && (equipment.equipmentData?.tonnage || 0) > 1) {
      restrictions.push({
        type: 'tonnage',
        description: 'Head location limited to 1 ton equipment',
        severity: 'blocking'
      });
    }
    
    // Check CASE requirements
    if (equipment.equipmentData?.explosive) {
      requirements.push({
        type: 'case',
        description: 'Explosive ammunition requires CASE protection',
        satisfied: false, // Would need to check if CASE is present
        suggestion: 'Add CASE to this location'
      });
    }
    
    // Generate alternatives
    if (restrictions.length > 0) {
      alternatives.push(...constraints.allowedLocations.filter((loc: string) => loc !== location));
    }
    
    const canMount = restrictions.filter(r => r.severity === 'blocking').length === 0;
    
    return {
      canMount,
      restrictions,
      requirements,
      alternatives,
      warnings
    };
  }
  
  interface PlacementValidationError {
    type: string;
    message: string;
    severity: 'critical' | 'major' | 'minor';
    suggestedFix?: string;
  }

  interface PlacementValidationWarning {
    type: string;
    message: string;
    impact?: string;
    recommendation?: string;
  }

  interface PlacementValidationResult {
    isValid: boolean;
    errors: PlacementValidationError[];
    warnings: PlacementValidationWarning[];
    restrictions: string[];
    suggestions: string[];
  }

  /**
   * Validate individual placement
   */
  validatePlacement(equipment: EquipmentAllocation, location: string, config: UnitConfiguration): PlacementValidationResult {
    const errors: PlacementValidationError[] = [];
    const warnings: PlacementValidationWarning[] = [];
    const restrictions: string[] = [];
    const suggestions: string[] = [];
    
    const constraints = this.getEquipmentConstraints(equipment);
    
    // Check location restrictions
    if (constraints.forbiddenLocations.includes(location)) {
      errors.push({
        type: 'location_invalid',
        message: `${equipment.equipmentData?.name} cannot be mounted in ${location}`,
        severity: 'critical',
        suggestedFix: `Try mounting in: ${constraints.allowedLocations.join(', ')}`
      });
    }
    
    // Check weight restrictions
    if (location === 'head' && (equipment.equipmentData?.tonnage || 0) > 1) {
      errors.push({
        type: 'weight_exceeded',
        message: 'Head location limited to 1 ton equipment',
        severity: 'critical',
        suggestedFix: 'Move to torso or arm location'
      });
    }
    
    // Check tech level
    const techValidation = this.validateTechLevel([equipment], config);
    if (!techValidation.isValid) {
      errors.push({
        type: 'tech_level',
        message: techValidation.issues[0]?.equipment || 'Tech level mismatch',
        severity: 'major',
        suggestedFix: techValidation.issues[0]?.suggestion || 'Check tech level compatibility'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      restrictions,
      suggestions
    };
  }
  
  /**
   * Get equipment constraints
   */
  private getEquipmentConstraints(equipment: EquipmentAllocation): EquipmentConstraints {
    return {
      allowedLocations: ['leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'],
      forbiddenLocations: [],
      requiresCASE: equipment.equipmentData?.explosive || false,
      requiresArtemis: false,
      minTonnageLocation: 0,
      maxTonnageLocation: 100,
      heatGeneration: equipment.equipmentData?.heat || 0,
      specialRules: []
    };
  }
} 




