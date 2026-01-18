/**
 * Armor Color Utilities
 *
 * Shared color constants and utility functions for armor visualization.
 * Used across armor diagrams, validation rules, and tests.
 *
 * @module utils/armor/armorColors
 */

/**
 * Status thresholds for armor coloring
 */
export const ARMOR_STATUS = {
  HEALTHY: { min: 0.6, color: '#22c55e' },     // green-500  (≥60%)
  MODERATE: { min: 0.4, color: '#f59e0b' },    // amber-500  (≥40%)
  LOW: { min: 0.2, color: '#f97316' },         // orange-500 (≥20%)
  CRITICAL: { min: 0, color: '#ef4444' },      // red-500    (<20%)
} as const;

export const SELECTED_COLOR = '#3b82f6';        // blue-500
export const SELECTED_STROKE = '#60a5fa';       // blue-400
export const HOVER_LIGHTEN = 0.15;

// Front/Rear armor colors for consistent UI
export const FRONT_ARMOR_COLOR = '#f59e0b';     // amber-500
export const REAR_ARMOR_COLOR = '#0ea5e9';      // sky-500
export const FRONT_ARMOR_LIGHT = '#fbbf24';     // amber-400
export const REAR_ARMOR_LIGHT = '#38bdf8';      // sky-400

/**
 * MegaMek-specific record sheet colors
 * Uses beige/cream palette for authentic appearance
 */
export const MEGAMEK_COLORS = {
  HEALTHY: '#d4c896',     // Warm beige - high armor
  MODERATE: '#c9a868',    // Tan/amber - moderate armor
  LOW: '#b8905a',         // Brown-tan - low armor
  CRITICAL: '#a3694a',    // Brown-red - critical armor
  OUTLINE: '#8b7355',     // Brown/sepia outline
  SHADOW: '#1a1a1a',      // Shadow color
} as const;

/**
 * Standard front/rear armor distribution ratio (75/25 split)
 */
export const FRONT_RATIO = 0.75;
export const REAR_RATIO = 0.25;

/**
 * Get status color based on armor percentage
 */
export function getArmorStatusColor(current: number, maximum: number): string {
  if (maximum === 0) return ARMOR_STATUS.CRITICAL.color;
  const ratio = current / maximum;

  if (ratio >= ARMOR_STATUS.HEALTHY.min) return ARMOR_STATUS.HEALTHY.color;
  if (ratio >= ARMOR_STATUS.MODERATE.min) return ARMOR_STATUS.MODERATE.color;
  if (ratio >= ARMOR_STATUS.LOW.min) return ARMOR_STATUS.LOW.color;
  return ARMOR_STATUS.CRITICAL.color;
}

/**
 * Get MegaMek status color (beige palette) based on armor percentage
 */
export function getMegaMekStatusColor(current: number, maximum: number): string {
  if (maximum === 0) return MEGAMEK_COLORS.CRITICAL;
  const ratio = current / maximum;

  if (ratio >= ARMOR_STATUS.HEALTHY.min) return MEGAMEK_COLORS.HEALTHY;
  if (ratio >= ARMOR_STATUS.MODERATE.min) return MEGAMEK_COLORS.MODERATE;
  if (ratio >= ARMOR_STATUS.LOW.min) return MEGAMEK_COLORS.LOW;
  return MEGAMEK_COLORS.CRITICAL;
}

/**
 * Get MegaMek front torso status color
 */
export function getMegaMekFrontStatusColor(frontCurrent: number, totalMax: number): string {
  const expectedFrontMax = Math.round(totalMax * FRONT_RATIO);
  return getMegaMekStatusColor(frontCurrent, expectedFrontMax);
}

/**
 * Get MegaMek rear torso status color
 */
export function getMegaMekRearStatusColor(rearCurrent: number, totalMax: number): string {
  const expectedRearMax = Math.round(totalMax * REAR_RATIO);
  return getMegaMekStatusColor(rearCurrent, expectedRearMax);
}

/**
 * Get status color for torso front armor based on expected capacity
 *
 * Uses 75/25 split as baseline - front "expected max" is 75% of total max.
 * This ensures front armor shows green when at expected capacity,
 * even though front has more raw points than rear.
 *
 * @param frontCurrent - Current front armor points
 * @param totalMax - Total max armor for location (front + rear combined)
 * @returns Status color
 */
export function getTorsoFrontStatusColor(frontCurrent: number, totalMax: number): string {
  const expectedFrontMax = Math.round(totalMax * FRONT_RATIO);
  return getArmorStatusColor(frontCurrent, expectedFrontMax);
}

/**
 * Get status color for torso rear armor based on expected capacity
 *
 * Uses 75/25 split as baseline - rear "expected max" is 25% of total max.
 *
 * @param rearCurrent - Current rear armor points
 * @param totalMax - Total max armor for location (front + rear combined)
 * @returns Status color
 */
export function getTorsoRearStatusColor(rearCurrent: number, totalMax: number): string {
  const expectedRearMax = Math.round(totalMax * REAR_RATIO);
  return getArmorStatusColor(rearCurrent, expectedRearMax);
}

/**
 * Get status color for a torso location based on total (front + rear) armor
 * For non-torso locations, use getArmorStatusColor instead
 */
export function getTorsoStatusColor(
  frontCurrent: number,
  frontMax: number,
  rearCurrent: number = 0
): string {
  // Total max is frontMax (which is the full location max)
  // Total current is front + rear
  const totalCurrent = frontCurrent + rearCurrent;
  const totalMax = frontMax;

  return getArmorStatusColor(totalCurrent, totalMax);
}

/**
 * Calculate fill percentage for a torso location based on total (front + rear)
 */
export function getTorsoFillPercent(
  frontCurrent: number,
  frontMax: number,
  rearCurrent: number = 0
): number {
  const totalCurrent = frontCurrent + rearCurrent;
  const totalMax = frontMax;

  if (totalMax === 0) return 0;
  return Math.min(100, (totalCurrent / totalMax) * 100);
}

/**
 * Lighten a hex color
 */
export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Darken a hex color
 */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Get gradient ID based on armor ratio
 */
export function getArmorGradientId(current: number, maximum: number, isSelected: boolean): string {
  if (isSelected) return 'url(#armor-gradient-selected)';
  if (maximum === 0) return 'url(#armor-gradient-critical)';

  const ratio = current / maximum;
  if (ratio >= ARMOR_STATUS.HEALTHY.min) return 'url(#armor-gradient-healthy)';
  if (ratio >= ARMOR_STATUS.MODERATE.min) return 'url(#armor-gradient-moderate)';
  if (ratio >= ARMOR_STATUS.LOW.min) return 'url(#armor-gradient-low)';
  return 'url(#armor-gradient-critical)';
}
