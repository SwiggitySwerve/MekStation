import { EditableUnit, Quirk } from '../types/editor';
import { FullEquipment } from '../types/index';

export type BatchOperation = 
  | { type: 'addEquipment'; equipment: FullEquipment; location?: string }
  | { type: 'removeEquipment'; equipmentId: string }
  | { type: 'setArmor'; location: string; value: number; isRear?: boolean }
  | { type: 'addQuirk'; quirk: Quirk }
  | { type: 'removeQuirk'; quirkId: string }
  | { type: 'setArmorType'; armorTypeId: string }
  | { type: 'applyTemplate'; template: UnitTemplate };

export interface UnitTemplate {
  id: string;
  name: string;
  description: string;
  equipment: Array<{ equipment: FullEquipment; location: string }>;
  armor: { [location: string]: { front: number; rear?: number } };
  quirks: Quirk[];
  armorType?: string;
}

export interface BatchOperationResult {
  unitId: string;
  unitName: string;
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

export class BatchOperationsManager {
  // Apply a single operation to multiple units
  static applyOperation(
    units: EditableUnit[],
    operation: BatchOperation
  ): BatchOperationResult[] {
    return units.map(unit => {
      try {
        const result = this.applyOperationToUnit(unit, operation);
        return {
          unitId: unit.id,
          unitName: `${unit.chassis} ${unit.model}`,
          ...result
        };
      } catch (error) {
        return {
          unitId: unit.id,
          unitName: `${unit.chassis} ${unit.model}`,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        };
      }
    });
  }

