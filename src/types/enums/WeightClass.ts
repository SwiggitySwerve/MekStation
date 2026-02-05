/**
 * WeightClass - Mech weight classification enumeration
 * Defines the weight class categories for mechs.
 *
 * @spec core-enumerations/spec.md
 */

/**
 * Weight class categories for mechs.
 * Based on tonnage ranges.
 */
export enum WeightClass {
  /** Ultra-Light: 10-15 tons (ProtoMechs, not standard mechs) */
  ULTRALIGHT = 'Ultralight',

  /** Light: 20-35 tons */
  LIGHT = 'Light',

  /** Medium: 40-55 tons */
  MEDIUM = 'Medium',

  /** Heavy: 60-75 tons */
  HEAVY = 'Heavy',

  /** Assault: 80-100 tons */
  ASSAULT = 'Assault',

  /** Super Heavy: 105+ tons (rare, requires special rules) */
  SUPERHEAVY = 'Super Heavy',
}

/**
 * Weight class range definition
 */
export interface WeightClassRange {
  readonly weightClass: WeightClass;
  readonly minTonnage: number;
  readonly maxTonnage: number;
}

/**
 * Standard mech weight class ranges
 */
export const WEIGHT_CLASS_RANGES: readonly WeightClassRange[] = Object.freeze([
  { weightClass: WeightClass.ULTRALIGHT, minTonnage: 10, maxTonnage: 15 },
  { weightClass: WeightClass.LIGHT, minTonnage: 20, maxTonnage: 35 },
  { weightClass: WeightClass.MEDIUM, minTonnage: 40, maxTonnage: 55 },
  { weightClass: WeightClass.HEAVY, minTonnage: 60, maxTonnage: 75 },
  { weightClass: WeightClass.ASSAULT, minTonnage: 80, maxTonnage: 100 },
  { weightClass: WeightClass.SUPERHEAVY, minTonnage: 105, maxTonnage: 200 },
]);

/**
 * Standard mech weight classes (excluding ultra-light and super-heavy)
 */
export const STANDARD_WEIGHT_CLASSES: readonly WeightClass[] = Object.freeze([
  WeightClass.LIGHT,
  WeightClass.MEDIUM,
  WeightClass.HEAVY,
  WeightClass.ASSAULT,
]);

/**
 * Get the weight class for a given tonnage
 */
export function getWeightClass(tonnage: number): WeightClass {
  for (const range of WEIGHT_CLASS_RANGES) {
    if (tonnage >= range.minTonnage && tonnage <= range.maxTonnage) {
      return range.weightClass;
    }
  }

  // Edge cases
  if (tonnage < 10) {
    return WeightClass.ULTRALIGHT;
  }
  return WeightClass.SUPERHEAVY;
}

/**
 * Get the tonnage range for a weight class
 */
export function getWeightClassRange(
  weightClass: WeightClass,
): WeightClassRange | undefined {
  return WEIGHT_CLASS_RANGES.find((range) => range.weightClass === weightClass);
}

/**
 * Check if a tonnage is valid for standard mechs (20-100 tons in 5-ton increments)
 */
export function isValidMechTonnage(tonnage: number): boolean {
  return tonnage >= 20 && tonnage <= 100 && tonnage % 5 === 0;
}

/**
 * Get all valid mech tonnages (20-100 in 5-ton increments)
 */
export function getValidMechTonnages(): number[] {
  const tonnages: number[] = [];
  for (let t = 20; t <= 100; t += 5) {
    tonnages.push(t);
  }
  return tonnages;
}
