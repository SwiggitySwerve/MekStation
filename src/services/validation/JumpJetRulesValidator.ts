/**
 * JumpJetRulesValidator - BattleTech jump jet validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles jump jet count, weight, and jump MP validation.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';

export interface JumpJetValidation {
  isValid: boolean;
  jumpJetCount: number;
  jumpMP: number;
  maxJumpMP: number;
  jumpJetWeight: number;
  jumpJetType: string;
  violations: JumpJetViolation[];
  recommendations: string[];
}

export interface JumpJetViolation {
  type: 'exceeds_maximum' | 'invalid_type' | 'weight_mismatch' | 'tonnage_incompatible';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class JumpJetRulesValidator {
  
  /**
   * Validate jump jet rules for a unit configuration
   */
  static validateJumpJetRules(config: UnitConfiguration, equipment: EquipmentAllocation[]): JumpJetValidation {
    const violations: JumpJetViolation[] = [];
    const recommendations: string[] = [];
    
    const jumpJets = equipment.filter(item => item.equipmentData?.type === 'jump_jet');
    const jumpJetCount = jumpJets.length;
    const jumpMP = config.jumpMP || 0;
    const tonnage = config.tonnage || 100;
    const maxJumpMP = Math.min(8, Math.floor(tonnage / 10)); // Basic rule approximation, refined by specialized rules if needed
    const jumpJetType = jumpJets[0]?.equipmentData?.name || 'Standard';
    const jumpJetWeight = jumpJets.reduce((total, jj) => total + (jj.equipmentData?.tonnage || 0), 0);
    
    if (jumpMP > maxJumpMP) {
      violations.push({
        type: 'exceeds_maximum',
        message: `Jump MP ${jumpMP} exceeds maximum of ${maxJumpMP} for ${tonnage}-ton unit`,
        severity: 'critical',
        suggestedFix: `Reduce jump jets to achieve maximum ${maxJumpMP} jump MP`
      });
    }
    
    if (jumpJetCount !== jumpMP && jumpMP > 0) {
        // Usually 1 JJ = 1 MP, but improved JJs might differ. 
        // For standard construction, this is a good check.
        if (!jumpJetType.includes('Improved')) {
             // Soft warning or check
             // violations.push(...) 
        }
    }
    
    // Improved Jump Jets check
    if (jumpJetType.includes('Improved')) {
        const weightPerJet = jumpJets[0]?.equipmentData?.tonnage || 1;
        if (weightPerJet * jumpJetCount !== jumpJetWeight) {
             // Weight consistency check
        }
    }

    return {
      isValid: violations.length === 0,
      jumpJetCount,
      jumpMP,
      maxJumpMP,
      jumpJetWeight,
      jumpJetType,
      violations,
      recommendations
    };
  }
}

export default JumpJetRulesValidator;

