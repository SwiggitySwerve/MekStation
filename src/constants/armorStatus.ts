/**
 * Armor Status Thresholds and Colors
 *
 * UI constants for armor status visualization.
 * Defines color thresholds based on armor percentage ratios.
 */

/**
 * Status thresholds for armor coloring
 */
export const ARMOR_STATUS = {
  HEALTHY: { min: 0.6, color: '#22c55e' }, // green-500  (≥60%)
  MODERATE: { min: 0.4, color: '#f59e0b' }, // amber-500  (≥40%)
  LOW: { min: 0.2, color: '#f97316' }, // orange-500 (≥20%)
  CRITICAL: { min: 0, color: '#ef4444' }, // red-500    (<20%)
} as const;
