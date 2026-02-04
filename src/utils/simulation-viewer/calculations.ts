/**
 * Calculate BV advantage percentage between two forces.
 * Positive values indicate player advantage, negative values indicate disadvantage.
 *
 * @param playerBV - Player force BV
 * @param enemyBV - Enemy force BV
 * @returns Advantage percentage (-100 to +100), rounded to 2 decimal places
 * @example calculateBVAdvantage(2000, 1500) // 33.33
 */
export function calculateBVAdvantage(playerBV: number, enemyBV: number): number {
  if (enemyBV === 0) return 100;
  const advantage = ((playerBV - enemyBV) / enemyBV) * 100;
  return Math.round(advantage * 100) / 100;
}

/**
 * Calculate comparison delta between current and baseline values.
 * Returns both absolute and percentage change.
 *
 * @param current - Current value
 * @param baseline - Baseline value for comparison
 * @returns Delta object with absolute and percentage change, both rounded to 2 decimal places
 * @example calculateComparisonDelta(120, 100) // { absolute: 20, percentage: 20 }
 */
export function calculateComparisonDelta(
  current: number,
  baseline: number
): { absolute: number; percentage: number } {
  const absolute = current - baseline;
  const percentage = baseline === 0 ? 0 : (absolute / baseline) * 100;
  return {
    absolute: Math.round(absolute * 100) / 100,
    percentage: Math.round(percentage * 100) / 100
  };
}
