/**
 * Status and Interactive State Colors
 * 
 * Colors for validation states, allocation status, and interactive feedback.
 * 
 * @spec openspec/specs/color-system/spec.md
 */

/**
 * Validation status types
 */
export type ValidationStatus = 'valid' | 'warning' | 'error' | 'info';

/**
 * Allocation status types
 */
export type AllocationStatus = 'allocated' | 'unallocated' | 'partial';

/**
 * Interactive state types
 */
export type InteractiveState = 'default' | 'hover' | 'selected' | 'dropValid' | 'dropInvalid' | 'disabled';

/**
 * Validation status color definitions
 */
export const VALIDATION_COLORS: Record<ValidationStatus, { bg: string; text: string; border: string; icon: string }> = {
  valid: {
    bg: 'bg-green-900/50',
    text: 'text-green-400',
    border: 'border-green-600',
    icon: '✓',
  },
  warning: {
    bg: 'bg-yellow-900/50',
    text: 'text-yellow-400',
    border: 'border-yellow-600',
    icon: '⚠',
  },
  error: {
    bg: 'bg-red-900/50',
    text: 'text-red-400',
    border: 'border-red-600',
    icon: '✕',
  },
  info: {
    bg: 'bg-blue-900/50',
    text: 'text-blue-400',
    border: 'border-blue-600',
    icon: 'ℹ',
  },
};

/**
 * Allocation status color definitions
 */
export const ALLOCATION_COLORS: Record<AllocationStatus, { bg: string; text: string; badge: string }> = {
  allocated: {
    bg: 'bg-green-900/30',
    text: 'text-green-400',
    badge: 'bg-green-700 text-green-100',
  },
  unallocated: {
    bg: 'bg-red-900/30',
    text: 'text-red-400',
    badge: 'bg-red-700 text-red-100',
  },
  partial: {
    bg: 'bg-yellow-900/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-700 text-yellow-100',
  },
};

/**
 * Interactive state color definitions
 */
export const INTERACTIVE_COLORS: Record<InteractiveState, { bg: string; border: string; ring?: string; cursor: string }> = {
  default: {
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    cursor: 'cursor-pointer',
  },
  hover: {
    bg: 'bg-slate-700',
    border: 'border-slate-600',
    cursor: 'cursor-pointer',
  },
  selected: {
    bg: 'bg-blue-900/50',
    border: 'border-blue-500',
    ring: 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900',
    cursor: 'cursor-pointer',
  },
  dropValid: {
    bg: 'bg-green-900/50',
    border: 'border-green-500',
    ring: 'ring-2 ring-green-400',
    cursor: 'cursor-copy',
  },
  dropInvalid: {
    bg: 'bg-red-900/50',
    border: 'border-red-500',
    ring: 'ring-2 ring-red-400',
    cursor: 'cursor-not-allowed',
  },
  disabled: {
    bg: 'bg-slate-900',
    border: 'border-slate-800',
    cursor: 'cursor-not-allowed',
  },
};

/**
 * Get validation status colors
 */
export function getValidationColors(status: ValidationStatus): { bg: string; text: string; border: string; icon: string } {
  return VALIDATION_COLORS[status];
}

/**
 * Get allocation status colors
 */
export function getAllocationColors(status: AllocationStatus): { bg: string; text: string; badge: string } {
  return ALLOCATION_COLORS[status];
}

/**
 * Get interactive state colors
 */
export function getInteractiveColors(state: InteractiveState): { bg: string; border: string; ring?: string; cursor: string } {
  return INTERACTIVE_COLORS[state];
}

/**
 * Build class string for a validation indicator
 */
export function getValidationIndicatorClasses(status: ValidationStatus): string {
  const colors = getValidationColors(status);
  return `${colors.bg} ${colors.text} ${colors.border} border rounded px-2 py-1`;
}

/**
 * Build class string for an allocation badge
 */
export function getAllocationBadgeClasses(status: AllocationStatus): string {
  const colors = getAllocationColors(status);
  return `${colors.badge} px-2 py-0.5 rounded text-xs font-medium`;
}

/**
 * Build class string for interactive elements
 */
export function getInteractiveClasses(state: InteractiveState): string {
  const colors = getInteractiveColors(state);
  let classes = `${colors.bg} ${colors.border} ${colors.cursor} border transition-colors`;
  if (colors.ring) {
    classes += ` ${colors.ring}`;
  }
  return classes;
}

/**
 * Armor diagram location colors
 */
export const ARMOR_LOCATION_COLORS = {
  head: {
    default: 'bg-green-600',
    hover: 'bg-green-500',
    selected: 'bg-blue-600',
  },
  torso: {
    default: 'bg-amber-600',
    hover: 'bg-amber-500',
    selected: 'bg-blue-600',
  },
  rear: {
    default: 'bg-amber-800',
    hover: 'bg-amber-700',
    selected: 'bg-blue-700',
  },
  limb: {
    default: 'bg-amber-600',
    hover: 'bg-amber-500',
    selected: 'bg-blue-600',
  },
};

/**
 * Get armor location color class
 */
export function getArmorLocationColorClass(
  locationType: 'head' | 'torso' | 'rear' | 'limb',
  state: 'default' | 'hover' | 'selected'
): string {
  return ARMOR_LOCATION_COLORS[locationType][state];
}

