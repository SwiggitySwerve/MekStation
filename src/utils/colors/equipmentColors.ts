/**
 * Equipment Category Color System - SINGLE SOURCE OF TRUTH
 *
 * All equipment category colors for the entire application.
 * Used by: Equipment Browser, Critical Slots Display, Customizer, etc.
 *
 * RESERVED COLORS (used by system components in slotColors.ts):
 *   - Orange: Engine
 *   - Purple: Gyro
 *   - Blue: Actuator
 *   - Yellow-600: Cockpit/Sensors
 *
 * @spec openspec/specs/color-system/spec.md
 */

import { EquipmentCategory } from '@/types/equipment';

import { classifyEquipmentByName } from './equipmentColors.classification';

export { classifyEquipmentByName };
export {
  getAmmoColors,
  detectAmmoSubType,
  MISSILE_AMMO_COLORS,
  BALLISTIC_AMMO_COLORS,
  type AmmoSubType,
} from './equipmentColors.ammo';
export {
  EQUIPMENT_COLORS,
  getEquipmentColors,
  getCategoryColorsLegacy,
  getEquipmentColorClasses,
  classifyEquipment,
  categoryToColorType,
  getBattleTechEquipmentClasses,
  type EquipmentColorType,
  type EquipmentColorDefinition,
} from './equipmentColors.legacy';

// =============================================================================
// Types
// =============================================================================

export interface CategoryColorDefinition {
  readonly label: string;
  readonly badgeVariant: string;
  readonly slotBg: string;
  readonly slotBorder: string;
  readonly slotText: string;
  readonly slotHoverBg: string;
  readonly indicatorBg: string;
}

// =============================================================================
// SINGLE SOURCE OF TRUTH: Equipment Category Colors
// =============================================================================

/**
 * Color definitions for each equipment category.
 *
 * Color assignments avoid conflicts with system components:
 * - Engine uses Orange → Ballistic uses Amber instead
 * - Gyro uses Purple → Structural uses Lime instead
 * - Actuator uses Blue → Electronics uses Teal instead
 * - Cockpit uses Yellow-600 → Ammo uses Yellow-400 (different shade)
 */
export const EQUIPMENT_CATEGORY_COLORS: Record<
  EquipmentCategory,
  CategoryColorDefinition
