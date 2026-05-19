/**
 * Contract Random Helpers - Seeded randomness primitives
 *
 * Provides the low-level random utilities (array picking, integer ranges) and
 * the injectable RandomFn type used throughout contract generation. Extracted
 * from contractMarket.ts so both the main module and its sibling selection
 * module can share one seeded-randomness implementation for testability.
 *
 * @module lib/campaign/contracts/contractRandomHelpers
 */

/**
 * Random number generator function type.
 * Returns a number in [0, 1) like Math.random().
 */
export type RandomFn = () => number;

/**
 * Default random function using Math.random().
 *
 * Used as the fallback when a caller does not inject a seeded RandomFn.
 */
export const defaultRandom: RandomFn = () => Math.random();

/**
 * Pick a random element from an array.
 *
 * Centralised here so every random selection in the contract market uses the
 * same index math and the same injectable RandomFn.
 *
 * @param array - Array to pick from
 * @param random - Random function (default: Math.random)
 * @returns Random element from the array
 */
export function pickRandom<T>(
  array: readonly T[],
  random: RandomFn = defaultRandom,
): T {
  const index = Math.floor(random() * array.length);
  return array[index];
}

/**
 * Generate a random integer in [min, max] inclusive.
 *
 * Centralised here so duration and salvage ranges use one inclusive-range
 * implementation and remain deterministic under a seeded RandomFn.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param random - Random function (default: Math.random)
 * @returns Random integer in range
 */
export function randomInt(
  min: number,
  max: number,
  random: RandomFn = defaultRandom,
): number {
  return Math.floor(random() * (max - min + 1)) + min;
}
