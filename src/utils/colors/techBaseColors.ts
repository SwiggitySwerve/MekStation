/**
 * Tech Base Color System
 *
 * Colors to distinguish Inner Sphere and Clan technology.
 * Per spec: TechBase is binary (INNER_SPHERE or CLAN only).
 * Mixed tech is a unit-level mode, not a component tech base value.
 *
 * @spec openspec/specs/color-system/spec.md
 * @spec openspec/specs/validation-rules-master/spec.md (VAL-ENUM-001, VAL-ENUM-004)
 */

import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

/**
 * Tech base color definitions
 */
export interface TechBaseColorDefinition {
  readonly text: string;
  readonly bg: string;
  readonly border: string;
  readonly badge: string;
  readonly accent: string;
}

/**
 * Component tech base colors (binary: IS or Clan only)
 *
 * - Inner Sphere: blue (text-blue-400)
 * - Clan: green (text-green-400)
 */
export const TECH_BASE_COLORS: Record<TechBase, TechBaseColorDefinition> = {
  [TechBase.INNER_SPHERE]: {
    text: 'text-blue-400',
    bg: 'bg-blue-900/50',
    border: 'border-blue-700',
    badge: 'bg-blue-700 text-blue-100',
    accent: '#60a5fa', // blue-400
  },
  [TechBase.CLAN]: {
    text: 'text-green-400',
    bg: 'bg-green-900/50',
    border: 'border-green-700',
    badge: 'bg-green-700 text-green-100',
    accent: '#4ade80', // green-400
  },
};

/**
 * Unit-level tech base mode colors (for mixed tech display)
 * Note: This is for UI display of unit modes, not component tech base
 */
export const TECH_BASE_MODE_COLORS: Record<
  TechBaseMode,
  TechBaseColorDefinition
> = {
  inner_sphere: TECH_BASE_COLORS[TechBase.INNER_SPHERE],
  clan: TECH_BASE_COLORS[TechBase.CLAN],
  mixed: {
    text: 'text-purple-400',
    bg: 'bg-purple-900/50',
    border: 'border-purple-700',
    badge: 'bg-purple-700 text-purple-100',
    accent: '#c084fc', // purple-400
  },
};

/**
 * Default colors for unknown tech base
 */
const DEFAULT_TECH_COLORS: TechBaseColorDefinition = {
  text: 'text-slate-400',
  bg: 'bg-slate-900/50',
  border: 'border-slate-700',
  badge: 'bg-slate-700 text-slate-100',
  accent: '#94a3b8', // slate-400
};

/**
 * Get colors for a component tech base (binary: IS or Clan)
 */
export function getTechBaseColors(techBase: TechBase): TechBaseColorDefinition {
  return TECH_BASE_COLORS[techBase] || DEFAULT_TECH_COLORS;
}

/**
 * Get colors for a unit-level tech base mode
 */
export function getTechBaseModeColors(
  mode: TechBaseMode,
): TechBaseColorDefinition {
  return TECH_BASE_MODE_COLORS[mode] || DEFAULT_TECH_COLORS;
}

/**
 * Get the badge class string for a tech base
 */
export function getTechBaseBadgeClass(techBase: TechBase): string {
  const colors = getTechBaseColors(techBase);
  return `${colors.badge} px-2 py-0.5 rounded text-xs font-medium`;
}

/**
 * Get short display name for tech base
 */
export function getTechBaseShortName(techBase: TechBase): string {
  switch (techBase) {
    case TechBase.INNER_SPHERE:
      return 'IS';
    case TechBase.CLAN:
      return 'Clan';
    default:
      return String(techBase);
  }
}

/**
 * Get short display name for tech base mode
 */
export function getTechBaseModeShortName(mode: TechBaseMode): string {
  switch (mode) {
    case TechBaseMode.INNER_SPHERE:
      return 'IS';
    case TechBaseMode.CLAN:
      return 'Clan';
    case TechBaseMode.MIXED:
      return 'Mixed';
    default:
      return String(mode);
  }
}
