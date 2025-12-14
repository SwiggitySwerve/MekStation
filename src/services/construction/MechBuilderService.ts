/**
 * Mech Builder Service
 * 
 * Core mech construction and modification logic.
 * 
 * @spec openspec/specs/construction-services/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ValidationError } from '../common/errors';
import { IFullUnit } from '../units/CanonicalUnitService';

/**
 * Editable mech representation
 * 
 * Uses concrete enum types for type safety instead of strings.
 */
export interface IEditableMech {
  readonly id: string;
  readonly chassis: string;
  readonly variant: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  
  // Engine
  readonly engineType: EngineType | string;
  readonly engineRating: number;
  readonly walkMP: number;
  
  // Structure
  readonly structureType: InternalStructureType | string;
  readonly gyroType: GyroType | string;
  readonly cockpitType: CockpitType | string;
  
  // Armor
  readonly armorType: ArmorTypeEnum | string;
  readonly armorAllocation: IArmorAllocation;
  
  // Heat Sinks
  readonly heatSinkType: HeatSinkType | string;
  readonly heatSinkCount: number;
  
  // Equipment
  readonly equipment: readonly IEquipmentSlot[];
  
  // Metadata
  readonly isDirty: boolean;
}

/**
 * Armor allocation per location
 */
export interface IArmorAllocation {
  readonly head: number;
  readonly centerTorso: number;
  readonly centerTorsoRear: number;
  readonly leftTorso: number;
  readonly leftTorsoRear: number;
  readonly rightTorso: number;
  readonly rightTorsoRear: number;
  readonly leftArm: number;
  readonly rightArm: number;
  readonly leftLeg: number;
  readonly rightLeg: number;
}

/**
 * Equipment in a critical slot
 */
export interface IEquipmentSlot {
  readonly equipmentId: string;
  readonly location: string;
  readonly slotIndex: number;
}

/**
 * Changes to apply to a mech
 */
export interface IMechChanges {
  readonly chassis?: string;
  readonly variant?: string;
  readonly engineType?: string;
  readonly walkMP?: number;
  readonly armorAllocation?: Partial<IArmorAllocation>;
  readonly equipment?: readonly IEquipmentSlot[];
}

/**
 * Mech builder service interface
 */
export interface IMechBuilderService {
  createEmpty(tonnage: number, techBase: TechBase): IEditableMech;
  createFromUnit(unit: IFullUnit): IEditableMech;
  applyChanges(mech: IEditableMech, changes: IMechChanges): IEditableMech;
  setEngine(mech: IEditableMech, engineType: string, walkMP?: number): IEditableMech;
  setArmor(mech: IEditableMech, allocation: Partial<IArmorAllocation>): IEditableMech;
  addEquipment(mech: IEditableMech, equipmentId: string, location: string): IEditableMech;
  removeEquipment(mech: IEditableMech, slotIndex: number): IEditableMech;
}

/**
 * Default armor allocation (empty)
 */
const EMPTY_ARMOR: IArmorAllocation = {
  head: 0,
  centerTorso: 0,
  centerTorsoRear: 0,
  leftTorso: 0,
  leftTorsoRear: 0,
  rightTorso: 0,
  rightTorsoRear: 0,
  leftArm: 0,
  rightArm: 0,
  leftLeg: 0,
  rightLeg: 0,
};

/**
 * Mech Builder Service implementation
 */
export class MechBuilderService implements IMechBuilderService {
  
  /**
   * Create an empty mech shell with specified tonnage and tech base
   */
  createEmpty(tonnage: number, techBase: TechBase): IEditableMech {
    // Validate tonnage
    if (tonnage < 20 || tonnage > 100 || tonnage % 5 !== 0) {
      throw new ValidationError(
        `Invalid tonnage: ${tonnage}`,
        ['Tonnage must be between 20 and 100, in increments of 5']
      );
    }

    // Calculate default walk MP (3) and engine rating
    const defaultWalkMP = 3;
    const engineRating = defaultWalkMP * tonnage;

    return {
      id: '',
      chassis: 'New Mech',
      variant: 'Custom',
      tonnage,
      techBase,
      engineType: EngineType.STANDARD,
      engineRating,
      walkMP: defaultWalkMP,
      structureType: InternalStructureType.STANDARD,
      gyroType: GyroType.STANDARD,
      cockpitType: CockpitType.STANDARD,
      armorType: ArmorTypeEnum.STANDARD,
      armorAllocation: { ...EMPTY_ARMOR },
      heatSinkType: techBase === TechBase.CLAN ? HeatSinkType.DOUBLE_CLAN : HeatSinkType.SINGLE,
      heatSinkCount: 10,
      equipment: [],
      isDirty: false,
    };
  }

