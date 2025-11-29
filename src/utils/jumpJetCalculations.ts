/**
 * Jump Jet Calculations - Compatibility layer
 * Provides jump jet utilities for UI compatibility
 * 
 * TODO: Replace with spec-driven implementation from Phase 2
 */

import { TechBase } from '../types/enums/TechBase';
import { RulesLevel } from '../types/enums/RulesLevel';

export enum JumpJetType {
  STANDARD = 'Standard',
  IMPROVED = 'Improved',
  MECHANICAL = 'Mechanical',
}

export interface JumpJetVariant {
  type: JumpJetType;
  name: string;
  techBase: TechBase | 'Both';
  rulesLevel: RulesLevel;
  weightPerJump: (tonnage: number) => number;
  slotsPerJump: number;
  heatPerJump: number;
}

export const JUMP_JET_VARIANTS: JumpJetVariant[] = [
  {
    type: JumpJetType.STANDARD,
    name: 'Standard Jump Jets',
    techBase: 'Both',
    rulesLevel: RulesLevel.INTRODUCTORY,
    weightPerJump: (tonnage) => tonnage <= 55 ? 0.5 : tonnage <= 85 ? 1.0 : 2.0,
    slotsPerJump: 1,
    heatPerJump: 1,
  },
  {
    type: JumpJetType.IMPROVED,
    name: 'Improved Jump Jets',
    techBase: 'Both',
    rulesLevel: RulesLevel.STANDARD,
    weightPerJump: (tonnage) => tonnage <= 55 ? 1.0 : tonnage <= 85 ? 2.0 : 4.0,
    slotsPerJump: 2,
    heatPerJump: 0.5,
  },
  {
    type: JumpJetType.MECHANICAL,
    name: 'Mechanical Jump Boosters',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weightPerJump: (tonnage) => tonnage * 0.025,
    slotsPerJump: 1,
    heatPerJump: 0,
  },
];

export interface JumpJetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function getAvailableJumpJetTypes(techBaseOrString: TechBase | string, rulesLevel: RulesLevel = RulesLevel.EXPERIMENTAL): JumpJetVariant[] {
  // Convert string to TechBase enum if needed
  const techBase: TechBase = typeof techBaseOrString === 'string' 
    ? (techBaseOrString === 'Inner Sphere' ? TechBase.INNER_SPHERE : 
       techBaseOrString === 'Clan' ? TechBase.CLAN : 
       techBaseOrString as TechBase)
    : techBaseOrString;

  const levelOrder = {
    [RulesLevel.INTRODUCTORY]: 0,
    [RulesLevel.STANDARD]: 1,
    [RulesLevel.ADVANCED]: 2,
    [RulesLevel.EXPERIMENTAL]: 3,
  };
  const maxOrder = levelOrder[rulesLevel];
  
  return JUMP_JET_VARIANTS.filter(v => 
    (v.techBase === 'Both' || v.techBase === techBase) &&
    levelOrder[v.rulesLevel] <= maxOrder
  );
}

export function validateJumpJetConfiguration(
  jumpMP: number,
  walkMP: number,
  tonnage: number,
  jumpJetType: JumpJetType
): JumpJetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (jumpMP < 0) {
    errors.push('Jump MP cannot be negative');
  }

  if (jumpMP > walkMP) {
    if (jumpJetType !== JumpJetType.IMPROVED) {
      errors.push('Standard Jump MP cannot exceed Walk MP');
    }
  }

  if (jumpJetType === JumpJetType.IMPROVED && jumpMP > walkMP * 1.5) {
    errors.push('Improved Jump MP cannot exceed 1.5x Walk MP');
  }

  if (jumpMP > 0 && jumpMP < 2) {
    warnings.push('Having only 1 Jump MP is rarely useful');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function calculateJumpJetWeight(
  jumpMP: number,
  tonnage: number,
  jumpJetType: JumpJetType
): number {
  const variant = JUMP_JET_VARIANTS.find(v => v.type === jumpJetType);
  if (!variant) return 0;
  
  return jumpMP * variant.weightPerJump(tonnage);
}

export function calculateTotalJumpJetWeight(
  jumpMP: number,
  tonnage: number,
  jumpJetType: JumpJetType
): number {
  return calculateJumpJetWeight(jumpMP, tonnage, jumpJetType);
}

export function calculateJumpJetSlots(jumpMP: number, jumpJetType: JumpJetType): number {
  const variant = JUMP_JET_VARIANTS.find(v => v.type === jumpJetType);
  if (!variant) return 0;
  
  return jumpMP * variant.slotsPerJump;
}

export function calculateTotalJumpJetCrits(jumpMP: number, jumpJetType: JumpJetType): number {
  return calculateJumpJetSlots(jumpMP, jumpJetType);
}

export function calculateJumpJetHeat(jumpMP: number, jumpJetType: JumpJetType): number {
  const variant = JUMP_JET_VARIANTS.find(v => v.type === jumpJetType);
  if (!variant) return 0;
  
  // Standard rules: min(jumpMP, 3) heat
  if (jumpJetType === JumpJetType.MECHANICAL) {
    return 0;
  }
  
  return Math.min(jumpMP, 3);
}

export function getMaxAllowedJumpMP(walkMP: number, jumpJetType: JumpJetType): number {
  if (jumpJetType === JumpJetType.IMPROVED) {
    return Math.floor(walkMP * 1.5);
  }
  return walkMP;
}
