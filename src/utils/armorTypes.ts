/**
 * Armor Types - Compatibility layer
 * Provides object-based armor type definitions for UI compatibility
 * while the spec-driven implementation is being built.
 * 
 * TODO: Replace with spec-driven implementation from Phase 2
 */

import { TechBase } from '../types/enums/TechBase';
import { RulesLevel } from '../types/enums/RulesLevel';

/**
 * Armor type definition with all properties needed by UI components
 */
export interface ArmorType {
  id: string;
  name: string;
  pointsPerTon: number;
  criticalSlots: number;
  techBase: TechBase | 'Both';
  rulesLevel: RulesLevel;
  weight?: number;
  isDefault?: boolean;
  costMultiplier?: number;
  introductionYear?: number;
  maxPointsPerLocationMultiplier?: number;
}

/**
 * All available armor types
 */
export const ARMOR_TYPES: ArmorType[] = [
  {
    id: 'standard',
    name: 'Standard',
    pointsPerTon: 16,
    criticalSlots: 0,
    techBase: 'Both',
    rulesLevel: RulesLevel.INTRODUCTORY,
    isDefault: true,
  },
  {
    id: 'ferro-fibrous-is',
    name: 'Ferro-Fibrous',
    pointsPerTon: 17.92,
    criticalSlots: 14,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
  },
  {
    id: 'ferro-fibrous-clan',
    name: 'Ferro-Fibrous (Clan)',
    pointsPerTon: 19.2,
    criticalSlots: 7,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
  },
  {
    id: 'light-ferro',
    name: 'Light Ferro-Fibrous',
    pointsPerTon: 17.6,
    criticalSlots: 7,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
  },
  {
    id: 'heavy-ferro',
    name: 'Heavy Ferro-Fibrous',
    pointsPerTon: 24,
    criticalSlots: 21,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
  },
  {
    id: 'stealth',
    name: 'Stealth',
    pointsPerTon: 16,
    criticalSlots: 12,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
  },
  {
    id: 'reactive',
    name: 'Reactive',
    pointsPerTon: 14,
    criticalSlots: 14,
    techBase: 'Both',
    rulesLevel: RulesLevel.EXPERIMENTAL,
  },
  {
    id: 'reflective',
    name: 'Reflective (Laser)',
    pointsPerTon: 16,
    criticalSlots: 10,
    techBase: 'Both',
    rulesLevel: RulesLevel.EXPERIMENTAL,
  },
  {
    id: 'hardened',
    name: 'Hardened',
    pointsPerTon: 8,
    criticalSlots: 0,
    techBase: 'Both',
    rulesLevel: RulesLevel.EXPERIMENTAL,
  },
];

/**
 * Get armor type by ID
 */
export function getArmorTypeById(id: string): ArmorType | undefined {
  return ARMOR_TYPES.find(type => type.id === id);
}

/**
 * Get armor type by name
 */
export function getArmorTypeByName(name: string): ArmorType | undefined {
  return ARMOR_TYPES.find(type => type.name === name);
}

/**
 * Get armor types available for a tech base
 */
export function getArmorTypesForTechBase(techBase: TechBase): ArmorType[] {
  return ARMOR_TYPES.filter(type => 
    type.techBase === 'Both' || type.techBase === techBase
  );
}

/**
 * Get the default armor type
 */
export function getDefaultArmorType(): ArmorType {
  return ARMOR_TYPES.find(type => type.isDefault) || ARMOR_TYPES[0];
}

/**
 * Calculate armor weight for given points and type
 */
export function calculateArmorWeight(armorPoints: number, armorType: ArmorType): number {
  return Math.ceil(armorPoints / armorType.pointsPerTon * 2) / 2; // Round to 0.5 tons
}
