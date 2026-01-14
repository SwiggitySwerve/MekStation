/**
 * Movement Calculations
 * 
 * Functions for calculating movement points and related values.
 * 
 * @spec openspec/specs/movement-system/spec.md
 */

import { TechBase } from '../../types/enums/TechBase';
import { RulesLevel } from '../../types/enums/RulesLevel';

// calculateWalkMP is exported from engineCalculations.ts
// Re-export it here for convenience
export { calculateWalkMP } from './engineCalculations';

/**
 * Calculate run MP from walk MP
 * 
 * runMP = ceil(walkMP × 1.5)
 * 
 * @param walkMP - Walking movement points
 * @returns Run MP
 */
export function calculateRunMP(walkMP: number): number {
  if (walkMP <= 0) {
    return 0;
  }
  return Math.ceil(walkMP * 1.5);
}

// =============================================================================
// Movement Enhancement System
// =============================================================================

export interface MovementModifiers {
  /** Bonus added to base 1.5x run multiplier (e.g., MASC adds 0.5 for 2.0x total) */
  runMultiplierBonus: number;
  /** Flat MP added after multiplication (e.g., TSM adds +1) */
  flatMPBonus: number;
}

export const MOVEMENT_ENHANCEMENT_MODIFIERS: Record<string, MovementModifiers> = {
  'masc': { runMultiplierBonus: 0.5, flatMPBonus: 0 },
  'supercharger': { runMultiplierBonus: 0.5, flatMPBonus: 0 },
  'tsm': { runMultiplierBonus: 0, flatMPBonus: 1 },
  'triple strength myomer': { runMultiplierBonus: 0, flatMPBonus: 1 },
};

export function getMovementModifiersFromEquipment(equipmentNames: string[]): MovementModifiers {
  const result: MovementModifiers = { runMultiplierBonus: 0, flatMPBonus: 0 };
  const matched = new Set<string>();
  
  for (const name of equipmentNames) {
    const nameNormalized = name.toLowerCase().replace(/-/g, ' ');
    for (const [key, modifiers] of Object.entries(MOVEMENT_ENHANCEMENT_MODIFIERS)) {
      if (nameNormalized.includes(key) && !matched.has(key)) {
        matched.add(key);
        result.runMultiplierBonus += modifiers.runMultiplierBonus;
        result.flatMPBonus += modifiers.flatMPBonus;
      }
    }
  }
  
  return result;
}

export function calculateMaxRunMPWithModifiers(walkMP: number, modifiers: MovementModifiers): number | undefined {
  if (walkMP <= 0) return 0;
  if (modifiers.runMultiplierBonus === 0 && modifiers.flatMPBonus === 0) {
    return undefined;
  }
  const totalMultiplier = 1.5 + modifiers.runMultiplierBonus;
  return Math.floor(walkMP * totalMultiplier) + modifiers.flatMPBonus;
}

/**
 * Jump jet type enumeration
 */
export enum JumpJetType {
  STANDARD = 'Standard',
  IMPROVED = 'Improved',
  MECHANICAL = 'Mechanical Jump Boosters',
}

/**
 * Jump jet definition
 */
export interface JumpJetDefinition {
  readonly type: JumpJetType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Slots per jump jet */
  readonly slotsPerJump: number;
  /** Weight multiplier based on tonnage class */
  readonly getWeight: (tonnage: number) => number;
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * Jump jet definitions
 */
export const JUMP_JET_DEFINITIONS: readonly JumpJetDefinition[] = [
  {
    type: JumpJetType.STANDARD,
    name: 'Standard Jump Jet',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    slotsPerJump: 1,
    getWeight: (tonnage) => {
      if (tonnage <= 55) return 0.5;
      if (tonnage <= 85) return 1.0;
      return 2.0;
    },
    introductionYear: 2471,
  },
  {
    type: JumpJetType.IMPROVED,
    name: 'Improved Jump Jet',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    slotsPerJump: 2,
    getWeight: (tonnage) => {
      if (tonnage <= 55) return 1.0;
      if (tonnage <= 85) return 2.0;
      return 4.0;
    },
    introductionYear: 3069,
  },
  {
    type: JumpJetType.MECHANICAL,
    name: 'Mechanical Jump Boosters',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    slotsPerJump: 1,
    getWeight: (tonnage) => tonnage * 0.025,
    introductionYear: 3060,
  },
] as const;

/**
 * Get jump jet definition by type
 */
export function getJumpJetDefinition(type: JumpJetType): JumpJetDefinition | undefined {
  return JUMP_JET_DEFINITIONS.find(def => def.type === type);
}

/**
 * Calculate jump jet weight
 * 
 * @param tonnage - Unit tonnage
 * @param jumpMP - Jump movement points
 * @param jumpJetType - Type of jump jets
 * @returns Total weight in tons
 */
export function calculateJumpJetWeight(
  tonnage: number,
  jumpMP: number,
  jumpJetType: JumpJetType
): number {
  const definition = getJumpJetDefinition(jumpJetType);
  if (!definition) {
    return jumpMP * 0.5;
  }
  
  return jumpMP * definition.getWeight(tonnage);
}

/**
 * Calculate jump jet slots
 * 
 * @param jumpMP - Jump movement points
 * @param jumpJetType - Type of jump jets
 * @returns Total critical slots
 */
export function calculateJumpJetSlots(jumpMP: number, jumpJetType: JumpJetType): number {
  const definition = getJumpJetDefinition(jumpJetType);
  if (!definition) {
    return jumpMP;
  }
  
  return jumpMP * definition.slotsPerJump;
}

/**
 * Get maximum jump MP
 * 
 * Standard: max = walkMP
 * Improved: max = runMP = ceil(walkMP × 1.5)
 * 
 * @param walkMP - Walk movement points
 * @param jumpJetType - Type of jump jets
 * @returns Maximum jump MP
 */
export function getMaxJumpMP(walkMP: number, jumpJetType: JumpJetType): number {
  if (jumpJetType === JumpJetType.IMPROVED) {
    // Improved jets can reach up to run MP
    return Math.ceil(walkMP * 1.5);
  }
  return walkMP;
}

/**
 * Validate jump configuration
 * 
 * @param walkMP - Walk MP
 * @param jumpMP - Jump MP
 * @param jumpJetType - Type of jump jets
 * @returns Validation result
 */
export function validateJumpConfiguration(
  walkMP: number,
  jumpMP: number,
  jumpJetType: JumpJetType
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (jumpMP < 0) {
    errors.push('Jump MP cannot be negative');
  }
  
  const maxJump = getMaxJumpMP(walkMP, jumpJetType);
  if (jumpMP > maxJump) {
    errors.push(`Jump MP (${jumpMP}) exceeds maximum (${maxJump}) for ${jumpJetType}`);
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * @deprecated Use getMovementModifiersFromEquipment + calculateMaxRunMPWithModifiers instead
 */
export function calculateEnhancedMaxRunMP(
  walkMP: number,
  enhancement: string | null | undefined,
  hasBoth: boolean = false
): number | undefined {
  if (!enhancement && !hasBoth) return undefined;
  
  const equipmentNames = hasBoth 
    ? ['masc', 'supercharger'] 
    : enhancement ? [enhancement] : [];
  
  const modifiers = getMovementModifiersFromEquipment(equipmentNames);
  return calculateMaxRunMPWithModifiers(walkMP, modifiers);
}

