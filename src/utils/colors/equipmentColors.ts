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

// =============================================================================
// Types
// =============================================================================

/**
 * Complete color definition for an equipment category
 */
export interface CategoryColorDefinition {
  /** Display label for the category */
  readonly label: string;
  /** Badge variant name (for Badge component) */
  readonly badgeVariant: string;
  /** Tailwind bg class for critical slots */
  readonly slotBg: string;
  /** Tailwind border class for critical slots */
  readonly slotBorder: string;
  /** Tailwind text class */
  readonly slotText: string;
  /** Tailwind hover bg class */
  readonly slotHoverBg: string;
  /** Tailwind bg class for list view indicator bars */
  readonly indicatorBg: string;
}

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

// =============================================================================
// Heat Sinks - Special case (not in EquipmentCategory enum)
// =============================================================================

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
// Ammunition Sub-Types - Colored by weapon type
// =============================================================================

export type AmmoSubType = 'missile' | 'ballistic' | 'generic';

/** Missile ammo - Mint colored */
export const MISSILE_AMMO_COLORS: CategoryColorDefinition = {
  label: 'Missile Ammo',
  badgeVariant: 'emerald',
  slotBg: 'bg-emerald-600',
  slotBorder: 'border-emerald-700',
  slotText: 'text-white',
  slotHoverBg: 'hover:bg-emerald-500',
  indicatorBg: 'bg-emerald-400',
};

/** Ballistic ammo - Amber colored */
export const BALLISTIC_AMMO_COLORS: CategoryColorDefinition = {
  label: 'Ballistic Ammo',
  badgeVariant: 'amber',
  slotBg: 'bg-amber-600',
  slotBorder: 'border-amber-700',
  slotText: 'text-white',
  slotHoverBg: 'hover:bg-amber-500',
  indicatorBg: 'bg-amber-400',
};

/** Patterns to detect missile ammo by name */
const MISSILE_AMMO_PATTERNS = [
  'lrm',
  'srm',
  'mrm',
  'atm',
  'mml',
  'streak',
  'narc',
  'arrow iv',
  'long range missile',
  'short range missile',
  'medium range missile',
];

/** Patterns to detect ballistic ammo by name */
const BALLISTIC_AMMO_PATTERNS = [
  'ac/',
  'ac ',
  'autocannon',
  'gauss',
  'machine gun',
  'mg ',
  'lb-x',
  'lb ',
  'ultra ac',
  'uac',
  'rotary',
  'rac/',
  'light ac',
  'lac',
];

/**
 * Detect ammunition sub-type from equipment name
 */
export function detectAmmoSubType(name: string): AmmoSubType {
  const lowerName = name.toLowerCase();

  // Check for missile ammo patterns
  if (MISSILE_AMMO_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
    return 'missile';
  }

  // Check for ballistic ammo patterns
  if (BALLISTIC_AMMO_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
    return 'ballistic';
  }

  return 'generic';
}

/**
 * Get colors for ammunition based on name (detects missile vs ballistic)
 */
export function getAmmoColors(name: string): CategoryColorDefinition {
  const subType = detectAmmoSubType(name);

  switch (subType) {
    case 'missile':
      return MISSILE_AMMO_COLORS;
    case 'ballistic':
      return BALLISTIC_AMMO_COLORS;
    default:
      return EQUIPMENT_CATEGORY_COLORS[EquipmentCategory.AMMUNITION];
  }
}

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

// =============================================================================
// Name-based Classification (for equipment without category metadata)
// =============================================================================

/**
 * Patterns for classifying equipment by name.
 */
const EQUIPMENT_NAME_PATTERNS: Record<
  EquipmentCategory | 'heatsink',
  readonly string[]
> = {
  // Heat sinks (special case - not a category but needs detection)
  heatsink: ['heat sink', 'heatsink'],

  // Weapons
  [EquipmentCategory.ENERGY_WEAPON]: ['laser', 'ppc', 'flamer'],
  [EquipmentCategory.BALLISTIC_WEAPON]: [
    'autocannon',
    'ac/',
    'gauss',
    'machine gun',
    'ultra ac',
    'lb-x',
    'rotary ac',
  ],
  [EquipmentCategory.MISSILE_WEAPON]: [
    'lrm',
    'srm',
    'mrm',
    'atm',
    'mml',
    'narc',
    'streak',
  ],
  [EquipmentCategory.ARTILLERY]: ['arrow iv', 'long tom', 'sniper', 'thumper'],
  [EquipmentCategory.CAPITAL_WEAPON]: ['naval', 'capital'],
  [EquipmentCategory.PHYSICAL_WEAPON]: [
    'hatchet',
    'sword',
    'claw',
    'mace',
    'lance',
    'talons',
  ],

  // Ammunition
  [EquipmentCategory.AMMUNITION]: ['ammo', 'ammunition', 'rounds'],

  // Other
  [EquipmentCategory.ELECTRONICS]: [
    'computer',
    'ecm',
    'bap',
    'probe',
    'c3',
    'tag',
    'targeting',
  ],
  [EquipmentCategory.MOVEMENT]: [
    'jump jet',
    'masc',
    'supercharger',
    'partial wing',
    'tsm',
  ],
  [EquipmentCategory.STRUCTURAL]: [
    'endo steel',
    'endo-steel',
    'ferro-fibrous',
    'ferro fibrous',
  ],
  [EquipmentCategory.MISC_EQUIPMENT]: [],
};

/**
 * Priority order for classification
 */
const CLASSIFICATION_PRIORITY: readonly (EquipmentCategory | 'heatsink')[] = [
  'heatsink',
  EquipmentCategory.AMMUNITION,
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.CAPITAL_WEAPON,
  EquipmentCategory.ELECTRONICS,
  EquipmentCategory.PHYSICAL_WEAPON,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.STRUCTURAL,
];

/**
 * Classify equipment by name into a category.
 * Returns null for heat sinks (special case) or misc if no match.
 */
export function classifyEquipmentByName(
  name: string,
): EquipmentCategory | 'heatsink' {
  const lowerName = name.toLowerCase();

  for (const category of CLASSIFICATION_PRIORITY) {
    const patterns = EQUIPMENT_NAME_PATTERNS[category];
    if (patterns.some((pattern) => lowerName.includes(pattern))) {
      return category;
    }
  }

  return EquipmentCategory.MISC_EQUIPMENT;
}

/**
 * Get slot classes for equipment by name (when category is unknown)
 */
export function getEquipmentSlotClassesByName(name: string): string {
  const category = classifyEquipmentByName(name);

  if (category === 'heatsink') {
    return `${HEATSINK_COLORS.slotBg} ${HEATSINK_COLORS.slotBorder} ${HEATSINK_COLORS.slotText} ${HEATSINK_COLORS.slotHoverBg}`;
  }

  return getCategorySlotClasses(category);
}

// =============================================================================
// LEGACY API - Backward Compatibility
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
  const classes = getEquipmentSlotClassesByName(equipmentName);
  const baseClasses = `${classes} border rounded transition-colors`;

  if (isSelected) {
    return `${baseClasses} ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900`;
  }

  return baseClasses;
}
