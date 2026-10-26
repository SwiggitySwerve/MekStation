/**
 * Equipment Color Types & Category Color Map
 *
 * Leaf module containing the shared type definition and the
 * single-source-of-truth color map. Both `equipmentColors.ammo.ts`
 * and `equipmentColors.legacy.ts` import from here to avoid creating
 * a circular dependency through `equipmentColors.ts` (the orchestrator
 * that re-exports both halves).
 *
 * Do not import from `./equipmentColors`, `./equipmentColors.ammo`,
 * or `./equipmentColors.legacy` from this file — it must remain a leaf.
 *
 * @spec openspec/specs/color-system/spec.md
 */

import { EquipmentCategory } from '@/types/equipment';

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
  /**
   * Left accent bar for neutral list/card surfaces (catalog rows, loadout
   * rail). Category reads as a thin edge instead of a full fill so warnings
   * and selection stay the most prominent color on screen.
   */
  readonly accentBorder: string;
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
 * - Cockpit uses Yellow-600 → Ammo uses a brown-amber (amber-600)
 * - The app selection accent is amber-400, so Energy uses a paler, reduced
 *   opacity yellow-300 and Ammo a deeper amber; neither reuses the exact accent
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
    slotBorder: 'border-yellow-400',
    slotText: 'text-black',
    slotHoverBg: 'hover:bg-yellow-500',
    indicatorBg: 'bg-yellow-300/70',
    accentBorder: 'border-l-yellow-300/70',
  },

  [EquipmentCategory.BALLISTIC_WEAPON]: {
    label: 'Ballistic',
    badgeVariant: 'red',
    slotBg: 'bg-red-700',
    slotBorder: 'border-red-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-red-600',
    indicatorBg: 'bg-red-500',
    accentBorder: 'border-l-red-500',
  },

  [EquipmentCategory.MISSILE_WEAPON]: {
    label: 'Missile',
    badgeVariant: 'teal',
    slotBg: 'bg-teal-700',
    slotBorder: 'border-teal-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-teal-600',
    indicatorBg: 'bg-teal-500',
    accentBorder: 'border-l-teal-500',
  },

  [EquipmentCategory.ARTILLERY]: {
    label: 'Artillery',
    badgeVariant: 'violet',
    slotBg: 'bg-violet-700',
    slotBorder: 'border-violet-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-violet-600',
    indicatorBg: 'bg-violet-500',
    accentBorder: 'border-l-violet-500',
  },

  [EquipmentCategory.CAPITAL_WEAPON]: {
    label: 'Capital',
    badgeVariant: 'fuchsia',
    slotBg: 'bg-fuchsia-700',
    slotBorder: 'border-fuchsia-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-fuchsia-600',
    indicatorBg: 'bg-fuchsia-500',
    accentBorder: 'border-l-fuchsia-500',
  },

  [EquipmentCategory.PHYSICAL_WEAPON]: {
    label: 'Physical',
    badgeVariant: 'rose',
    slotBg: 'bg-rose-700',
    slotBorder: 'border-rose-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-rose-600',
    indicatorBg: 'bg-rose-500',
    accentBorder: 'border-l-rose-500',
  },

  // -------------------------------------------------------------------------
  // AMMUNITION - Yellow (different shade than cockpit's yellow-600)
  // -------------------------------------------------------------------------

  [EquipmentCategory.AMMUNITION]: {
    label: 'Ammo',
    badgeVariant: 'amber',
    slotBg: 'bg-amber-600',
    slotBorder: 'border-amber-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-amber-500',
    indicatorBg: 'bg-amber-600',
    accentBorder: 'border-l-amber-600',
  },

  // -------------------------------------------------------------------------
  // OTHER EQUIPMENT - Avoiding reserved system component colors
  // -------------------------------------------------------------------------

  [EquipmentCategory.ELECTRONICS]: {
    label: 'Electronics',
    badgeVariant: 'cyan',
    slotBg: 'bg-cyan-700',
    slotBorder: 'border-cyan-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-cyan-600',
    indicatorBg: 'bg-cyan-500',
    accentBorder: 'border-l-cyan-500',
  },

  [EquipmentCategory.MOVEMENT]: {
    label: 'Movement',
    badgeVariant: 'emerald',
    slotBg: 'bg-emerald-700',
    slotBorder: 'border-emerald-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-emerald-600',
    indicatorBg: 'bg-emerald-500',
    accentBorder: 'border-l-emerald-500',
  },

  [EquipmentCategory.STRUCTURAL]: {
    label: 'Structural',
    badgeVariant: 'lime',
    slotBg: 'bg-lime-700',
    slotBorder: 'border-lime-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-lime-600',
    indicatorBg: 'bg-lime-500',
    accentBorder: 'border-l-lime-500',
  },

  [EquipmentCategory.MISC_EQUIPMENT]: {
    label: 'Misc',
    badgeVariant: 'slate',
    slotBg: 'bg-slate-700',
    slotBorder: 'border-slate-400',
    slotText: 'text-white',
    slotHoverBg: 'hover:bg-slate-600',
    indicatorBg: 'bg-slate-500',
    accentBorder: 'border-l-slate-500',
  },
};