> = {
  // -------------------------------------------------------------------------
  // WEAPON CATEGORIES - Each has a distinct color
  // -------------------------------------------------------------------------

  [EquipmentCategory.ENERGY_WEAPON]: {
    label: 'Energy',
    badgeVariant: 'yellow',
    slotBg: 'bg-yellow-600',
    slotBorder: 'border-yellow-700',
    slotText: 'text-black',
    slotHoverBg: 'hover:bg-yellow-500',
    indicatorBg: 'bg-yellow-500',
  },

  [EquipmentCategory.BALLISTIC_WEAPON]: {
    label: 'Ballistic',
    badgeVariant: 'red',
    slotBg: 'bg-red-700',
    slotBorder: 'border-red-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-red-600',
    indicatorBg: 'bg-red-500',
  },

  [EquipmentCategory.MISSILE_WEAPON]: {
    label: 'Missile',
    badgeVariant: 'teal',
    slotBg: 'bg-teal-700',
    slotBorder: 'border-teal-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-teal-600',
    indicatorBg: 'bg-teal-500',
  },

  [EquipmentCategory.ARTILLERY]: {
    label: 'Artillery',
    badgeVariant: 'violet',
    slotBg: 'bg-violet-700',
    slotBorder: 'border-violet-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-violet-600',
    indicatorBg: 'bg-violet-500',
  },

  [EquipmentCategory.CAPITAL_WEAPON]: {
    label: 'Capital',
    badgeVariant: 'fuchsia',
    slotBg: 'bg-fuchsia-700',
    slotBorder: 'border-fuchsia-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-fuchsia-600',
    indicatorBg: 'bg-fuchsia-500',
  },

  [EquipmentCategory.PHYSICAL_WEAPON]: {
    label: 'Physical',
    badgeVariant: 'rose',
    slotBg: 'bg-rose-700',
    slotBorder: 'border-rose-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-rose-600',
    indicatorBg: 'bg-rose-500',
  },

  // -------------------------------------------------------------------------
  // AMMUNITION - Yellow (different shade than cockpit's yellow-600)
  // -------------------------------------------------------------------------

  [EquipmentCategory.AMMUNITION]: {
    label: 'Ammo',
    badgeVariant: 'amber',
    slotBg: 'bg-amber-600',
    slotBorder: 'border-amber-700',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-amber-500',
    indicatorBg: 'bg-amber-400',
  },

  // -------------------------------------------------------------------------
  // OTHER EQUIPMENT - Avoiding reserved system component colors
  // -------------------------------------------------------------------------

  [EquipmentCategory.ELECTRONICS]: {
    label: 'Electronics',
    badgeVariant: 'cyan',
    slotBg: 'bg-cyan-700',
    slotBorder: 'border-cyan-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-cyan-600',
    indicatorBg: 'bg-cyan-500',
  },

  [EquipmentCategory.MOVEMENT]: {
    label: 'Movement',
    badgeVariant: 'emerald',
    slotBg: 'bg-emerald-700',
    slotBorder: 'border-emerald-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-emerald-600',
    indicatorBg: 'bg-emerald-500',
  },

  [EquipmentCategory.STRUCTURAL]: {
    label: 'Structural',
    badgeVariant: 'lime',
    slotBg: 'bg-lime-700',
    slotBorder: 'border-lime-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-lime-600',
    indicatorBg: 'bg-lime-500',
  },

  [EquipmentCategory.MISC_EQUIPMENT]: {
    label: 'Misc',
    badgeVariant: 'slate',
    slotBg: 'bg-slate-700',
    slotBorder: 'border-slate-800',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-slate-600',
    indicatorBg: 'bg-slate-500',
  },
};

export const HEATSINK_COLORS: CategoryColorDefinition = {
  label: 'Heat Sink',
  badgeVariant: 'cyan',
  slotBg: 'bg-cyan-700',
  slotBorder: 'border-cyan-800',
  slotText: 'text-white',
  slotHoverBg: 'hover:bg-cyan-600',
  indicatorBg: 'bg-cyan-500',
};

// =============================================================================
// Public API - Get colors for equipment
// =============================================================================

/**
 * Get full color definition for an equipment category
 */
export function getCategoryColors(
  category: EquipmentCategory,
): CategoryColorDefinition {
  return EQUIPMENT_CATEGORY_COLORS[category];
}

/**
 * Get badge variant for use with Badge component
 */
export function getCategoryBadgeVariant(category: EquipmentCategory): string {
  return EQUIPMENT_CATEGORY_COLORS[category].badgeVariant;
}

/**
 * Get label for display
 */
export function getCategoryLabel(category: EquipmentCategory): string {
  return EQUIPMENT_CATEGORY_COLORS[category].label;
}

/**
 * Get Tailwind classes for critical slot display
 */
export function getCategorySlotClasses(category: EquipmentCategory): string {
  const colors = EQUIPMENT_CATEGORY_COLORS[category];
  return `${colors.slotBg} ${colors.slotBorder} ${colors.slotText} ${colors.slotHoverBg}`;
}

/**
 * Get indicator bar class for list views
 */
export function getCategoryIndicatorClass(category: EquipmentCategory): string {
  return EQUIPMENT_CATEGORY_COLORS[category].indicatorBg;
}

export function getEquipmentSlotClassesByName(name: string): string {
  const category = classifyEquipmentByName(name);

  if (category === 'heatsink') {
    return `${HEATSINK_COLORS.slotBg} ${HEATSINK_COLORS.slotBorder} ${HEATSINK_COLORS.slotText} ${HEATSINK_COLORS.slotHoverBg}`;
  }

  return getCategorySlotClasses(category);
}
