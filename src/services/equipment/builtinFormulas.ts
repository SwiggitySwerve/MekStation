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
  floorDivide,
  multiply, 
  multiplyRound, 
  equalsWeight,
  plus,
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

  // ============================================================================
  // PHYSICAL WEAPONS
  // ============================================================================

  /**
   * Hatchet
   * Weight: ceil(tonnage / 15)
   * Slots: = weight
   * Cost: weight × 5,000
   * Damage: floor(tonnage / 5)
   */
  'hatchet': {
    weight: ceilDivide('tonnage', 15),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 5000),
    damage: floorDivide('tonnage', 5),
    requiredContext: ['tonnage'],
  },

  /**
   * Sword
   * Weight: ceil(tonnage / 15)
   * Slots: = weight
   * Cost: weight × 10,000
   * Damage: floor(tonnage / 10) + 1
   */
  'sword': {
    weight: ceilDivide('tonnage', 15),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    damage: plus(floorDivide('tonnage', 10), 1),
    requiredContext: ['tonnage'],
  },

  /**
   * Mace
   * Weight: ceil(tonnage / 10)
   * Slots: = weight
   * Cost: weight × 7,500
   * Damage: floor(tonnage / 4)
   */
  'mace': {
    weight: ceilDivide('tonnage', 10),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 7500),
    damage: floorDivide('tonnage', 4),
    requiredContext: ['tonnage'],
  },

  /**
   * Claws (Clan)
   * Weight: ceil(tonnage / 15)
   * Slots: = weight
   * Cost: weight × 6,000
   * Damage: floor(tonnage / 7)
   */
  'claws': {
    weight: ceilDivide('tonnage', 15),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 6000),
    damage: floorDivide('tonnage', 7),
    requiredContext: ['tonnage'],
  },

  /**
   * Lance
   * Weight: ceil(tonnage / 20)
   * Slots: = weight
   * Cost: weight × 15,000
   * Damage: floor(tonnage / 5) + 1
   */
  'lance': {
    weight: ceilDivide('tonnage', 20),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 15000),
    damage: plus(floorDivide('tonnage', 5), 1),
    requiredContext: ['tonnage'],
  },

  /**
   * Talons (Clan)
   * Weight: ceil(tonnage / 15)
   * Slots: = weight
   * Cost: weight × 6,000
   * Damage: floor(tonnage / 7)
   */
  'talons': {
    weight: ceilDivide('tonnage', 15),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 6000),
    damage: floorDivide('tonnage', 7),
    requiredContext: ['tonnage'],
  },

  /**
   * Retractable Blade
   * Weight: tonnage × 0.05 rounded to 0.5 tons
   * Slots: 1 per arm (fixed)
   * Cost: weight × 10,000
   * Damage: floor(tonnage / 10)
   */
  'retractable-blade': {
    weight: multiplyRound('tonnage', 0.05, 0.5),
    criticalSlots: fixed(1),
    cost: multiply('weight', 10000),
    damage: floorDivide('tonnage', 10),
    requiredContext: ['tonnage'],
  },

  /**
   * Flail
   * Weight: ceil(tonnage / 5)
   * Slots: = weight
   * Cost: weight × 11,000
   * Damage: floor(tonnage / 4) + 2
   */
  'flail': {
    weight: ceilDivide('tonnage', 5),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 11000),
    damage: plus(floorDivide('tonnage', 4), 2),
    requiredContext: ['tonnage'],
  },

  /**
   * Wrecking Ball
   * Weight: ceil(tonnage / 10)
   * Slots: = weight
   * Cost: weight × 11,000
   * Damage: floor(tonnage / 5) + 3
   */
  'wrecking-ball': {
    weight: ceilDivide('tonnage', 10),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 11000),
    damage: plus(floorDivide('tonnage', 5), 3),
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

