/**
 * Aerospace Engine Weight Calculator
 *
 * Computes engine tonnage for aerospace units based on rating and engine type.
 * Uses the standard fusion engine weight table (TechManual p.49) with
 * per-type multipliers. ICE doubles standard weight; XL halves it.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

import { AerospaceEngineType } from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Standard Engine Weight Table (rating → tons, fusion baseline)
// ============================================================================

/**
 * Fusion engine weight by rating. Matches TechManual p.49.
 * Ratings not in this table are interpolated via the formula below.
 */
const FUSION_ENGINE_WEIGHT: Record<number, number> = {
  10: 0.5,
  15: 0.5,
  20: 0.5,
  25: 0.5,
  30: 1.0,
  35: 1.0,
  40: 1.0,
  45: 1.0,
  50: 1.5,
  55: 1.5,
  60: 1.5,
  65: 2.0,
  70: 2.0,
  75: 2.0,
  80: 2.5,
  85: 2.5,
  90: 3.0,
  95: 3.0,
  100: 3.0,
  105: 3.5,
  110: 3.5,
  115: 4.0,
  120: 4.0,
  125: 4.0,
  130: 4.5,
  135: 4.5,
  140: 5.0,
  145: 5.0,
  150: 5.5,
  155: 5.5,
  160: 6.0,
  165: 6.0,
  170: 6.0,
  175: 7.0,
  180: 7.0,
  185: 7.5,
  190: 7.5,
  195: 8.0,
  200: 8.5,
  205: 8.5,
  210: 9.0,
  215: 9.0,
  220: 10.0,
  225: 10.0,
  230: 10.5,
  235: 10.5,
  240: 11.5,
  245: 11.5,
  250: 12.5,
  255: 12.5,
  260: 13.0,
  265: 13.0,
  270: 14.5,
  275: 14.5,
  280: 15.5,
  285: 15.5,
  290: 16.0,
  295: 16.0,
  300: 17.5,
  305: 17.5,
  310: 19.0,
  315: 19.0,
  320: 20.0,
  325: 20.0,
  330: 21.5,
  335: 21.5,
  340: 23.0,
  345: 23.0,
  350: 24.5,
  355: 24.5,
  360: 26.5,
  365: 26.5,
  370: 28.5,
  375: 28.5,
  380: 30.5,
  385: 30.5,
  390: 32.5,
  395: 32.5,
  400: 35.0,
};

// ============================================================================
// Engine Type Weight Multipliers
// ============================================================================

/**
 * Weight multiplier applied to the base fusion table weight.
 * ICE: 2.0 (doubles), XL: 0.5 (halves), CompactFusion: 1.5, FuelCell: 1.2.
 */
const ENGINE_WEIGHT_MULTIPLIER: Record<AerospaceEngineType, number> = {
  [AerospaceEngineType.FUSION]: 1.0,
  [AerospaceEngineType.XL]: 0.5,
  [AerospaceEngineType.COMPACT_FUSION]: 1.5,
  [AerospaceEngineType.ICE]: 2.0,
  [AerospaceEngineType.FUEL_CELL]: 1.2,
};

// ============================================================================
// Weight Calculation
// ============================================================================

/**
 * Look up the base fusion engine weight for a given rating.
 * For ratings not in the table, uses ceil(rating / 25) × 0.5 as an approximation.
 */
function baseFusionWeight(rating: number): number {
  if (rating in FUSION_ENGINE_WEIGHT) {
    return FUSION_ENGINE_WEIGHT[rating];
  }
  // Fallback approximation for unlisted ratings
  return Math.ceil(rating / 25) * 0.5;
}

/**
 * Compute engine tonnage for an aerospace unit.
 * Result is rounded up to the nearest 0.5 ton.
 *
 * @param rating - Engine rating (safeThrust × tonnage)
 * @param engineType - Aerospace engine type
 */
export function aerospaceEngineWeight(
  rating: number,
  engineType: AerospaceEngineType,
): number {
  const base = baseFusionWeight(rating);
  const multiplied = base * ENGINE_WEIGHT_MULTIPLIER[engineType];
  // Round up to nearest 0.5 ton
  return Math.ceil(multiplied * 2) / 2;
}
