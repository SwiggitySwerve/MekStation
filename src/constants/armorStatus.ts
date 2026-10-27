/**
 * Armor Status Thresholds and Colors
 *
 * UI constants for armor status visualization.
 * Defines color thresholds based on armor percentage ratios.
 *
 * This is the single owner of the four armor health colours (green, yellow,
 * orange, red). Diagrams, legends, gradients and the utils/armor helpers all
 * read from here; keep the hues clearly distinct from one another.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

/**
 * Status thresholds for armor coloring
 */
export const ARMOR_STATUS = {
  HEALTHY: { min: 0.6, color: '#22c55e' }, // green-500  (≥60%)
  MODERATE: { min: 0.4, color: '#facc15' }, // yellow-400 (≥40%)
  LOW: { min: 0.2, color: '#f97316' }, // orange-500 (≥20%)
  CRITICAL: { min: 0, color: '#dc2626' }, // red-600    (<20%)
} as const;