  /**
   * Create an editable mech from an existing unit definition
   */
  createFromUnit(unit: IFullUnit): IEditableMech {
    // Extract or default values from unit
    const tonnage = typeof unit.tonnage === 'number' ? unit.tonnage : 50;
    const techBase = (unit.techBase as TechBase) || TechBase.INNER_SPHERE;
    
    // Start with empty mech of same tonnage/tech base
    const base = this.createEmpty(tonnage, techBase);
    
    return {
      ...base,
      id: unit.id,
      chassis: unit.chassis,
      variant: unit.variant,
      isDirty: false,
    };
  }

  /**
   * Apply a set of changes to a mech immutably
   */
  applyChanges(mech: IEditableMech, changes: IMechChanges): IEditableMech {
    let result = { ...mech, isDirty: true };

    if (changes.chassis !== undefined) {
      result = { ...result, chassis: changes.chassis };
    }

    if (changes.variant !== undefined) {
      result = { ...result, variant: changes.variant };
    }

    if (changes.engineType !== undefined || changes.walkMP !== undefined) {
      const walkMP = changes.walkMP ?? result.walkMP;
      const engineType = changes.engineType ?? result.engineType;
      const engineRating = walkMP * result.tonnage;
      
      result = { ...result, engineType, walkMP, engineRating };
    }

    if (changes.armorAllocation !== undefined) {
      result = {
        ...result,
        armorAllocation: { ...result.armorAllocation, ...changes.armorAllocation },
      };
    }

    if (changes.equipment !== undefined) {
      result = { ...result, equipment: changes.equipment };
    }

    return result;
  }

  /**
   * Set engine type and optionally walk MP
   * Engine rating is calculated: rating = walkMP × tonnage
   */
  setEngine(mech: IEditableMech, engineType: string, walkMP?: number): IEditableMech {
    const newWalkMP = walkMP ?? mech.walkMP;
    const engineRating = newWalkMP * mech.tonnage;

    // Validate engine rating
    if (engineRating > 400) {
      throw new ValidationError(
        `Engine rating ${engineRating} exceeds maximum 400`,
        [`Walk MP ${newWalkMP} on ${mech.tonnage}-ton mech would require rating ${engineRating}`]
      );
    }

    if (engineRating < 10) {
      throw new ValidationError(
        `Engine rating ${engineRating} below minimum 10`,
        [`Walk MP ${newWalkMP} on ${mech.tonnage}-ton mech would require rating ${engineRating}`]
      );
    }

    return {
      ...mech,
      engineType,
      walkMP: newWalkMP,
      engineRating,
      isDirty: true,
    };
  }

  /**
   * Set armor allocation
   */
  setArmor(mech: IEditableMech, allocation: Partial<IArmorAllocation>): IEditableMech {
    // TODO: Add validation for maximum armor per location
    return {
      ...mech,
      armorAllocation: { ...mech.armorAllocation, ...allocation },
      isDirty: true,
    };
  }

  /**
   * Add equipment to a location
   */
  addEquipment(mech: IEditableMech, equipmentId: string, location: string): IEditableMech {
    // Find next available slot index
    const locationEquipment = mech.equipment.filter(e => e.location === location);
    const nextSlot = locationEquipment.length;

    const newSlot: IEquipmentSlot = {
      equipmentId,
      location,
      slotIndex: nextSlot,
    };

    return {
      ...mech,
      equipment: [...mech.equipment, newSlot],
      isDirty: true,
    };
  }

  /**
   * Remove equipment by slot index
   */
  removeEquipment(mech: IEditableMech, slotIndex: number): IEditableMech {
    const equipment = mech.equipment.filter((_, i) => i !== slotIndex);
    
    return {
      ...mech,
      equipment,
      isDirty: true,
    };
  }
}

// Singleton instance
export const mechBuilderService = new MechBuilderService();

