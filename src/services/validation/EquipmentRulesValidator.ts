/**
 * EquipmentRulesValidator - BattleTech equipment validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles special equipment validation, compatibility, and restrictions.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';
import { isWeapon, isHeatManagement } from '../../utils/equipmentTypeHelpers';

export interface SpecialEquipmentValidation {
  isValid: boolean;
  specialEquipment: SpecialEquipmentCheck[];
  violations: SpecialEquipmentViolation[];
  recommendations: string[];
}

export interface SpecialEquipmentCheck {
  equipment: string;
  isValid: boolean;
  requirements: string[];
  restrictions: string[];
  compatibility: string[];
}

export interface SpecialEquipmentViolation {
  equipment: string;
  type: 'missing_requirement' | 'restriction_violated' | 'incompatible_combination';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class EquipmentRulesValidator {
  
  /**
   * Validate special equipment rules for a unit configuration
   */
  static validateSpecialEquipmentRules(equipment: EquipmentAllocation[], config: UnitConfiguration): SpecialEquipmentValidation {
    const specialEquipment = equipment.filter(eq => {
      if (!eq.equipmentData) return false;
      const data = eq.equipmentData;
      return data.category === 'special' || 
             data.type === 'equipment' ||
             // Use safe check for type property on allocation itself
             ('type' in eq && eq.type === 'equipment');
    });
    
    const violations: SpecialEquipmentViolation[] = [];
    const recommendations: string[] = [];
    const specialEquipmentChecks: SpecialEquipmentCheck[] = [];
    
    specialEquipment.forEach((item, index) => {
      const equipData = item.equipmentData;
      if (!equipData) {
        violations.push({
          equipment: `special_equipment_${index}`,
          type: 'missing_requirement',
          message: 'Special equipment missing equipment data',
          severity: 'critical',
          suggestedFix: 'Ensure equipment has valid data'
        });
        return;
      }
      
      const equipmentName = equipData.name || `special_equipment_${index}`;
      
      // Use safe property access with type assertion or optional chaining
      const requirements = 'requirements' in equipData ? (equipData as { requirements: string[] }).requirements : [];
      const restrictions = 'restrictions' in equipData ? (equipData as { restrictions: string[] }).restrictions : [];
      const compatibility = 'compatibility' in equipData ? (equipData as { compatibility: string[] }).compatibility : [];
      
      // Check tech level compatibility
      const equipTechBase = equipData.techBase || 'Inner Sphere';
      const unitTechBase = config.techBase || 'Inner Sphere';
      
      // In Mixed tech mode, we allow mixing IS and Clan components
      if (unitTechBase !== 'Mixed' && equipTechBase === 'Clan' && unitTechBase === 'Inner Sphere') {
        violations.push({
          equipment: equipmentName,
          type: 'restriction_violated',
          message: `Clan equipment ${equipmentName} cannot be used on Inner Sphere unit`,
          severity: 'critical',
          suggestedFix: 'Use Inner Sphere equivalent or change unit tech base'
        });
      }
      
      // Check for conflicting equipment
      if (equipmentName.includes('Endo Steel') || equipmentName.includes('Ferro-Fibrous')) {
        const conflictingEquip = specialEquipment.find(other => 
          other !== item && (
            (equipmentName.includes('Endo Steel') && other.equipmentData?.name?.includes('Endo Steel')) ||
            (equipmentName.includes('Ferro-Fibrous') && other.equipmentData?.name?.includes('Ferro-Fibrous'))
          )
        );
        
        if (conflictingEquip) {
          violations.push({
            equipment: equipmentName,
            type: 'incompatible_combination',
            message: `Multiple instances of ${equipmentName.includes('Endo Steel') ? 'Endo Steel' : 'Ferro-Fibrous'} equipment detected`,
            severity: 'major',
            suggestedFix: 'Remove duplicate special equipment'
          });
        }
      }
      
      specialEquipmentChecks.push({
        equipment: equipmentName,
        isValid: true, // Simplified
        requirements,
        restrictions,
        compatibility
      });
    });
    
    // Add general recommendations
    if (specialEquipment.length === 0) {
      recommendations.push('Consider adding special equipment like Endo Steel or Ferro-Fibrous armor for weight savings');
    }
    
    return {
      isValid: violations.length === 0,
      specialEquipment: specialEquipmentChecks,
      violations,
      recommendations
    };
  }
}

export default EquipmentRulesValidator;

