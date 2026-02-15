/**
 * Legacy Equipment Color API
 * Backward compatibility layer for old color system
 * @deprecated Use EQUIPMENT_CATEGORY_COLORS instead
 */

import { EquipmentCategory } from '@/types/equipment';

import { EQUIPMENT_CATEGORY_COLORS } from './equipmentColors';
import { classifyEquipmentByName } from './equipmentColors.classification';

// =============================================================================
// Legacy Types
// =============================================================================

/**
 * Legacy equipment color type for backward compatibility
 * @deprecated Use EquipmentCategory directly
 */
export type EquipmentColorType =
  | 'weapon'
  | 'ammunition'
  | 'heatsink'
  | 'electronics'
  | 'physical'
  | 'movement'
  | 'structural'
  | 'misc';

/**
 * Legacy color definition for backward compatibility
 */
export interface EquipmentColorDefinition {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
  readonly hoverBg: string;
  readonly badge: string;
}

// =============================================================================
// Legacy Color Map
// =============================================================================

/**
 * @deprecated Use EQUIPMENT_CATEGORY_COLORS instead
 */
export const EQUIPMENT_COLORS: Record<
  EquipmentColorType,
  EquipmentColorDefinition
> = {
  weapon: {
    bg: 'bg-yellow-600',
    border: 'border-yellow-700',
    text: 'text-black',
    hoverBg: 'hover:bg-yellow-500',
    badge: 'bg-yellow-500 text-black',
  },
  ammunition: {
    bg: 'bg-amber-600',
    border: 'border-amber-700',
    text: 'text-white',
    hoverBg: 'hover:bg-amber-500',
    badge: 'bg-amber-500 text-white',
  },
  heatsink: {
    bg: 'bg-cyan-700',
    border: 'border-cyan-800',
    text: 'text-white',
    hoverBg: 'hover:bg-cyan-600',
    badge: 'bg-cyan-600 text-white',
  },
  electronics: {
    bg: 'bg-cyan-700',
    border: 'border-cyan-800',
    text: 'text-white',
    hoverBg: 'hover:bg-cyan-600',
    badge: 'bg-cyan-600 text-white',
  },
  physical: {
    bg: 'bg-rose-700',
    border: 'border-rose-800',
    text: 'text-white',
    hoverBg: 'hover:bg-rose-600',
    badge: 'bg-rose-600 text-white',
  },
  movement: {
    bg: 'bg-emerald-700',
    border: 'border-emerald-800',
    text: 'text-white',
    hoverBg: 'hover:bg-emerald-600',
    badge: 'bg-emerald-600 text-white',
  },
  structural: {
    bg: 'bg-lime-700',
    border: 'border-lime-800',
    text: 'text-white',
    hoverBg: 'hover:bg-lime-600',
    badge: 'bg-lime-600 text-white',
  },
  misc: {
    bg: 'bg-slate-700',
    border: 'border-slate-800',
    text: 'text-white',
    hoverBg: 'hover:bg-slate-600',
    badge: 'bg-slate-600 text-white',
  },
};

// =============================================================================
// Legacy API Functions
// =============================================================================

/**
 * @deprecated Use getCategoryColors instead
 */
export function getEquipmentColors(
  colorType: EquipmentColorType,
): EquipmentColorDefinition {
  return EQUIPMENT_COLORS[colorType];
}

/**
 * Get equipment colors in legacy format for a specific category.
 * This provides per-category colors (Energy=yellow, Ballistic=red, Missile=teal, etc.)
 * instead of grouping all weapons into a single color.
 */
export function getCategoryColorsLegacy(
  category: EquipmentCategory,
): EquipmentColorDefinition {
  const cat = EQUIPMENT_CATEGORY_COLORS[category];
  return {
    bg: cat.slotBg,
    border: cat.slotBorder,
    text: cat.slotText,
    hoverBg: cat.slotHoverBg,
    badge: `${cat.slotBg} ${cat.slotText}`,
  };
}

/**
 * @deprecated Use getCategorySlotClasses instead
 */
export function getEquipmentColorClasses(
  colorType: EquipmentColorType,
): string {
  const colors = getEquipmentColors(colorType);
  return `${colors.bg} ${colors.border} ${colors.text} ${colors.hoverBg}`;
}

/**
 * @deprecated Use classifyEquipmentByName instead
 */
export function classifyEquipment(name: string): EquipmentColorType {
  const category = classifyEquipmentByName(name);

  if (category === 'heatsink') return 'heatsink';

  // Map category to legacy type
  switch (category) {
    case EquipmentCategory.ENERGY_WEAPON:
    case EquipmentCategory.BALLISTIC_WEAPON:
    case EquipmentCategory.MISSILE_WEAPON:
    case EquipmentCategory.ARTILLERY:
    case EquipmentCategory.CAPITAL_WEAPON:
      return 'weapon';
    case EquipmentCategory.AMMUNITION:
      return 'ammunition';
    case EquipmentCategory.ELECTRONICS:
      return 'electronics';
    case EquipmentCategory.PHYSICAL_WEAPON:
      return 'physical';
    case EquipmentCategory.MOVEMENT:
      return 'movement';
    case EquipmentCategory.STRUCTURAL:
      return 'structural';
    default:
      return 'misc';
  }
}

/**
 * @deprecated Use categoryToColorType from legacy map
 */
export function categoryToColorType(
  category: EquipmentCategory,
): EquipmentColorType {
  switch (category) {
    case EquipmentCategory.ENERGY_WEAPON:
    case EquipmentCategory.BALLISTIC_WEAPON:
    case EquipmentCategory.MISSILE_WEAPON:
    case EquipmentCategory.ARTILLERY:
    case EquipmentCategory.CAPITAL_WEAPON:
      return 'weapon';
    case EquipmentCategory.AMMUNITION:
      return 'ammunition';
    case EquipmentCategory.ELECTRONICS:
      return 'electronics';
    case EquipmentCategory.PHYSICAL_WEAPON:
      return 'physical';
    case EquipmentCategory.MOVEMENT:
      return 'movement';
    case EquipmentCategory.STRUCTURAL:
      return 'structural';
    default:
      return 'misc';
  }
}

/**
 * @deprecated Use getEquipmentSlotClassesByName instead
 */
export function getBattleTechEquipmentClasses(
  equipmentName: string,
  isSelected: boolean = false,
): string {
  const category = classifyEquipmentByName(equipmentName);

  let classes: string;
  if (category === 'heatsink') {
    const colors = EQUIPMENT_COLORS.heatsink;
    classes = `${colors.bg} ${colors.border} ${colors.text} ${colors.hoverBg}`;
  } else {
    const cat = EQUIPMENT_CATEGORY_COLORS[category];
    classes = `${cat.slotBg} ${cat.slotBorder} ${cat.slotText} ${cat.slotHoverBg}`;
  }

  const baseClasses = `${classes} border rounded transition-colors`;

  if (isSelected) {
    return `${baseClasses} ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900`;
  }

  return baseClasses;
}
