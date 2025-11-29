/**
 * Armor Calculations - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

import { TechBase } from '../types/enums/TechBase';
import { RulesLevel } from '../types/enums/RulesLevel';

export interface ArmorSpecification {
  type: string;
  pointsPerTon: number;
  criticalSlots: number;
  techBase: TechBase | 'Both';
  rulesLevel: RulesLevel;
  costMultiplier?: number;
  description?: string;
}

export const ARMOR_SPECIFICATIONS: Record<string, ArmorSpecification> = {
  standard: {
    type: 'Standard',
    pointsPerTon: 16,
    criticalSlots: 0,
    techBase: 'Both',
    rulesLevel: RulesLevel.INTRODUCTORY,
    costMultiplier: 1,
    description: 'Standard armor protection',
  },
  'ferro-fibrous-is': {
    type: 'Ferro-Fibrous',
    pointsPerTon: 17.92,
    criticalSlots: 14,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    costMultiplier: 1.5,
    description: 'Inner Sphere Ferro-Fibrous armor',
  },
  'ferro-fibrous-clan': {
    type: 'Ferro-Fibrous (Clan)',
    pointsPerTon: 19.2,
    criticalSlots: 7,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    costMultiplier: 1.5,
    description: 'Clan Ferro-Fibrous armor',
  },
  'light-ferro': {
    type: 'Light Ferro-Fibrous',
    pointsPerTon: 17.6,
    criticalSlots: 7,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    costMultiplier: 1.25,
    description: 'Light Ferro-Fibrous armor',
  },
  'heavy-ferro': {
    type: 'Heavy Ferro-Fibrous',
    pointsPerTon: 24,
    criticalSlots: 21,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    costMultiplier: 2,
    description: 'Heavy Ferro-Fibrous armor',
  },
  stealth: {
    type: 'Stealth',
    pointsPerTon: 16,
    criticalSlots: 12,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    costMultiplier: 2.5,
    description: 'Stealth armor with ECM capabilities',
  },
  reactive: {
    type: 'Reactive',
    pointsPerTon: 14,
    criticalSlots: 14,
    techBase: 'Both',
    rulesLevel: RulesLevel.EXPERIMENTAL,
    costMultiplier: 3,
    description: 'Reactive armor against explosive weapons',
  },
  reflective: {
    type: 'Reflective (Laser)',
    pointsPerTon: 16,
    criticalSlots: 10,
    techBase: 'Both',
    rulesLevel: RulesLevel.EXPERIMENTAL,
    costMultiplier: 3,
    description: 'Reflective armor against energy weapons',
  },
  hardened: {
    type: 'Hardened',
    pointsPerTon: 8,
    criticalSlots: 0,
    techBase: 'Both',
    rulesLevel: RulesLevel.EXPERIMENTAL,
    costMultiplier: 2.5,
    description: 'Hardened armor with increased protection',
  },
};

export function calculateMaxArmor(tonnage: number): number {
  // Simplified: 2 * internal structure, with head capped at 9
  return tonnage * 2 + 1; // Approximate
}

export function calculateMaxLocationArmor(location: string, tonnage: number): number {
  // Stub - simplified calculation
  const baseStructure = Math.floor(tonnage / 10);
  if (location === 'Head') return 9;
  if (location === 'Center Torso') return baseStructure * 4;
  if (location.includes('Torso')) return baseStructure * 3;
  if (location.includes('Arm')) return baseStructure * 2;
  if (location.includes('Leg')) return baseStructure * 2;
  return baseStructure;
}

export function validateArmorAllocation(allocation: Record<string, number>, tonnage: number): boolean {
  const total = Object.values(allocation).reduce((sum, v) => sum + v, 0);
  return total <= calculateMaxArmor(tonnage);
}


