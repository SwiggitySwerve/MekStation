/**
 * Critical Slot Color System
 *
 * Colors for system components in critical slot displays.
 *
 * @spec openspec/specs/color-system/spec.md
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

/**
 * System component types that occupy critical slots
 */
export type SystemComponentType =
  | 'engine'
  | 'gyro'
  | 'actuator'
  | 'cockpit'
  | 'lifesupport'
  | 'sensors'
  | 'structure' // Endo Steel variants - unhittable structural slots
  | 'armor' // Ferro-Fibrous variants - unhittable armor slots
  | 'empty';

/**
 * Internal structure types that require critical slots (unhittable)
 */
const SLOTTED_STRUCTURE_TYPES: readonly string[] = [
  InternalStructureType.ENDO_STEEL_IS,
  InternalStructureType.ENDO_STEEL_CLAN,
  InternalStructureType.ENDO_COMPOSITE,
];

/**
 * Armor types that require critical slots (unhittable)
 */
const SLOTTED_ARMOR_TYPES: readonly string[] = [
  ArmorTypeEnum.FERRO_FIBROUS_IS,
  ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  ArmorTypeEnum.LIGHT_FERRO,
  ArmorTypeEnum.HEAVY_FERRO,
  ArmorTypeEnum.STEALTH,
  ArmorTypeEnum.REACTIVE,
  ArmorTypeEnum.REFLECTIVE,
];

/**
 * Color definitions for system components
 */
export interface SlotColorDefinition {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
  readonly hoverBg: string;
}

/**
 * System component slot colors
 *
 * Fixed systems use quiet neutral surfaces with thin, muted accents.
 * Equipment uses stronger category edges; unhittables keep dashed borders.
 */
export const SLOT_COLORS: Record<SystemComponentType, SlotColorDefinition> = {
  engine: {
    bg: 'bg-surface-base',
    border: 'border-border-theme-subtle border-l-2 border-l-orange-400/35',
    text: 'text-text-theme-secondary',
    hoverBg: 'hover:bg-surface-raised',
  },
  gyro: {
    bg: 'bg-surface-base',
    border: 'border-border-theme-subtle border-l-2 border-l-purple-400/35',
    text: 'text-text-theme-secondary',
    hoverBg: 'hover:bg-surface-raised',
  },
  actuator: {
    bg: 'bg-surface-base',
    border: 'border-border-theme-subtle border-l-2 border-l-blue-400/35',
    text: 'text-text-theme-secondary',
    hoverBg: 'hover:bg-surface-raised',
  },
  cockpit: {
    bg: 'bg-surface-base',
    border: 'border-border-theme-subtle border-l-2 border-l-slate-400/60',
    text: 'text-text-theme-secondary',
    hoverBg: 'hover:bg-surface-raised',
  },
  lifesupport: {
    bg: 'bg-surface-base',
    border: 'border-border-theme-subtle border-l-2 border-l-slate-400/60',
    text: 'text-text-theme-secondary',
    hoverBg: 'hover:bg-surface-raised',
  },
  sensors: {
    bg: 'bg-surface-base',
    border: 'border-border-theme-subtle border-l-2 border-l-slate-400/60',
    text: 'text-text-theme-secondary',
    hoverBg: 'hover:bg-surface-raised',
  },
  // Endo Steel - unhittable structural slots (light faded gray with dashed border)
  structure: {
    bg: 'bg-slate-500/40',
    border: 'border-slate-400 border-dashed',
    text: 'text-slate-300',
    hoverBg: 'hover:bg-slate-500/50',
  },
  // Ferro-Fibrous - unhittable armor slots (light faded gray with dashed border)
  armor: {
    bg: 'bg-slate-500/40',
    border: 'border-slate-400 border-dashed',
    text: 'text-slate-300',
    hoverBg: 'hover:bg-slate-500/50',
  },
  empty: {
    bg: 'bg-surface-raised',
    border: 'border-border-theme border-dashed',
    text: 'text-text-theme-secondary',
    hoverBg: 'hover:bg-surface-base',
  },
};

/**
 * Get color classes for a system component type
 */
export function getSlotColors(
  componentType: SystemComponentType,
): SlotColorDefinition {
  return SLOT_COLORS[componentType] || SLOT_COLORS.empty;
}

/**
 * Get combined Tailwind class string for a slot
 */
export function getSlotColorClasses(
  componentType: SystemComponentType,
): string {
  const colors = getSlotColors(componentType);
  return `${colors.bg} ${colors.border} ${colors.text} ${colors.hoverBg}`;
}

/**
 * Classify a slot content name into a system component type.
 * Uses existing InternalStructureType and ArmorTypeEnum values for matching.
 */
export function classifySystemComponent(name: string): SystemComponentType {
  // Check for slotted structure types (Endo Steel variants)
  if (
    SLOTTED_STRUCTURE_TYPES.some((type) => name === type || name.includes(type))
  ) {
    return 'structure';
  }

  // Check for slotted armor types (Ferro-Fibrous variants, Stealth, etc.)
  if (
    SLOTTED_ARMOR_TYPES.some((type) => name === type || name.includes(type))
  ) {
    return 'armor';
  }

  const lowerName = name.toLowerCase();

  if (lowerName.includes('engine') || lowerName.includes('fusion')) {
    return 'engine';
  }
  if (lowerName.includes('gyro')) {
    return 'gyro';
  }
  if (
    lowerName.includes('shoulder') ||
    lowerName.includes('upper arm') ||
    lowerName.includes('lower arm') ||
    lowerName.includes('hand') ||
    lowerName.includes('hip') ||
    lowerName.includes('upper leg') ||
    lowerName.includes('lower leg') ||
    lowerName.includes('foot')
  ) {
    return 'actuator';
  }
  if (lowerName.includes('cockpit')) {
    return 'cockpit';
  }
  if (lowerName.includes('life support')) {
    return 'lifesupport';
  }
  if (lowerName.includes('sensor')) {
    return 'sensors';
  }

  return 'empty';
}

/**
 * Check if a system component type is unhittable (cannot be destroyed by critical hits).
 * Structure (Endo Steel) and Armor (Ferro-Fibrous) slots are unhittable per BattleTech rules.
 */
export function isUnhittableComponent(
  componentType: SystemComponentType,
): boolean {
  return componentType === 'structure' || componentType === 'armor';
}
