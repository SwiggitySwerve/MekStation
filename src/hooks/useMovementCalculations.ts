/**
 * Movement Calculations Hook
 *
 * Encapsulates movement-related calculations for BattleMech units:
 * - Walk/Run/Jump MP derivation
 * - Engine rating constraints
 * - Movement enhancement effects
 *
 * @spec openspec/specs/construction-rules-core/spec.md
 */

import { useMemo } from 'react';

import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  JumpJetType,
  getMaxJumpMP,
  calculateEnhancedMaxRunMP,
} from '@/utils/construction/movementCalculations';

// =============================================================================
// Constants
// =============================================================================

/** Maximum engine rating per BattleTech TechManual */
export const MAX_ENGINE_RATING = 400;

/** Minimum engine rating */
export const MIN_ENGINE_RATING = 10;

// =============================================================================
// Types
// =============================================================================

export interface MovementCalculationsInput {
  /** Unit tonnage */
  tonnage: number;
  /** Current engine rating */
  engineRating: number;
  /** Current jump MP */
  jumpMP: number;
  /** Jump jet type */
  jumpJetType: JumpJetType;
  /** Movement enhancement (MASC, TSM, etc.) */
  enhancement: MovementEnhancementType | null;
}

export interface MovementCalculationsResult {
  /** Current Walk MP (derived from engine rating / tonnage) */
  walkMP: number;
  /** Current Run MP (ceil of walk × 1.5) */
  runMP: number;
  /** Valid Walk MP range for this tonnage */
  walkMPRange: { min: number; max: number };
  /** Maximum Jump MP based on walk MP and jump jet type */
  maxJumpMP: number;
  /** Enhanced max Run MP when enhancement is active (undefined if no enhancement) */
  maxRunMP: number | undefined;
  /** Whether engine is at maximum rating (400) */
  isAtMaxEngineRating: boolean;
  /** Calculate new engine rating for a given Walk MP */
  getEngineRatingForWalkMP: (walkMP: number) => number;
  /** Clamp Walk MP to valid range */
  clampWalkMP: (walkMP: number) => number;
  /** Clamp Jump MP to valid range */
  clampJumpMP: (jumpMP: number) => number;
}

// =============================================================================
// Pure Calculation Functions
// =============================================================================

/**
 * Get valid Walk MP range for a given tonnage.
 * Engine rating = tonnage × walkMP, must be 10-400.
 */
export function getWalkMPRange(tonnage: number): { min: number; max: number } {
  const minWalk = Math.max(1, Math.ceil(MIN_ENGINE_RATING / tonnage));
  const maxWalk = Math.min(12, Math.floor(MAX_ENGINE_RATING / tonnage));

  return { min: minWalk, max: maxWalk };
}

/**
 * Calculate Run MP from Walk MP (ceil of 1.5× walk).
 */
export function calculateRunMP(walkMP: number): number {
  return Math.ceil(walkMP * 1.5);
}

/**
 * Calculate Walk MP from engine rating and tonnage.
 */
export function calculateWalkMP(engineRating: number, tonnage: number): number {
  return Math.floor(engineRating / tonnage);
}

/**
 * Calculate engine rating from Walk MP and tonnage.
 */
export function calculateEngineRating(walkMP: number, tonnage: number): number {
  return tonnage * walkMP;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for movement-related calculations.
 *
 * Provides derived movement stats and helper functions for the Structure tab.
 *
 * @example
 * ```tsx
 * const {
 *   walkMP,
 *   runMP,
 *   walkMPRange,
 *   maxJumpMP,
 *   clampWalkMP,
 * } = useMovementCalculations({
 *   tonnage: 50,
 *   engineRating: 200,
 *   jumpMP: 4,
 *   jumpJetType: JumpJetType.STANDARD,
 *   enhancement: null,
 * });
 * ```
 */
export function useMovementCalculations(
  input: MovementCalculationsInput,
): MovementCalculationsResult {
  const { tonnage, engineRating, jumpJetType, enhancement } = input;

  // Derive Walk MP from engine rating
  const walkMP = useMemo(
    () => calculateWalkMP(engineRating, tonnage),
    [engineRating, tonnage],
  );

  // Calculate Run MP
  const runMP = useMemo(() => calculateRunMP(walkMP), [walkMP]);

  // Get valid Walk MP range
  const walkMPRange = useMemo(() => getWalkMPRange(tonnage), [tonnage]);

  // Check if at max engine rating
  const isAtMaxEngineRating = engineRating >= MAX_ENGINE_RATING;

  // Calculate enhanced max Run MP (when enhancement is active)
  const maxRunMP = useMemo(() => {
    if (!enhancement) return undefined;
    return calculateEnhancedMaxRunMP(walkMP, enhancement);
  }, [enhancement, walkMP]);

  // Calculate max Jump MP based on walk MP and jump jet type
  const maxJumpMP = useMemo(
    () => getMaxJumpMP(walkMP, jumpJetType),
    [walkMP, jumpJetType],
  );

  // Helper: get engine rating for a given Walk MP
  const getEngineRatingForWalkMP = useMemo(
    () => (newWalkMP: number) => calculateEngineRating(newWalkMP, tonnage),
    [tonnage],
  );

  // Helper: clamp Walk MP to valid range
  const clampWalkMP = useMemo(
    () => (newWalkMP: number) =>
      Math.max(walkMPRange.min, Math.min(walkMPRange.max, newWalkMP)),
    [walkMPRange],
  );

  // Helper: clamp Jump MP to valid range
  const clampJumpMP = useMemo(
    () => (newJumpMP: number) => Math.max(0, Math.min(maxJumpMP, newJumpMP)),
    [maxJumpMP],
  );

  return {
    walkMP,
    runMP,
    walkMPRange,
    maxJumpMP,
    maxRunMP,
    isAtMaxEngineRating,
    getEngineRatingForWalkMP,
    clampWalkMP,
    clampJumpMP,
  };
}

// =============================================================================
// Enhancement Options (static data)
// =============================================================================

export interface EnhancementOption {
  value: MovementEnhancementType | null;
  label: string;
  description?: string;
}

/**
 * Get available enhancement options for the enhancement selector.
 */
export function getEnhancementOptions(): EnhancementOption[] {
  return [
    { value: null, label: 'None' },
    {
      value: MovementEnhancementType.MASC,
      label: 'MASC',
      description:
        'Sprint = Walk × 2 when activated. Risk of leg damage on failed roll.',
    },
    {
      value: MovementEnhancementType.TSM,
      label: 'Triple Strength Myomer',
      description:
        'Activates at 9+ heat: +2 Walk MP, but -1 from heat penalty = net +1 MP. Doubles physical attack damage.',
    },
  ];
}
