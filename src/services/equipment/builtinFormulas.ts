/**
 * Builtin Variable Equipment Formulas
 * 
 * Data-driven formula definitions for standard BattleTech variable equipment.
 * These replace the hardcoded calculation methods.
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

import { 
  IVariableFormulas, 
  fixed, 
  ceilDivide, 
  multiply, 
  multiplyRound, 
  equalsWeight 
} from '@/types/equipment/VariableEquipment';

/**
 * Builtin variable equipment formulas
 * Maps equipment ID to formula definitions
 */
export const BUILTIN_FORMULAS: Readonly<Record<string, IVariableFormulas>> = {
  
  // ============================================================================
  // TARGETING COMPUTERS
  // ============================================================================
  
  /**
   * Targeting Computer (Inner Sphere)
   * Weight: ceil(directFireWeaponTonnage / 4)
   * Slots: = weight
   * Cost: weight × 10,000
   */
  'targeting-computer-is': {
    weight: ceilDivide('directFireWeaponTonnage', 4),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    requiredContext: ['directFireWeaponTonnage'],
  },

  /**
   * Targeting Computer (Clan)
   * Weight: ceil(directFireWeaponTonnage / 5)
   * Slots: = weight
   * Cost: weight × 10,000
   */
  'targeting-computer-clan': {
    weight: ceilDivide('directFireWeaponTonnage', 5),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    requiredContext: ['directFireWeaponTonnage'],
  },

  // ============================================================================
  // MASC
  // ============================================================================
  
  /**
   * MASC (Inner Sphere)
   * Weight: ceil(engineRating / 20)
   * Slots: = weight
   * Cost: tonnage × 1,000
   */
  'masc-is': {
    weight: ceilDivide('engineRating', 20),
    criticalSlots: equalsWeight(),
    cost: multiply('tonnage', 1000),
    requiredContext: ['engineRating', 'tonnage'],
  },

  /**
   * MASC (Clan)
   * Weight: ceil(engineRating / 25)
   * Slots: = weight
   * Cost: tonnage × 1,000
   */
  'masc-clan': {
    weight: ceilDivide('engineRating', 25),
    criticalSlots: equalsWeight(),
    cost: multiply('tonnage', 1000),
    requiredContext: ['engineRating', 'tonnage'],
  },

  // ============================================================================
  // SUPERCHARGER
  // ============================================================================
  
  /**
   * Supercharger
   * Weight: ceil(engineWeight / 10) rounded to 0.5 tons
   * Slots: 1
   * Cost: engineWeight × 10,000
   */
  'supercharger': {
    weight: multiplyRound('engineWeight', 0.1, 0.5),
    criticalSlots: fixed(1),
    cost: multiply('engineWeight', 10000),
    requiredContext: ['engineWeight'],
  },

  // ============================================================================
  // PARTIAL WING
  // ============================================================================
  
  /**
   * Partial Wing
   * Weight: tonnage × 0.05 rounded to 0.5 tons
   * Slots: 6 (3 per side torso)
   * Cost: weight × 50,000
   */
  'partial-wing': {
    weight: multiplyRound('tonnage', 0.05, 0.5),
    criticalSlots: fixed(6),
    cost: multiply('weight', 50000),
    requiredContext: ['tonnage'],
  },

  // ============================================================================
  // TRIPLE STRENGTH MYOMER (TSM)
  // ============================================================================
  
  /**
   * Triple Strength Myomer
   * Weight: 0 (replaces standard myomer)
   * Slots: 6 (distributed across torso/legs)
   * Cost: tonnage × 16,000
   */
  'tsm': {
    weight: fixed(0),
    criticalSlots: fixed(6),
    cost: multiply('tonnage', 16000),
    requiredContext: ['tonnage'],
  },

} as const;

/**
 * Get all builtin equipment IDs
 */
export function getBuiltinEquipmentIds(): string[] {
  return Object.keys(BUILTIN_FORMULAS);
}

/**
 * Check if an equipment ID has builtin formulas
 */
export function hasBuiltinFormulas(equipmentId: string): boolean {
  return equipmentId in BUILTIN_FORMULAS;
}

/**
 * Get builtin formulas for an equipment ID
 */
export function getBuiltinFormulas(equipmentId: string): IVariableFormulas | undefined {
  return BUILTIN_FORMULAS[equipmentId];
}

