/**
 * Random SPA selection.
 *
 * Lets the pilot service pick a bonus SPA for randomized pilots without
 * hardcoding a list. Eligible pool defaults to purchasable non-flaw,
 * non-origin-only abilities — i.e. things you'd expect a line pilot to
 * roll up organically. Callers can widen or narrow the pool via options.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { getAllSPAs } from './index';

/** Injectable random source. Must return a value in [0, 1). */
export type RandomFn = () => number;

export interface IPickRandomSPAOptions {
  /** Include flaws in the eligible pool. Default false. */
  readonly includeFlaws?: boolean;
  /** Include origin-only abilities. Default false (creation-only path). */
  readonly includeOriginOnly?: boolean;
  /** Only pick from this category. Default: any. */
  readonly category?: ISPADefinition['category'];
  /** Exclude these ids from the pool (e.g. already-owned abilities). */
  readonly excludeIds?: readonly string[];
  /** Exact catalog to pick from (for testing). Defaults to the full catalog. */
  readonly catalog?: readonly ISPADefinition[];
}

/**
 * Build the eligibility pool for random selection given the options.
 * Exposed for testing so callers can assert pool-shape without mocking
 * the random source.
 */
export function getEligibleSPAs(
  options: IPickRandomSPAOptions = {},
): readonly ISPADefinition[] {
  const catalog = options.catalog ?? getAllSPAs();
  const excluded = new Set(options.excludeIds ?? []);

  return catalog.filter((spa) => {
    if (excluded.has(spa.id)) return false;
    if (!options.includeFlaws && spa.isFlaw) return false;
    if (!options.includeOriginOnly && spa.isOriginOnly) return false;
    if (spa.xpCost === null && !options.includeOriginOnly) return false;
    if (options.category && spa.category !== options.category) return false;
    return true;
  });
}

/**
 * Pick a random SPA from the eligible pool. Returns null when the pool
 * is empty (e.g. every eligible id was excluded).
 */
export function pickRandomSPA(
  random: RandomFn,
  options: IPickRandomSPAOptions = {},
): ISPADefinition | null {
  const pool = getEligibleSPAs(options);
  if (pool.length === 0) return null;
  const index = Math.floor(random() * pool.length);
  return pool[Math.min(index, pool.length - 1)] ?? null;
}
