/**
 * Equipment Category Color System - Public Aggregator
 *
 * Re-exports the full equipment color API from the leaf modules and
 * provides the high-level `getCategory*` helpers used across the UI.
 *
 * The shared types and the SINGLE SOURCE OF TRUTH category color map
 * live in `equipmentColors.types.ts` (a leaf module). The legacy
 * compatibility layer lives in `equipmentColors.legacy.ts`. The ammo
 * sub-type detection lives in `equipmentColors.ammo.ts`. None of those
 * may import from this file — that would re-introduce the cycle.
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
import {
  EQUIPMENT_CATEGORY_COLORS,
  type CategoryColorDefinition,
} from './equipmentColors.types';

// Re-export the shared type + map so existing consumers keep working.
export {
  EQUIPMENT_CATEGORY_COLORS,
  type CategoryColorDefinition,
} from './equipmentColors.types';

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
