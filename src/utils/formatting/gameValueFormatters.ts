/**
 * Game Value Formatters
 *
 * Formatting utilities for BattleTech game-specific values like
 * Battle Value, tonnage, C-Bills, and armor points.
 *
 * @module utils/formatting/gameValueFormatters
 */

/**
 * Format Battle Value (BV) with thousands separator
 *
 * @param bv - Battle Value to format
 * @returns Formatted BV string (e.g., "1,234 BV")
 *
 * @example
 * formatBV(1234) // "1,234 BV"
 * formatBV(0)    // "0 BV"
 */
export function formatBV(bv: number): string {
  return `${bv.toLocaleString('en-US')} BV`;
}

/**
 * Format weight in tons
 *
 * @param tons - Weight in tons
 * @param precision - Decimal places (default 1 for half-ton precision)
 * @returns Formatted weight string (e.g., "75 tons", "35.5 tons")
 *
 * @example
 * formatWeight(75)    // "75 tons"
 * formatWeight(35.5)  // "35.5 tons"
 * formatWeight(100)   // "100 tons"
 */
export function formatWeight(tons: number, precision = 1): string {
  // Remove unnecessary decimal places for whole numbers
  const formatted = Number.isInteger(tons)
    ? tons.toString()
    : tons.toFixed(precision);
  return `${formatted} ton${tons === 1 ? '' : 's'}`;
}

/**
 * Format cost in C-Bills with appropriate suffix (K, M, B)
 *
 * @param cbills - Cost in C-Bills
 * @returns Formatted cost string (e.g., "1.5M C-Bills")
 *
 * @example
 * formatCost(1500000)   // "1.5M C-Bills"
 * formatCost(750000)    // "750K C-Bills"
 * formatCost(500)       // "500 C-Bills"
 */
export function formatCost(cbills: number): string {
  if (cbills >= 1_000_000_000) {
    const value = cbills / 1_000_000_000;
    return `${value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, '')}B C-Bills`;
  }
  if (cbills >= 1_000_000) {
    const value = cbills / 1_000_000;
    return `${value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, '')}M C-Bills`;
  }
  if (cbills >= 1_000) {
    const value = cbills / 1_000;
    return `${value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, '')}K C-Bills`;
  }
  return `${cbills.toLocaleString('en-US')} C-Bills`;
}

/**
 * Format cost in C-Bills with full number (no abbreviation)
 *
 * @param cbills - Cost in C-Bills
 * @returns Formatted cost string (e.g., "1,500,000 C-Bills")
 *
 * @example
 * formatCostFull(1500000) // "1,500,000 C-Bills"
 */
export function formatCostFull(cbills: number): string {
  return `${cbills.toLocaleString('en-US')} C-Bills`;
}

/**
 * Format armor points
 *
 * @param points - Number of armor points
 * @param maxPoints - Optional maximum points for display as fraction
 * @returns Formatted armor string (e.g., "45 pts", "45/50 pts")
 *
 * @example
 * formatArmorPoints(45)      // "45 pts"
 * formatArmorPoints(45, 50)  // "45/50 pts"
 */
export function formatArmorPoints(points: number, maxPoints?: number): string {
  if (maxPoints !== undefined) {
    return `${points}/${maxPoints} pts`;
  }
  return `${points} pts`;
}

/**
 * Format heat value
 *
 * @param heat - Heat value
 * @returns Formatted heat string (e.g., "+5 heat", "-3 heat")
 *
 * @example
 * formatHeat(5)   // "+5 heat"
 * formatHeat(-3)  // "-3 heat"
 * formatHeat(0)   // "0 heat"
 */
export function formatHeat(heat: number): string {
  const sign = heat > 0 ? '+' : '';
  return `${sign}${heat} heat`;
}

/**
 * Format damage value
 *
 * @param damage - Damage value
 * @returns Formatted damage string (e.g., "10 dmg")
 *
 * @example
 * formatDamage(10) // "10 dmg"
 */
export function formatDamage(damage: number): string {
  return `${damage} dmg`;
}

/**
 * Format range in hexes
 *
 * @param short - Short range in hexes
 * @param medium - Medium range in hexes
 * @param long - Long range in hexes
 * @returns Formatted range string (e.g., "3/6/9")
 *
 * @example
 * formatRange(3, 6, 9) // "3/6/9"
 */
export function formatRange(
  short: number,
  medium: number,
  long: number,
): string {
  return `${short}/${medium}/${long}`;
}

/**
 * Format movement points
 *
 * @param walk - Walking MP
 * @param run - Running MP (optional, calculated as walk * 1.5 if not provided)
 * @param jump - Jump MP (optional)
 * @returns Formatted movement string (e.g., "4/6", "4/6/4")
 *
 * @example
 * formatMovement(4, 6)    // "4/6"
 * formatMovement(4, 6, 4) // "4/6/4"
 */
export function formatMovement(
  walk: number,
  run?: number,
  jump?: number,
): string {
  const actualRun = run ?? Math.ceil(walk * 1.5);
  if (jump !== undefined && jump > 0) {
    return `${walk}/${actualRun}/${jump}`;
  }
  return `${walk}/${actualRun}`;
}
