/**
 * Engine Calculations
 *
 * Functions for calculating engine weight, slots, and related properties.
 *
 * @spec openspec/specs/engine-system/spec.md
 */

import {
  EngineType,
  getEngineDefinition,
} from '../../types/construction/EngineType';
import { roundToHalfTon, ceilToHalfTon } from '../physical/weightUtils';

/**
 * Standard engine weight table - engine weights by rating
 * Based on TechManual p.49
 */
const ENGINE_WEIGHT_TABLE: Record<number, number> = {
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
  215: 9.5,
  220: 10.0,
  225: 10.0,
  230: 10.5,
  235: 11.0,
  240: 11.5,
  245: 12.0,
  250: 12.5,
  255: 13.0,
  260: 13.5,
  265: 14.0,
  270: 14.5,
  275: 15.5,
  280: 16.0,
  285: 16.5,
  290: 17.5,
  295: 18.0,
  300: 19.0,
  305: 19.5,
  310: 20.5,
  315: 21.5,
  320: 22.5,
  325: 23.5,
  330: 24.5,
  335: 25.5,
  340: 27.0,
  345: 28.5,
  350: 29.5,
  355: 31.5,
  360: 33.0,
  365: 34.5,
  370: 36.5,
  375: 38.5,
  380: 41.0,
  385: 43.5,
  390: 46.0,
  395: 49.0,
  400: 52.5,
  405: 56.5,
  410: 61.0,
  415: 66.5,
  420: 72.5,
  425: 79.5,
  430: 87.5,
  435: 97.0,
  440: 107.5,
  445: 119.5,
  450: 133.5,
  455: 150.0,
  460: 168.5,
  465: 190.0,
  470: 214.5,
  475: 243.0,
  480: 275.5,
  485: 313.0,
  490: 356.0,
  495: 405.5,
  500: 462.5,
};

/**
 * Validate engine rating
 *
 * @param rating - Engine rating to validate
 * @returns Validation result
 */
export function validateEngineRating(rating: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Number.isInteger(rating)) {
    errors.push('Engine rating must be an integer');
  } else {
    if (rating < 10 || rating > 500) {
      errors.push('Engine rating must be between 10 and 500');
    }
    if (rating % 5 !== 0) {
      errors.push('Engine rating must be a multiple of 5');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Calculate base engine weight from rating (Standard Fusion)
 *
 * @param rating - Engine rating (10-500, multiple of 5)
 * @returns Base engine weight in tons
 */
export function getBaseEngineWeight(rating: number): number {
  const validation = validateEngineRating(rating);
  if (!validation.isValid) {
    return 0;
  }

  // Use table lookup for accuracy
  const tableWeight = ENGINE_WEIGHT_TABLE[rating];
  if (tableWeight !== undefined) {
    return tableWeight;
  }

  // Fallback formula for values not in table
  // Weight = (rating / 100)² × 5, rounded to 0.5 tons
  const calculatedWeight = Math.pow(rating / 100, 2) * 5;
  return roundToHalfTon(calculatedWeight);
}

/**
 * Calculate engine weight for a specific engine type
 *
 * @param rating - Engine rating
 * @param engineType - Type of engine
 * @returns Engine weight in tons
 */
export function calculateEngineWeight(
  rating: number,
  engineType: EngineType,
): number {
  const baseWeight = getBaseEngineWeight(rating);
  const definition = getEngineDefinition(engineType);

  if (!definition) {
    return baseWeight;
  }

  const adjustedWeight = baseWeight * definition.weightMultiplier;
  return ceilToHalfTon(adjustedWeight);
}

/**
 * Calculate engine rating from tonnage and walk MP
 *
 * Rating = tonnage × walkMP
 *
 * @param tonnage - Unit tonnage
 * @param walkMP - Desired walk MP
 * @returns Engine rating
 */
export function calculateEngineRating(tonnage: number, walkMP: number): number {
  const rating = tonnage * walkMP;
  // Round to nearest 5
  return Math.round(rating / 5) * 5;
}

/**
 * Calculate walk MP from engine rating and tonnage
 *
 * walkMP = floor(rating / tonnage)
 *
 * @param rating - Engine rating
 * @param tonnage - Unit tonnage
 * @returns Walk MP
 */
export function calculateWalkMP(rating: number, tonnage: number): number {
  if (tonnage <= 0 || rating <= 0) {
    return 0;
  }
  return Math.floor(rating / tonnage);
}

/**
 * Get center torso slots required for engine
 *
 * Based on rating brackets per TechManual.
 *
 * @param rating - Engine rating
 * @param engineType - Type of engine
 * @returns Number of CT slots
 */
export function getEngineCTSlots(
  rating: number,
  engineType: EngineType,
): number {
  const definition = getEngineDefinition(engineType);
  if (!definition) {
    return 6;
  }

  // Compact engines use 3 slots
  if (engineType === EngineType.COMPACT) {
    return 3;
  }

  // Standard slot count based on rating
  // Rating 1-100: 3 slots, 101-200: 4 slots, 201-300: 5 slots, 301+: 6 slots
  // However, the standard definition uses 6 as base
  return definition.ctSlots;
}

/**
 * Get side torso slots required for engine (per side)
 *
 * @param engineType - Type of engine
 * @returns Slots per side torso
 */
export function getEngineSideTorsoSlots(engineType: EngineType): number {
  const definition = getEngineDefinition(engineType);
  return definition?.sideTorsoSlots ?? 0;
}

/**
 * Get total slots required for engine (CT + both side torsos)
 *
 * @param rating - Engine rating
 * @param engineType - Type of engine
 * @returns Total slot count
 */
export function getTotalEngineSlots(
  rating: number,
  engineType: EngineType,
): number {
  const ctSlots = getEngineCTSlots(rating, engineType);
  const sideTorsoSlots = getEngineSideTorsoSlots(engineType);
  return ctSlots + sideTorsoSlots * 2;
}

/**
 * Calculate number of integral (free) heat sinks
 *
 * count = floor(rating / 25)
 *
 * Per BattleTech TechManual, there is no cap on integral heat sinks.
 * A 400-rating engine provides 16 integral heat sinks (400/25).
 *
 * @param rating - Engine rating
 * @param engineType - Type of engine
 * @returns Number of integral heat sinks
 */
export function calculateIntegralHeatSinks(
  rating: number,
  engineType: EngineType,
): number {
  const definition = getEngineDefinition(engineType);

  if (!definition?.supportsIntegralHeatSinks) {
    return 0;
  }

  return Math.floor(rating / 25);
}

/**
 * Check if an engine rating is valid for a tonnage
 *
 * @param rating - Engine rating
 * @param tonnage - Unit tonnage
 * @returns Validation result
 */
export function validateEngineForTonnage(
  rating: number,
  tonnage: number,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const ratingValidation = validateEngineRating(rating);
  if (!ratingValidation.isValid) {
    errors.push(...ratingValidation.errors);
  }

  const walkMP = calculateWalkMP(rating, tonnage);
  if (walkMP < 1) {
    errors.push('Engine rating too low for this tonnage (walk MP < 1)');
  }
  if (walkMP > 20) {
    errors.push('Engine rating too high for this tonnage (walk MP > 20)');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Check if engine type is fusion-powered
 */
export function isFusionEngine(engineType: EngineType): boolean {
  const definition = getEngineDefinition(engineType);
  return definition?.isFusion ?? false;
}

/**
 * Get all valid engine ratings
 */
export function getAllValidEngineRatings(): number[] {
  return Object.keys(ENGINE_WEIGHT_TABLE)
    .map(Number)
    .sort((a, b) => a - b);
}
