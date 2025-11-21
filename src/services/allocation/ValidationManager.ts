/**
 * Validation Manager
 * Handles equipment placement validation, tech level validation, and BattleTech rule compliance
 * Extracted from EquipmentAllocationService.ts for better organization
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  RuleComplianceResult, 
  RuleViolation, 
  TechLevelIssue, 
  MountingIssue, 
  ComplianceSuggestion, 
  TechLevelValidation, 
  MountingValidation, 
  MountingRestriction, 
  MountingRequirement, 
  PlacementValidation, 
  PlacementError, 
  PlacementWarning, 
  EquipmentPlacement, 
  EquipmentConstraints 
} from './types/AllocationTypes';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';
import { SystemComponentRules } from '../../utils/criticalSlots/SystemComponentRules';
import { ComponentConfiguration } from '../../types/componentConfiguration';

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
    
    // Simplified check - ideally would check location-specific CASE
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

  /**
   * Validate individual placement logic
   * Extracted from EquipmentAllocationService.validatePlacement
   */
  validatePlacement(equipment: EquipmentAllocation, location: string, config: UnitConfiguration): PlacementValidation {
    const errors: PlacementError[] = [];
    const warnings: PlacementWarning[] = [];
    const restrictions: string[] = [];
    const suggestions: string[] = [];
 
    const normalizeLoc = (loc: string): string => {
      const key = loc.replace(/\s+/g, '').toLowerCase();
      switch (key) {
        case 'head': return 'head';
        case 'centertorso': return 'centerTorso';
        case 'lefttorso': return 'leftTorso';
        case 'righttorso': return 'rightTorso';
        case 'leftarm': return 'leftArm';
        case 'rightarm': return 'rightArm';
        case 'leftleg': return 'leftLeg';
        case 'rightleg': return 'rightLeg';
        default: return loc;
      }
    };

    const constraints = this.getEquipmentConstraints(equipment);
    const locKey = normalizeLoc(location);
 
    
    // Check location restrictions
    if (constraints.forbiddenLocations.includes(locKey)) {
      errors.push({
        type: 'location_invalid',
        message: `${equipment.equipmentData?.name} cannot be mounted in ${location}`,
        severity: 'critical',
        suggestedFix: `Try mounting in: ${constraints.allowedLocations.join(', ')}`
      });
    }
    // Enforce allowed locations
    if (!constraints.allowedLocations.includes(locKey)) {
      errors.push({
        type: 'location_invalid',
        message: `${equipment.equipmentData?.name} cannot be mounted in ${location}`,
        severity: 'critical',
        suggestedFix: `Allowed locations: ${constraints.allowedLocations.join(', ')}`
      });
    }
    
    // Special rule: Supercharger must be placed in a torso location that contains engine slots
    const eqName = (equipment.equipmentData?.name || '').toString().toLowerCase();
    // @ts-ignore - 'baseType' might not be on EquipmentObject, check data source
    const eqBaseType = (equipment.equipmentData?.baseType || '').toString().toLowerCase();
    const isSupercharger = eqName === 'supercharger' || eqBaseType === 'supercharger';
    if (isSupercharger) {
      const inCenter = locKey === 'centertorso';
      const inLeft = locKey === 'lefttorso';
      const inRight = locKey === 'righttorso';
      const engineType = config.engineType || 'Standard';
      const gyroType = config.gyroType || 'Standard';
      
      const engineSlots = SystemComponentRules.getEngineAllocation(engineType, gyroType);
      const hasEngineSlots = (
        (inCenter && engineSlots.centerTorso.length > 0) ||
        (inLeft && engineSlots.leftTorso.length > 0) ||
        (inRight && engineSlots.rightTorso.length > 0)
      );
      if (!hasEngineSlots) {
        errors.push({
          type: 'rule_violation',
          message: 'Supercharger must be placed in a torso location that contains engine slots',
          severity: 'critical',
          suggestedFix: 'Move Supercharger to Center, Left, or Right Torso containing engine slots for the current engine/gyro'
        });
      }
    }
 
     // Check weight restrictions
    if (locKey === 'head' && (equipment.equipmentData?.tonnage || 0) > 1) {
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
        suggestedFix: 'Adjust unit tech level or use alternative equipment'
      });
    }
    
    // Generate warnings for suboptimal placement
    if (equipment.equipmentData?.type === 'ammunition' && locKey === 'head') {
      warnings.push({
        type: 'vulnerability',
        message: 'Ammunition in head location is highly vulnerable',
        recommendation: 'Consider torso or leg placement with CASE protection',
        impact: 'high'
      });
    }

    // Artemis dependency: warn if no compatible missile weapons present
    const baseType = (equipment.equipmentData?.baseType || '').toString().toLowerCase();
    if (baseType.includes('artemis')) {
      const hasMissile = (config.weapons || []).some((w: any) => {
        const n = (w?.name || '').toString().toLowerCase();
        return n.includes('lrm') || n.includes('srm') || n.includes('mrm') || n.includes('streak');
      });
      if (!hasMissile) {
        warnings.push({
          type: 'dependency',
          message: 'Artemis installed without compatible missile weapons',
          recommendation: 'Add LRM/SRM/MRM/Streak missiles to benefit from Artemis',
          impact: 'low'
        });
      }
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
   * Re-implemented to match logic from EquipmentAllocationService
   */
  private getEquipmentConstraints(equipment: EquipmentAllocation): EquipmentConstraints {
    const type = equipment.equipmentData?.type || 'equipment';
    let allowedLocations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const forbiddenLocations: string[] = [];
    
    // Apply type-specific restrictions
    if (type === 'ammunition' && equipment.equipmentData?.explosive) {
      forbiddenLocations.push('head'); // No explosive ammo in head
    }
    
    if ((equipment.equipmentData?.tonnage || 0) > 1) {
      forbiddenLocations.push('head'); // No heavy equipment in head
    }

    // Targeting Computer: torso-only restriction
    // @ts-ignore - baseType check
    const baseType = (equipment.equipmentData?.baseType || '').toString().toLowerCase();
    if (baseType === 'targeting computer') {
      allowedLocations = ['centerTorso', 'leftTorso', 'rightTorso'];
    }

    // Common EW systems typically mount in torsos: ECM, Active Probe, TAG, C3
    if (
      baseType === 'guardian ecm' ||
      baseType === 'angel ecm' ||
      baseType === 'clan ecm suite' ||
      baseType === 'beagle active probe' ||
      baseType === 'clan active probe' ||
      baseType === 'bloodhound active probe' ||
      baseType === 'target acquisition gear' ||
      baseType === 'light target acquisition gear' ||
      baseType === 'c3 master computer' ||
      baseType === 'c3 slave unit'
    ) {
      allowedLocations = ['centerTorso', 'leftTorso', 'rightTorso'];
    }

    // Prototype Artemis IV: torso-only and requires compatible missile weapons (LRM/SRM/MRM/Streak)
    if (baseType === 'prototype artemis iv' || baseType === 'artemis iv') {
      allowedLocations = ['centerTorso', 'leftTorso', 'rightTorso'];
    }

    // Partial Wing: LT/RT only
    if (baseType === 'partial wing') {
      allowedLocations = ['leftTorso', 'rightTorso'];
      forbiddenLocations.push('centerTorso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg');
    }
    
    return {
      allowedLocations: allowedLocations.filter(loc => !forbiddenLocations.includes(loc)),
      forbiddenLocations,
      requiresCASE: type === 'ammunition' && (equipment.equipmentData?.explosive || false),
      requiresArtemis: false,
      minTonnageLocation: 0,
      maxTonnageLocation: 100,
      heatGeneration: equipment.equipmentData?.heat || 0,
      specialRules: []
    };
  }
} 
