/**
 * Heat Calculation Utility
 *
 * Utility functions for calculating and displaying heat management stats.
 * Consolidates heat-related logic used across unit cards and displays.
 */

/**
 * Calculate net heat (generated - dissipation)
 */
export function calculateHeatNet(heatGenerated: number, heatDissipation: number): number {
  return heatGenerated - heatDissipation;
}

/**
 * Format heat net value for display
 * - Positive values get a '+' prefix
 * - Negative and zero values display as-is
 *
 * @example
 * formatHeatNet(5)  // "+5"
 * formatHeatNet(-3) // "-3"
 * formatHeatNet(0)  // "0"
 */
export function formatHeatNet(heatNet: number): string {
  return heatNet > 0 ? `+${heatNet}` : heatNet.toString();
}

/**
 * Heat status variant for styling
 */
export type HeatVariant = 'hot' | 'cold' | 'neutral';

/**
 * Get semantic variant for heat status
 * - hot: Positive heat (overheating risk)
 * - cold: Negative heat (running cool)
 * - neutral: Zero heat (balanced)
 */
export function getHeatVariant(heatNet: number): HeatVariant {
  if (heatNet > 0) return 'hot';
  if (heatNet < 0) return 'cold';
  return 'neutral';
}

/**
 * CSS class mapping for heat variants
 */
export const HEAT_VARIANT_CLASSES: Record<HeatVariant, string> = {
  hot: 'text-rose-400',
  cold: 'text-cyan-400',
  neutral: 'text-text-theme-secondary',
};

/**
 * Get CSS class for heat status
 *
 * @example
 * getHeatVariantClass(5)  // "text-rose-400"
 * getHeatVariantClass(-3) // "text-cyan-400"
 * getHeatVariantClass(0)  // "text-text-theme-secondary"
 */
export function getHeatVariantClass(heatNet: number): string {
  return HEAT_VARIANT_CLASSES[getHeatVariant(heatNet)];
}

/**
 * Complete heat display info for UI components
 */
export interface HeatDisplay {
  /** Net heat value */
  net: number;
  /** Formatted display string */
  display: string;
  /** Semantic variant */
  variant: HeatVariant;
  /** CSS class for styling */
  className: string;
}

/**
 * Get all heat display information in one call
 *
 * @example
 * const heat = getHeatDisplay(15, 10);
 * // { net: 5, display: "+5", variant: "hot", className: "text-rose-400" }
 *
 * <span className={heat.className}>{heat.display}</span>
 */
export function getHeatDisplay(heatGenerated: number, heatDissipation: number): HeatDisplay {
  const net = calculateHeatNet(heatGenerated, heatDissipation);
  const variant = getHeatVariant(net);

  return {
    net,
    display: formatHeatNet(net),
    variant,
    className: HEAT_VARIANT_CLASSES[variant],
  };
}