  // Apply multiple operations to multiple units
  static applyBatchOperations(
    units: EditableUnit[],
    operations: BatchOperation[]
  ): BatchOperationResult[] {
    const results: BatchOperationResult[] = [];
    
    for (const unit of units) {
      const unitErrors: string[] = [];
      const unitWarnings: string[] = [];
      let success = true;

      for (const operation of operations) {
        try {
          const result = this.applyOperationToUnit(unit, operation);
          if (!result.success) {
            success = false;
            unitErrors.push(...(result.errors || []));
          }
          unitWarnings.push(...(result.warnings || []));
        } catch (error) {
          success = false;
          unitErrors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      results.push({
        unitId: unit.id,
        unitName: `${unit.chassis} ${unit.model}`,
        success,
        errors: unitErrors.length > 0 ? unitErrors : undefined,
        warnings: unitWarnings.length > 0 ? unitWarnings : undefined
      });
    }

    return results;
  }

  // Apply operation to a single unit
  private static applyOperationToUnit(
    unit: EditableUnit,
    operation: BatchOperation
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    switch (operation.type) {
      case 'addEquipment':
        return this.addEquipmentToUnit(unit, operation.equipment, operation.location);
      
      case 'removeEquipment':
        return this.removeEquipmentFromUnit(unit, operation.equipmentId);
      
      case 'setArmor':
        return this.setArmorOnUnit(unit, operation.location, operation.value, operation.isRear);
      
      case 'addQuirk':
        return this.addQuirkToUnit(unit, operation.quirk);
      
      case 'removeQuirk':
        return this.removeQuirkFromUnit(unit, operation.quirkId);
      
      case 'setArmorType':
        return this.setArmorTypeOnUnit(unit, operation.armorTypeId);
      
      case 'applyTemplate':
        return this.applyTemplateToUnit(unit, operation.template);
      
      default:
        return { success: false, errors: ['Unknown operation type'] };
    }
  }

  // Individual operation implementations
  private static addEquipmentToUnit(
    unit: EditableUnit,
    equipment: FullEquipment,
    location?: string
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    // Check weight limits
    const currentWeight = this.calculateTotalWeight(unit);
    const equipmentWeight = equipment.weight || equipment.data?.tons || equipment.data?.tonnage || 0;
    const newWeight = currentWeight + Number(equipmentWeight);
    
    if (newWeight > unit.mass) {
      return {
        success: false,
        errors: [`Adding ${equipment.name} would exceed weight limit`]
      };
    }

    // Add to unallocated equipment if no location specified
    if (!location) {
      unit.unallocatedEquipment = [...(unit.unallocatedEquipment || []), equipment];
    } else {
      // Validate location exists
      if (!unit.armorAllocation[location]) {
        return {
          success: false,
          errors: [`Invalid location: ${location}`]
        };
      }
      
      // Add to equipment placements
      unit.equipmentPlacements.push({
        id: `${Date.now()}-${Math.random()}`,
        equipment,
        location,
        criticalSlots: []
      });
    }

    return { success: true };
  }

  private static removeEquipmentFromUnit(
    unit: EditableUnit,
    equipmentId: string
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    // Remove from equipment placements
    const placementIndex = unit.equipmentPlacements.findIndex(
      p => p.equipment.id === equipmentId
    );
    
    if (placementIndex !== -1) {
      unit.equipmentPlacements.splice(placementIndex, 1);
      return { success: true };
    }

    // Remove from unallocated equipment
    const unallocatedIndex = unit.unallocatedEquipment?.findIndex(
      e => e.id === equipmentId
    ) ?? -1;
    
    if (unallocatedIndex !== -1) {
      unit.unallocatedEquipment?.splice(unallocatedIndex, 1);
      return { success: true };
    }

    return {
      success: false,
      errors: [`Equipment ${equipmentId} not found on unit`]
    };
  }

  private static setArmorOnUnit(
    unit: EditableUnit,
    location: string,
    value: number,
    isRear?: boolean
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    const armorLocation = unit.armorAllocation[location];
    
    if (!armorLocation) {
      return {
        success: false,
        errors: [`Invalid armor location: ${location}`]
      };
    }

    const maxArmor = isRear ? 
      Math.floor(armorLocation.maxArmor * 0.5) : // Rear armor limited to 50% of location max
      armorLocation.maxArmor;

    if (value > maxArmor) {
      return {
        success: false,
        errors: [`Armor value ${value} exceeds maximum ${maxArmor} for ${location} ${isRear ? 'rear' : 'front'}`]
      };
    }

    if (isRear && armorLocation.rear !== undefined) {
      armorLocation.rear = value;
    } else if (!isRear) {
      armorLocation.front = value;
    } else {
      return {
        success: false,
        errors: [`Location ${location} does not have rear armor`]
      };
    }

    return { success: true };
  }

  private static addQuirkToUnit(
    unit: EditableUnit,
    quirk: Quirk
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    // Check if quirk already exists
    if (unit.selectedQuirks.some(q => q.id === quirk.id)) {
      return {
        success: false,
        warnings: [`Quirk ${quirk.name} already present on unit`]
      };
    }

    // Check incompatibilities
    const incompatible = unit.selectedQuirks.find(
      q => q.incompatibleWith?.includes(quirk.id) || 
          quirk.incompatibleWith?.includes(q.id)
    );
    
    if (incompatible) {
      return {
        success: false,
        errors: [`Quirk ${quirk.name} is incompatible with ${incompatible.name}`]
      };
    }

    unit.selectedQuirks.push(quirk);
    return { success: true };
  }

  private static removeQuirkFromUnit(
    unit: EditableUnit,
    quirkId: string
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    const index = unit.selectedQuirks.findIndex(q => q.id === quirkId);
    
    if (index === -1) {
      return {
        success: false,
        errors: [`Quirk ${quirkId} not found on unit`]
      };
    }

    unit.selectedQuirks.splice(index, 1);
    return { success: true };
  }

  private static setArmorTypeOnUnit(
    unit: EditableUnit,
    armorTypeId: string
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    // This would need to validate the armor type exists and update all locations
    // For now, returning a placeholder
    return {
      success: false,
      errors: ['Armor type change not yet implemented']
    };
  }

  private static applyTemplateToUnit(
    unit: EditableUnit,
    template: UnitTemplate
  ): Omit<BatchOperationResult, 'unitId' | 'unitName'> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Apply equipment
    for (const item of template.equipment) {
      const result = this.addEquipmentToUnit(unit, item.equipment, item.location);
      if (!result.success) {
        errors.push(...(result.errors || []));
      }
    }

    // Apply armor
    for (const [location, armor] of Object.entries(template.armor)) {
      const frontResult = this.setArmorOnUnit(unit, location, armor.front, false);
      if (!frontResult.success) {
        errors.push(...(frontResult.errors || []));
      }
      
      if (armor.rear !== undefined) {
        const rearResult = this.setArmorOnUnit(unit, location, armor.rear, true);
        if (!rearResult.success) {
          errors.push(...(rearResult.errors || []));
        }
      }
    }

    // Apply quirks
    for (const quirk of template.quirks) {
      const result = this.addQuirkToUnit(unit, quirk);
      if (!result.success) {
        errors.push(...(result.errors || []));
      }
      warnings.push(...(result.warnings || []));
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Helper methods
  private static calculateTotalWeight(unit: EditableUnit): number {
    let totalWeight = 0;
    
    // Add equipment weight
    for (const placement of unit.equipmentPlacements) {
      const eqWeight = placement.equipment.weight || placement.equipment.data?.tons || placement.equipment.data?.tonnage || 0;
      totalWeight += Number(eqWeight);
    }
    
    // Add unallocated equipment weight
    for (const equipment of unit.unallocatedEquipment || []) {
      const eqWeight = equipment.weight || equipment.data?.tons || equipment.data?.tonnage || 0;
      totalWeight += Number(eqWeight);
    }
    
    // Add armor weight (simplified calculation)
    let totalArmorPoints = 0;
    for (const location of Object.values(unit.armorAllocation)) {
      totalArmorPoints += location.front + (location.rear || 0);
    }
    // Use a default armor points per ton if not specified
    const defaultPointsPerTon = 16;
    totalWeight += totalArmorPoints / defaultPointsPerTon;
    
    return totalWeight;
  }

  // Template management
  static createTemplateFromUnit(unit: EditableUnit, name: string, description: string): UnitTemplate {
    return {
      id: `template-${Date.now()}`,
      name,
      description,
      equipment: unit.equipmentPlacements.map(p => ({
        equipment: p.equipment,
        location: p.location
      })),
      armor: Object.entries(unit.armorAllocation).reduce((acc, [loc, armor]) => {
        acc[loc] = {
          front: armor.front,
          rear: armor.rear
        };
        return acc;
      }, {} as UnitTemplate['armor']),
      quirks: [...unit.selectedQuirks],
      armorType: unit.armorAllocation['Center Torso']?.type.id
    };
  }
}

// Predefined templates
export const STANDARD_TEMPLATES: UnitTemplate[] = [
  {
    id: 'striker-template',
    name: 'Striker Configuration',
    description: 'Fast-moving unit with moderate armor and weapons',
    equipment: [],
    armor: {
      'Head': { front: 9 },
      'Center Torso': { front: 20, rear: 10 },
      'Left Torso': { front: 15, rear: 8 },
      'Right Torso': { front: 15, rear: 8 },
      'Left Arm': { front: 12 },
      'Right Arm': { front: 12 },
      'Left Leg': { front: 15 },
      'Right Leg': { front: 15 }
    },
    quirks: []
  },
  {
    id: 'brawler-template',
    name: 'Brawler Configuration',
    description: 'Maximum armor for close combat',
    equipment: [],
    armor: {
      'Head': { front: 9 },
      'Center Torso': { front: 35, rear: 17 },
      'Left Torso': { front: 26, rear: 13 },
      'Right Torso': { front: 26, rear: 13 },
      'Left Arm': { front: 20 },
      'Right Arm': { front: 20 },
      'Left Leg': { front: 26 },
      'Right Leg': { front: 26 }
    },
    quirks: []
  }
];
